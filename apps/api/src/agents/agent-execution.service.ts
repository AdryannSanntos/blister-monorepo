import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { tasks } from '@trigger.dev/sdk';
import type { AgentRunTaskPayload } from '../../trigger/shared/agent-runtime-payloads';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';
import { CreditsService } from '../credits/credits.service';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentQueueService } from './agent-queue.service';
import { HtmlPreviewService } from './html-preview.service';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

@Injectable()
export class AgentExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRuntimeService: AIRuntimeService,
    private readonly creditsService: CreditsService,
    private readonly htmlPreviewService: HtmlPreviewService,
    private readonly agentQueueService: AgentQueueService,
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

        if (output.awaitingUserValidation) {
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

  private async executeFlow(
    runId: string,
    organizationId: string,
    inputPayload: unknown,
    flowDefinition: unknown,
  ) {
    const flow =
      flowDefinition && typeof flowDefinition === 'object' && !Array.isArray(flowDefinition)
        ? (flowDefinition as Record<string, unknown>)
        : {};
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
        usage.push({ providerId: result.providerId, modelId: result.modelId, usage: result.usage });
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
        usage.push({ providerId: result.providerId, modelId: result.modelId, usage: result.usage });
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
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });

        return { result: previousOutput, usage, awaitingUserValidation: true };
      } else if (nodeType === 'output') {
        stepOutput = previousOutput;
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
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    }

    return { result: previousOutput, usage, awaitingUserValidation: false };
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
