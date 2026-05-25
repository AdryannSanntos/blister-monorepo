import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { tasks } from '@trigger.dev/sdk';
import type { AgentRunTaskPayload } from '../../trigger/shared/agent-runtime-payloads';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';
import { CreditsService } from '../credits/credits.service';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentQueueService } from './agent-queue.service';
import { AgentWorkflowRuntimeService } from './agent-workflow-runtime.service';
import { HtmlPreviewService } from './html-preview.service';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

type FlowResult =
  | { suspended: true; suspensionId: string | undefined; result: unknown; uiOutput: unknown; usage: never[]; awaitingUserValidation: false }
  | { suspended?: false; awaitingUserValidation: true; result: unknown; uiOutput: unknown; usage: Array<Record<string, unknown>> }
  | { suspended?: false; awaitingUserValidation: false; result: unknown; uiOutput: unknown; usage: Array<Record<string, unknown>> };

type FlowNodeLike = {
  id: string;
  type: string;
  config?: Record<string, unknown>;
  mergeStrategy?: string;
};
type FlowEdgeLike = {
  id: string;
  sourceNodeId: string;
  sourcePortKey: string;
  targetNodeId: string;
  targetPortKey: string;
};

@Injectable()
export class AgentExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRuntimeService: AIRuntimeService,
    private readonly creditsService: CreditsService,
    private readonly htmlPreviewService: HtmlPreviewService,
    private readonly agentQueueService: AgentQueueService,
    private readonly workflowRuntime: AgentWorkflowRuntimeService,
  ) {}

  async enqueueRun(payload: AgentRunTaskPayload): Promise<unknown> {
    return tasks.trigger('agent-run', payload);
  }

  async processRun(payload: AgentRunTaskPayload) {
    const processingLeaseId = randomUUID();
    let run = await this.prisma.agentRun.findFirst({
      where: {
        id: payload.agentRunId,
        organizationId: payload.organizationId,
        agentId: payload.agentId,
        agentVersionId: payload.agentVersionId,
      },
      include: {
        agentVersion: true,
      },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    if (run.status !== 'queued' && run.status !== 'running') {
      return { runId: run.id, status: 'ignored' as const };
    }

    if (run.status === 'queued') {
      const promotedRun = await this.agentQueueService.promoteRun(run.id, run.organizationId);

      if (!promotedRun) {
        return { runId: run.id, status: 'deferred' as const };
      }

      run = {
        ...run,
        ...promotedRun,
      };
    }

    const leaseClaimed = await this.agentQueueService.claimProcessingLease(
      run.id,
      processingLeaseId,
    );

    if (!leaseClaimed) {
      return { runId: run.id, status: 'already-processing' as const };
    }

    for (;;) {
      const currentAttemptNumber: number = run.attemptCount;
      const attemptStep = await this.agentQueueService.createAttemptStep(
        run.id,
        currentAttemptNumber,
      );

      try {
        const output = await this.executeFlow(
          run.id,
          run.organizationId,
          run.inputPayload,
          run.agentVersion.flowDefinition,
        );

        if (output.suspended) {
          await this.agentQueueService.completeAttemptStep(attemptStep.id, 'success');
          await this.prisma.agentRun.update({
            where: { id: run.id },
            data: {
              status: 'suspended',
              processingMetadata: toJsonValue({ latestAttemptNumber: currentAttemptNumber }),
            },
          });
          await this.agentQueueService.releaseProcessingLease(run.id);

          return {
            runId: run.id,
            status: 'suspended' as const,
            suspensionId: output.suspensionId,
          };
        }

        if (output.awaitingUserValidation) {
          await this.persistAssistantMessage(
            run.threadId,
            run.id,
            this.buildAssistantContent(output.result, 'awaiting_user_validation'),
          );
          await this.agentQueueService.completeAttemptStep(attemptStep.id, 'success');
          await this.prisma.agentRun.update({
            where: { id: run.id },
            data: {
              processingMetadata: toJsonValue({ latestAttemptNumber: currentAttemptNumber }),
            },
          });
          await this.agentQueueService.markRunCompleted(run.id, 'awaiting_user_validation');

          const nextRun = await this.agentQueueService.promoteNextQueuedRun(run.organizationId);

          if (nextRun) {
            try {
              await this.enqueueRun({
                organizationId: nextRun.organizationId,
                agentRunId: nextRun.id,
                agentId: nextRun.agentId,
                agentVersionId: nextRun.agentVersionId,
              });
            } catch {
              await this.prisma.agentRun.update({
                where: { id: nextRun.id },
                data: {
                  status: 'queued',
                  processingLeaseId: null,
                  leaseExpiresAt: null,
                },
              });
            }
          }

          await this.agentQueueService.releaseProcessingLease(run.id);

          return { runId: run.id, status: 'awaiting_user_validation' as const, output };
        }

        for (const usageEntry of output.usage) {
          const entry = usageEntry as Record<string, unknown>;
          const usage = (entry.usage as Record<string, unknown> | undefined) ?? {};
          const totalTokens = typeof usage.totalTokens === 'number' ? usage.totalTokens : 0;
          const technicalAmount = Number((totalTokens / 1000).toFixed(4));
          const attemptKey = `${run.id}:attempt:${currentAttemptNumber}`;

          if (technicalAmount > 0) {
            await this.creditsService.recordTechnicalCost({
              organizationId: run.organizationId,
              runId: run.id,
              idempotencyKey: `${attemptKey}:tech:${entry.providerId ?? 'provider'}:${entry.modelId ?? 'model'}`,
              providerId: typeof entry.providerId === 'string' ? entry.providerId : undefined,
              modelId: typeof entry.modelId === 'string' ? entry.modelId : undefined,
              amount: technicalAmount,
              metadata: { totalTokens },
            });
          }
        }

        await this.creditsService.debitRunCredits(run.id, Math.max(1, output.usage.length), {
          idempotencyKey: `${run.id}:attempt:${currentAttemptNumber}:credit`,
          strict: false,
        });

        await this.prisma.agentRun.update({
          where: { id: run.id },
          data: {
            outputPayload: toJsonValue(output),
            processingMetadata: toJsonValue({ latestAttemptNumber: currentAttemptNumber }),
          },
        });

        await this.persistAssistantMessage(
          run.threadId,
          run.id,
          this.buildAssistantContent(output.result, 'success', undefined, output.uiOutput),
          output.uiOutput,
        );

        await this.agentQueueService.completeAttemptStep(attemptStep.id, 'success');
        await this.agentQueueService.markRunCompleted(run.id, 'success');

        const nextRun = await this.agentQueueService.promoteNextQueuedRun(run.organizationId);

        if (nextRun) {
          try {
            await this.enqueueRun({
              organizationId: nextRun.organizationId,
              agentRunId: nextRun.id,
              agentId: nextRun.agentId,
              agentVersionId: nextRun.agentVersionId,
            });
          } catch {
            await this.prisma.agentRun.update({
              where: { id: nextRun.id },
              data: {
                status: 'queued',
                processingLeaseId: null,
                leaseExpiresAt: null,
              },
            });
          }
        }

        await this.agentQueueService.releaseProcessingLease(run.id);

        return { runId: run.id, status: 'success' as const, output };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Agent execution failed';

        await this.agentQueueService.completeAttemptStep(attemptStep.id, 'error', message);

        if (currentAttemptNumber < 2) {
          run = await this.prisma.agentRun.update({
            where: { id: run.id },
            data: {
              attemptCount: { increment: 1 },
              lastAttemptAt: new Date(),
              processingMetadata: toJsonValue({
                latestAttemptNumber: currentAttemptNumber,
                retryScheduled: true,
              }),
            },
            include: { agentVersion: true },
          });

          continue;
        }

        await this.storeRunError(run.id, message);
        await this.persistAssistantMessage(
          run.threadId,
          run.id,
          this.buildAssistantContent(undefined, 'error', message),
        );
        await this.agentQueueService.markRunCompleted(run.id, 'error');

        const nextRun = await this.agentQueueService.promoteNextQueuedRun(run.organizationId);

        if (nextRun) {
          try {
            await this.enqueueRun({
              organizationId: nextRun.organizationId,
              agentRunId: nextRun.id,
              agentId: nextRun.agentId,
              agentVersionId: nextRun.agentVersionId,
            });
          } catch {
            await this.prisma.agentRun.update({
              where: { id: nextRun.id },
              data: {
                status: 'queued',
                processingLeaseId: null,
                leaseExpiresAt: null,
              },
            });
          }
        }

        await this.agentQueueService.releaseProcessingLease(run.id);

        throw error;
      }
    }
  }

  async storeRunError(runId: string, message: string) {
    await this.prisma.agentRun.update({
      where: { id: runId },
      data: { status: 'error', errorMessage: message },
    });
  }

  private async persistAssistantMessage(
    threadId: string | null | undefined,
    agentRunId: string,
    content: string,
    uiOutput?: unknown,
  ) {
    if (!threadId) {
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (uiOutput && typeof uiOutput === 'object') {
      metadata.uiOutput = uiOutput;
    }

    await this.prisma.agentChatMessage.create({
      data: {
        threadId,
        agentRunId,
        role: 'assistant',
        content,
        metadata: toJsonValue(metadata),
      },
    });
  }

  private buildAssistantContent(
    result: unknown,
    status: 'success' | 'awaiting_user_validation' | 'error',
    errorMessage?: string,
    uiOutput?: unknown,
  ) {
    const envelopeText = this.extractEnvelopeText(uiOutput);
    if (envelopeText) {
      return envelopeText;
    }

    const text = this.extractTextResult(result);
    if (text) {
      return text;
    }

    const imageCount = this.extractImageCount(result);
    if (imageCount > 0) {
      return imageCount === 1
        ? 'Imagem gerada com sucesso.'
        : `${imageCount} imagens geradas com sucesso.`;
    }

    if (status === 'awaiting_user_validation') {
      return 'Revise a saida gerada para continuar a execucao.';
    }

    if (status === 'error') {
      return errorMessage
        ? `Nao foi possivel concluir a execucao: ${errorMessage}`
        : 'Nao foi possivel concluir a execucao.';
    }

    return 'Execucao concluida com sucesso.';
  }

  private extractEnvelopeText(uiOutput: unknown): string | null {
    if (!uiOutput || typeof uiOutput !== 'object') return null;
    const blocks = (uiOutput as Record<string, unknown>).blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) return null;

    const parts: string[] = [];
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'text' || b.type === 'markdown') {
        if (typeof b.value === 'string' && b.value.trim()) parts.push(b.value);
      } else if (b.type === 'list' && Array.isArray(b.items)) {
        parts.push(b.items.map((i) => `- ${i}`).join('\n'));
      } else if (b.type === 'card' && typeof b.title === 'string') {
        parts.push(typeof b.body === 'string' ? `**${b.title}**\n${b.body}` : `**${b.title}**`);
      }
    }

    const joined = parts.filter(Boolean).join('\n\n').trim();
    return joined.length > 0 ? joined : null;
  }

  private extractTextResult(result: unknown) {
    if (typeof result === 'string' && result.trim().length > 0) {
      return result;
    }

    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return null;
    }

    const candidate = (result as Record<string, unknown>).text;
    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
  }

  private extractImageCount(result: unknown) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return 0;
    }

    const images = (result as Record<string, unknown>).images;
    return Array.isArray(images) ? images.length : 0;
  }

  private async executeFlow(
    runId: string,
    organizationId: string,
    inputPayload: unknown,
    flowDefinition: unknown,
  ): Promise<FlowResult> {
    const flow =
      flowDefinition && typeof flowDefinition === 'object' && !Array.isArray(flowDefinition)
        ? (flowDefinition as Record<string, unknown>)
        : {};

    // Use graph-based runtime when edges are present (new format)
    const hasEdges = Array.isArray(flow.edges) && (flow.edges as unknown[]).length > 0;
    if (hasEdges) {
      const runtimeResult = await this.workflowRuntime.run({
        runId,
        organizationId,
        inputPayload,
        flowDefinition: flow as {
          nodes: FlowNodeLike[];
          edges: FlowEdgeLike[];
          config?: Record<string, unknown>;
        },
      });

      if (runtimeResult.suspended) {
        return {
          suspended: true,
          suspensionId: runtimeResult.suspensionId,
          result: { suspended: true, suspensionId: runtimeResult.suspensionId },
          uiOutput: runtimeResult.uiOutput,
          usage: [],
          awaitingUserValidation: false,
        };
      }

      return {
        result: runtimeResult.finalOutput ?? {},
        uiOutput: runtimeResult.uiOutput,
        usage: [],
        awaitingUserValidation: false,
      };
    }

    return this.executeLegacyLinearFlow(runId, organizationId, inputPayload, flow);
  }

  /**
   * @deprecated Legacy linear executor for V1 flows without `edges`
   * (llm_generate/question_form/html_validation/image_generate).
   * Slated for removal once all agents are migrated to the V2 graph runtime.
   * Do not extend — new block types must go through AgentWorkflowRuntimeService.
   */
  private async executeLegacyLinearFlow(
    runId: string,
    organizationId: string,
    inputPayload: unknown,
    flow: Record<string, unknown>,
  ): Promise<FlowResult> {
    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];

    let previousOutput: unknown = inputPayload;
    const usage: Array<Record<string, unknown>> = [];

    for (const node of nodes) {
      const currentNode = node && typeof node === 'object' ? (node as Record<string, unknown>) : {};
      const nodeId = typeof currentNode.id === 'string' ? currentNode.id : 'unknown';
      const nodeType = typeof currentNode.type === 'string' ? currentNode.type : 'passthrough';
      const config =
        currentNode.config && typeof currentNode.config === 'object'
          ? (currentNode.config as Record<string, unknown>)
          : {};

      if (nodeType === 'input') {
        await this.prisma.agentRunStep.create({
          data: {
            runId,
            blockKey: nodeId,
            blockType: nodeType,
            status: 'success',
            inputPayload: toJsonValue(inputPayload ?? {}),
            outputPayload: toJsonValue(inputPayload ?? {}),
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
        previousOutput = inputPayload;
        continue;
      }

      let stepOutput: unknown = previousOutput;
      const stepInput = previousOutput;
      const stepStartedAt = new Date();

      try {
        if (nodeType === 'llm_generate') {
          const result = await this.aiRuntimeService.generateText({
            organizationId,
            providerId: typeof config.providerId === 'string' ? config.providerId : undefined,
            modelId: typeof config.modelId === 'string' ? config.modelId : undefined,
            prompt:
              typeof config.prompt === 'string'
                ? config.prompt
                : JSON.stringify(previousOutput ?? {}),
          });
          stepOutput = { text: result.text };
          usage.push({
            providerId: result.providerId,
            modelId: result.modelId,
            usage: result.usage,
          });
        } else if (nodeType === 'image_generate') {
          const result = await this.aiRuntimeService.generateImage({
            organizationId,
            providerId: typeof config.providerId === 'string' ? config.providerId : undefined,
            modelId: typeof config.modelId === 'string' ? config.modelId : undefined,
            prompt:
              typeof config.prompt === 'string'
                ? config.prompt
                : JSON.stringify(previousOutput ?? {}),
            size: typeof config.size === 'string' ? config.size : undefined,
          });
          stepOutput = { images: result.images };
          usage.push({
            providerId: result.providerId,
            modelId: result.modelId,
            usage: result.usage,
          });
        } else if (nodeType === 'question_form') {
          const questionConfig =
            currentNode.fields && Array.isArray(currentNode.fields)
              ? currentNode.fields
              : currentNode.config &&
                  typeof currentNode.config === 'object' &&
                  Array.isArray((currentNode.config as Record<string, unknown>).fields)
                ? ((currentNode.config as Record<string, unknown>).fields as unknown[])
                : [];

          stepOutput = {
            status: 'question_required',
            form: {
              fields: questionConfig,
              includeOtherResponse: true,
            },
            previousOutput: stepInput,
          };
        } else if (nodeType === 'html_validation') {
          const html = this.resolveHtmlCandidate(previousOutput, config);
          const previewState = await this.htmlPreviewService.prepareHtmlValidation(runId, html);

          stepOutput = previewState;
          previousOutput = stepOutput;

          await this.prisma.agentRunStep.create({
            data: {
              runId,
              blockKey: nodeId,
              blockType: nodeType,
              status: 'success',
              inputPayload: toJsonValue(stepInput ?? {}),
              outputPayload: toJsonValue(stepOutput ?? {}),
              startedAt: stepStartedAt,
              completedAt: new Date(),
            },
          });

          return { result: previousOutput, usage, awaitingUserValidation: true as const, uiOutput: undefined };
        } else if (nodeType === 'output') {
          stepOutput = previousOutput;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Agent step failed';

        await this.prisma.agentRunStep.create({
          data: {
            runId,
            blockKey: nodeId,
            blockType: nodeType,
            status: 'error',
            inputPayload: toJsonValue(stepInput ?? {}),
            outputPayload: toJsonValue({}),
            errorMessage: message,
            startedAt: stepStartedAt,
            completedAt: new Date(),
          },
        });

        throw error;
      }

      previousOutput = stepOutput;

      await this.prisma.agentRunStep.create({
        data: {
          runId,
          blockKey: nodeId,
          blockType: nodeType,
          status: 'success',
          inputPayload: toJsonValue(stepInput ?? {}),
          outputPayload: toJsonValue(stepOutput ?? {}),
          startedAt: stepStartedAt,
          completedAt: new Date(),
        },
      });
    }

    return { result: previousOutput, usage, awaitingUserValidation: false as const, uiOutput: undefined };
  }

  private resolveHtmlCandidate(previousOutput: unknown, config: Record<string, unknown>) {
    const htmlField = typeof config.htmlField === 'string' ? config.htmlField : 'html';

    if (previousOutput && typeof previousOutput === 'object' && !Array.isArray(previousOutput)) {
      const candidate = (previousOutput as Record<string, unknown>)[htmlField];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }

    if (typeof previousOutput === 'string' && previousOutput.trim().length > 0) {
      return previousOutput;
    }

    return '<html><body><p>Preview unavailable</p></body></html>';
  }
}
