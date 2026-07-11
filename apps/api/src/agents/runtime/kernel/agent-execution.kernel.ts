import {
  executeRun as sdkExecuteRun,
  type CustomStepExecutor as SdkCustomStepExecutor,
  type ExecutionKernelDeps,
  type KernelRunResult,
  type StepExecutionContext,
  type StepResult,
} from '@company-os/agent-ia-sdk/agents';
import { toUserFacingProviderError } from './provider-error-message';
import type { PrismaClient } from '@company-os/db';
import { createPrismaRunStore } from '../../adapters/prisma-run-store.adapter';
import { createUsageReporter } from '../../adapters/usage-reporter.adapter';
import { loadAgentDefinition } from './agent-loader';
import {
  type AgentRunBlockServiceLike,
  type MessageHandle,
  type StreamingBlock,
} from '@company-os/agent-ia-sdk/agents';
import { debitStepCredits, getPlatformSettings } from './credit-debit.helper';
import {
  createDevTelemetryProvider,
  isVerboseAgentDevLogging,
  wrapEventPublisherForDev,
} from '../dev-agent-logger';
import { agentStepRegistry } from './agent-step-registry';
import type { EventPublisher } from './run-event.publisher';
import { createTriggerLlmProvider } from './trigger-providers';
import type { RunResult } from './types';

export interface LlmCompletion {
  content: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  structuredOutput?: Record<string, unknown>;
}

export interface LlmCompletionParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  agentId: string;
  stepKey?: string;
  maxTokens?: number;
  temperature?: number;
  structuredOutputSchema?: Record<string, unknown>;
}

export interface LlmProvider {
  complete(params: LlmCompletionParams): Promise<LlmCompletion>;
  completeStream?(
    params: LlmCompletionParams,
    onChunk: (delta: string) => void,
  ): Promise<LlmCompletion>;
}

export interface ImageProvider {
  generateImage(params: {
    prompt: string;
    agentId: string;
    stepKey?: string;
  }): Promise<{
    imageUrl?: string;
    base64?: string;
    storageKey?: string;
  }>;
}

export interface ExecutionDependencies {
  prisma: PrismaClient;
  llmProvider: LlmProvider | null;
  imageProvider: ImageProvider | null;
  eventPublisher: EventPublisher;
  blocks: AgentRunBlockServiceLike;
  stubMode?: boolean;
}

export interface StepExecutorDeps {
  llmProvider: LlmProvider | null;
  imageProvider: ImageProvider | null;
  message: MessageHandle;
}

export type CustomStepExecutor = (
  context: StepExecutionContext,
  deps: StepExecutorDeps,
  onChunk?: (delta: string) => void,
) => Promise<StepResult>;

export interface ExecuteRunParams {
  runId: string;
  resumeFromStep?: string;
  formData?: Record<string, unknown>;
}

export type { MessageHandle, StreamingBlock };

const buildKernelDeps = (deps: ExecutionDependencies): ExecutionKernelDeps => {
  const eventPublisher = isVerboseAgentDevLogging()
    ? wrapEventPublisherForDev(deps.eventPublisher)
    : deps.eventPublisher;

  return {
    runStore: createPrismaRunStore(deps.prisma),
    loadAgentDefinition: async (agentId) => {
      const definition = await loadAgentDefinition(deps.prisma, agentId);
      return definition;
    },
    llmProvider: deps.llmProvider,
    imageProvider: deps.imageProvider,
    eventPublisher,
    blocks: deps.blocks,
    usageReporter: {
      getPlatformSettings: () => getPlatformSettings(deps.prisma),
      debitStep: (params) => debitStepCredits(deps.prisma, params),
    },
    usage: createUsageReporter(),
    customStepExecutors: agentStepRegistry as Record<string, SdkCustomStepExecutor>,
    stubMode: deps.stubMode,
    formatProviderError: toUserFacingProviderError,
    telemetry: isVerboseAgentDevLogging() ? createDevTelemetryProvider() : undefined,
  };
};

export async function executeRun(
  deps: ExecutionDependencies,
  params: ExecuteRunParams,
): Promise<RunResult> {
  const result: KernelRunResult = await sdkExecuteRun(buildKernelDeps(deps), params);
  return result;
}

export { agentStepRegistry, createTriggerLlmProvider };
