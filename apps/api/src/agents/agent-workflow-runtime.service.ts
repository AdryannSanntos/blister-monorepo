import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentBlockExecutorRegistry } from './agent-block-executor.registry';
import { uiOutputEnvelopeSchema } from './dto/ui-output.dto';

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
  uiOutput?: unknown;
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
    agentId?: string;
    organizationId?: string;
    inputPayload?: unknown;
    flowDefinition: FlowDefinition;
  }): Promise<RuntimeResult> {
    const { runId, agentId, organizationId = '', inputPayload, flowDefinition } = params;
    const { nodes, edges } = flowDefinition;

    // Load run-level context (owner, lineage) so block executors don't depend on
    // fragile reads from inputs/runState.
    const runRecord = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      select: {
        createdByUserId: true,
        parentRunId: true,
        rootRunId: true,
        depth: true,
      },
    });
    const runUserId = runRecord?.createdByUserId ?? undefined;
    const runDepth = runRecord?.depth ?? 0;
    const parentRunId = runRecord?.parentRunId ?? null;
    const rootRunId = runRecord?.rootRunId ?? null;

    const nodeMap = new Map<string, FlowNode>(nodes.map((n) => [n.id, n]));
    const visitedBlockIds: string[] = [];
    const portOutputs = new Map<string, unknown>();
    const visited = new Set<string>();
    let stepSequence = 0;
    let lastUiOutput: unknown;

    // Rehydrate state from previously persisted successful steps (resume support)
    const priorSteps = await this.loadPriorSteps(runId);
    for (const step of priorSteps) {
      const outputs = (step.outputPayload as Record<string, unknown> | null) ?? {};
      for (const [portKey, value] of Object.entries(outputs)) {
        portOutputs.set(`${step.blockKey}:${portKey}`, value);
      }
      if (!outputs.default) {
        portOutputs.set(`${step.blockKey}:default`, outputs);
      }
      visited.add(step.blockKey);
      visitedBlockIds.push(step.blockKey);
      if (typeof step.sequence === 'number' && step.sequence > stepSequence) {
        stepSequence = step.sequence;
      }
      if (step.uiOutputPayload) {
        lastUiOutput = step.uiOutputPayload;
      }
    }

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
      return incoming.every((e) => portOutputs.has(`${e.sourceNodeId}:${e.sourcePortKey}`));
    };

    const queue: string[] = [];

    if (visited.size > 0) {
      // Resuming: enqueue downstream nodes of every visited node
      for (const visitedId of visited) {
        const outgoing = edges.filter((e) => e.sourceNodeId === visitedId);
        for (const edge of outgoing) {
          if (!visited.has(edge.targetNodeId)) {
            queue.push(edge.targetNodeId);
          }
        }
      }
    } else {
      for (const node of nodes) {
        const hasIncoming = edges.some((e) => e.targetNodeId === node.id);
        if (!hasIncoming || node.type === 'input') {
          queue.push(node.id);
        }
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
      stepSequence += 1;
      const currentSequence = stepSequence;

      const inputs = node.type === 'input' ? { payload: inputPayload } : getNodeInputs(nodeId);
      const config = node.config ?? {};
      const branchKey = typeof config.branchKey === 'string' ? config.branchKey : null;

      const stepRecord = await this.prisma.agentRunStep.create({
        data: {
          runId,
          blockKey: nodeId,
          blockType: node.type,
          status: 'running',
          sequence: currentSequence,
          branchKey: branchKey ?? undefined,
          inputType: node.type,
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
            agentId,
            organizationId,
            userId: runUserId,
            parentRunId,
            rootRunId,
            depth: runDepth,
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
        result = { outputs: { default: inputs } };
      }

      // Detect / validate UI output envelope
      const uiOutputCandidate = result.outputs.ui_output ?? result.outputs.final;
      const uiOutputPayload = this.extractUiOutputEnvelope(uiOutputCandidate);
      if (uiOutputPayload) {
        lastUiOutput = uiOutputPayload;
      }

      if (result.suspend) {
        await this.prisma.agentRunStep.update({
          where: { id: stepRecord.id },
          data: {
            status: 'suspended',
            outputPayload: toJsonValue({}),
            statePayload: toJsonValue(Object.fromEntries(portOutputs)),
            completedAt: new Date(),
          },
        });

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

      await this.prisma.agentRunStep.update({
        where: { id: stepRecord.id },
        data: {
          status: 'success',
          outputPayload: toJsonValue(result.outputs),
          statePayload: toJsonValue(Object.fromEntries(portOutputs)),
          uiOutputPayload: uiOutputPayload ? toJsonValue(uiOutputPayload) : undefined,
          outputType: node.type,
          completedAt: new Date(),
        },
      });

      for (const [portKey, value] of Object.entries(result.outputs)) {
        portOutputs.set(`${nodeId}:${portKey}`, value);
      }

      if (!result.outputs.default) {
        portOutputs.set(`${nodeId}:default`, result.outputs);
      }

      if (result.terminate) {
        return {
          visitedBlockIds,
          finalOutput: result.outputs,
          uiOutput: uiOutputPayload ?? lastUiOutput,
        };
      }

      const outgoing = edges.filter((e) => e.sourceNodeId === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.targetNodeId)) {
          queue.push(edge.targetNodeId);
        }
      }
    }

    return { visitedBlockIds, uiOutput: lastUiOutput };
  }

  private async loadPriorSteps(runId: string) {
    return this.prisma.agentRunStep.findMany({
      where: { runId, status: 'success' },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
      select: {
        blockKey: true,
        outputPayload: true,
        sequence: true,
        uiOutputPayload: true,
      },
    });
  }

  private extractUiOutputEnvelope(candidate: unknown): Record<string, unknown> | null {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return null;
    }

    const obj = candidate as Record<string, unknown>;
    // Tolerate envelope wrapped inside { type: 'ui_output', blocks: [...] }
    const blocks = Array.isArray(obj.blocks) ? obj.blocks : null;
    if (!blocks) return null;

    const parsed = uiOutputEnvelopeSchema.safeParse({
      blocks,
      metadata: typeof obj.metadata === 'object' && obj.metadata ? obj.metadata : undefined,
    });
    if (parsed.success) {
      return parsed.data as Record<string, unknown>;
    }
    // Even if strict validation fails, persist raw blocks payload so frontend can recover.
    return { blocks, metadata: obj.metadata ?? {} };
  }

  async awaitRunCompletion(runId: string): Promise<{ finalOutput?: unknown }> {
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
