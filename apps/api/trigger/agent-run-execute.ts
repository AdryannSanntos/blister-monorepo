import { task, logger } from '@trigger.dev/sdk';
import { PrismaClient } from '../src/generated/prisma';
import { z } from 'zod';
import {
  executeRun,
  HttpEventPublisher,
  NoOpEventPublisher,
  createTriggerAssetResolver,
  createTriggerImageProvider,
  createTriggerLlmProvider,
  type ExecutionDependencies,
} from '../src/agents/runtime/kernel';
import { createTriggerContextPackBuilder } from '../src/agents/adapters/create-trigger-context-pack-builder';
import { AgentRunBlockService } from '../src/agents/runtime/agent-run-block.service';
import { resolveAgentExecutionMode } from '../src/agents/runtime/agent-execution-mode';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildCutsRunDepsFromEnv } from '../src/agents/cuts/build-cuts-run-deps';
import {
  resetCutsRunDeps,
  setCutsRunDeps,
} from '../src/agents/cuts/ports/cuts-run-deps';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../src/storage/storage.service';

const prisma = new PrismaClient();

const executePayloadSchema = z.object({
  runId: z.string().min(1),
  resumeFromStep: z.string().optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
});

export type ExecutePayload = z.infer<typeof executePayloadSchema>;

export interface ExecuteResult {
  runId: string;
  status: 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELLED';
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
  pauseReason?: string;
  creditCost?: number;
}

function hasAnyLlmProviderConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY);
}

function createEventPublisher() {
  const appUrl = process.env.APP_URL;
  const triggerSecret = process.env.TRIGGER_SECRET_KEY;

  if (appUrl) {
    return new HttpEventPublisher(appUrl, triggerSecret);
  }

  return new NoOpEventPublisher();
}

export const agentRunExecute = task({
  id: 'agent-run-execute',
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: ExecutePayload): Promise<ExecuteResult> => {
    const validated = executePayloadSchema.parse(payload);
    const mode = resolveAgentExecutionMode(
      process.env.AGENT_EXECUTION_MODE,
      process.env.NODE_ENV,
      'trigger',
    );

    logger.info('Starting agent run execution', {
      runId: validated.runId,
      mode,
      hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasAssemblyAiKey: Boolean(process.env.ASSEMBLYAI_API_KEY),
    });

    // Trigger workers do not boot NestJS — wire real cuts deps here (not the in-memory stub).
    if (mode === 'inline-stub') {
      resetCutsRunDeps();
    } else {
      const storage = new StorageService(new ConfigService());
      setCutsRunDeps(buildCutsRunDepsFromEnv(prisma, storage));
    }

    const useLiveProviders = mode !== 'inline-stub' && hasAnyLlmProviderConfigured();

    const agentRunBlockService = new AgentRunBlockService(
      prisma as unknown as PrismaService,
    );

    const deps: ExecutionDependencies = {
      prisma,
      contextPackBuilder:
        mode === 'inline-stub' ? null : createTriggerContextPackBuilder(prisma),
      llmProvider: useLiveProviders ? createTriggerLlmProvider(prisma) : null,
      imageProvider: useLiveProviders ? createTriggerImageProvider(prisma) : null,
      assetResolver: useLiveProviders ? createTriggerAssetResolver() : null,
      eventPublisher: createEventPublisher(),
      blocks: agentRunBlockService,
      stubMode: mode === 'inline-stub',
    };

    const result = await executeRun(deps, {
      runId: validated.runId,
      resumeFromStep: validated.resumeFromStep,
      formData: validated.formData,
    });

    logger.info('Agent run execution completed', {
      runId: result.runId,
      status: result.status,
      creditCost: result.creditCost,
      errorMessage: result.errorMessage,
    });

    return {
      runId: result.runId,
      status: result.status as ExecuteResult['status'],
      outputPayload: result.outputPayload,
      errorMessage: result.errorMessage,
      pauseReason: result.pauseReason,
      creditCost: result.creditCost,
    };
  },
});
