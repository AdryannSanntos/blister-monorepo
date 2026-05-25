import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentBlockExecutorRegistry } from './agent-block-executor.registry';

const toJsonValue = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

interface FlowEdge {
  id: string;
  sourceNodeId: string;
  sourcePortKey: string;
  targetNodeId: string;
  targetPortKey: string;
}

interface FlowNode {
  id: string;
  type: string;
  config?: Record<string, unknown>;
  mergeStrategy?: string;
}

interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  config?: Record<string, unknown>;
}

interface RuntimeResult {
  visitedBlockIds: string[];
  finalOutput?: unknown;
  suspended?: boolean;
  suspensionId?: string;
}

@Injectable()
export class AgentWorkflowRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AgentBlockExecutorRegistry,
  ) {}

  async run(params: {
    runId: string;
    organizationId?: string;
    inputPayload?: unknown;
    flowDefinition: FlowDefinition;
  }): Promise<RuntimeResult> {
    const { runId, organizationId = '', inputPayload, flowDefinition } = params;
    const { nodes, edges } = flowDefinition;

    const nodeMap = new Map<string, FlowNode>(nodes.map((n) => [n.id, n]));
    const visitedBlockIds: string[] = [];
    const portOutputs = new Map<string, unknown>(); // key: `nodeId:portKey`

    const getNodeInputs = (nodeId: string): Record<string, unknown> => {
      const incoming = edges.filter((e) => e.targetNodeId === nodeId);
      const inputs: Record<string, unknown> = {};
      for (const edge of incoming) {
        const sourceKey = `${edge.sourceNodeId}:${edge.sourcePortKey}`;
        inputs[edge.targetPortKey] = portOutputs.get(sourceKey);
      }
      return inputs;
    };

    const isNodeReady = (nodeId: string, node: FlowNode): boolean => {
      const incoming = edges.filter((e) => e.targetNodeId === nodeId);
      if (incoming.length === 0) return true;

      const strategy = node.mergeStrategy ?? 'all_required';
      if (strategy === 'any_first') {
        return incoming.some((e) => portOutputs.has(`${e.sourceNodeId}:${e.sourcePortKey}`));
      }
      // default: all_required
      return incoming.every((e) => portOutputs.has(`${e.sourceNodeId}:${e.sourcePortKey}`));
    };

    // Topological BFS over the graph
    const visited = new Set<string>();
    const queue: string[] = [];

    // Find start nodes (input type or no incoming edges)
    for (const node of nodes) {
      const hasIncoming = edges.some((e) => e.targetNodeId === node.id);
      if (!hasIncoming || node.type === 'input') {
        queue.push(node.id);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      if (!isNodeReady(nodeId, node) && node.type !== 'input') continue;

      visited.add(nodeId);
      visitedBlockIds.push(nodeId);

      const inputs = node.type === 'input' ? { payload: inputPayload } : getNodeInputs(nodeId);
      const config = node.config ?? {};

      const stepRecord = await this.prisma.agentRunStep.create({
        data: {
          runId,
          blockKey: nodeId,
          blockType: node.type,
          status: 'running',
          inputPayload: toJsonValue(inputs),
          outputPayload: toJsonValue({}),
          startedAt: new Date(),
        },
      });

      const executor = this.registry.get(node.type);

      let result: {
        outputs: Record<string, unknown>;
        suspend?: { type: string; payload: Record<string, unknown> };
        terminate?: boolean;
      };

      if (executor) {
        try {
          result = await executor({
            runId,
            organizationId,
            stepId: stepRecord.id,
            blockId: nodeId,
            blockType: node.type,
            blockConfig: config,
            inputs,
            runState: Object.fromEntries(portOutputs),
          });
        } catch (err) {
          await this.prisma.agentRunStep.update({
            where: { id: stepRecord.id },
            data: {
              status: 'error',
              errorMessage: err instanceof Error ? err.message : 'Block execution failed',
              completedAt: new Date(),
            },
          });
          throw err;
        }
      } else {
        // Passthrough for unregistered blocks
        result = { outputs: { default: inputs } };
      }

      await this.prisma.agentRunStep.update({
        where: { id: stepRecord.id },
        data: {
          status: 'success',
          outputPayload: toJsonValue(result.outputs),
          completedAt: new Date(),
        },
      });

      // Store outputs by port key
      for (const [portKey, value] of Object.entries(result.outputs)) {
        portOutputs.set(`${nodeId}:${portKey}`, value);
      }

      // Default 'default' port if no explicit output
      if (!result.outputs.default) {
        portOutputs.set(`${nodeId}:default`, result.outputs);
      }

      if (result.suspend) {
        const suspension = await this.prisma.agentRunSuspension.create({
          data: {
            runId,
            stepId: stepRecord.id,
            type: result.suspend.type,
            status: 'pending',
            resolvedPayload: toJsonValue(result.suspend.payload),
          },
        });

        await this.prisma.agentRun.update({
          where: { id: runId },
          data: {
            currentBlockId: nodeId,
            currentBlockType: node.type,
            waitingReason: result.suspend.type,
            resumeStatus: 'suspended',
          },
        });

        return { visitedBlockIds, suspended: true, suspensionId: suspension.id };
      }

      if (result.terminate) {
        return { visitedBlockIds, finalOutput: result.outputs };
      }

      // Enqueue downstream nodes
      const outgoing = edges.filter((e) => e.sourceNodeId === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.targetNodeId)) {
          queue.push(edge.targetNodeId);
        }
      }
    }

    return { visitedBlockIds };
  }

  async awaitRunCompletion(runId: string): Promise<{ finalOutput?: unknown }> {
    // Phase 1: poll until run is no longer running/queued (synchronous sub-agent calls)
    const maxWaitMs = 30_000;
    const pollIntervalMs = 500;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const run = await this.prisma.agentRun.findUnique({
        where: { id: runId },
        select: { status: true, outputPayload: true },
      });

      if (!run) {
        return { finalOutput: undefined };
      }

      if (run.status === 'success' || run.status === 'completed') {
        return { finalOutput: run.outputPayload };
      }

      if (run.status === 'error' || run.status === 'cancelled') {
        throw new Error(`Sub-agent run ${runId} failed with status: ${run.status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Sub-agent run ${runId} timed out after ${maxWaitMs}ms`);
  }
}
