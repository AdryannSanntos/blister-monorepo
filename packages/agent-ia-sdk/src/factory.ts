import type { PrismaClient } from '@company-os/db';
import { AiRuntime } from './ia/runtime/ai-runtime';
import type { ProviderSecrets } from './types';

/**
 * The fully-wired SDK handed to the backend shell.
 *
 * `ia` is the capability runtime (text/transcription/image/embedding/rag);
 * `agents` is the agents framework namespace, refined in Task 9.
 */
export interface AgentIaSdk {
  ia: AiRuntime;
  agents: unknown;
}

export interface CreateAgentIaSdkDeps {
  prisma: PrismaClient;
  secrets: ProviderSecrets;
}

/**
 * Composition root for the SDK. The backend's `AgentIaSdkModule` calls this
 * once with a `PrismaClient` and env-loaded `ProviderSecrets`.
 */
export function createAgentIaSdk(deps: CreateAgentIaSdkDeps): AgentIaSdk {
  const ia = new AiRuntime({ prisma: deps.prisma, secrets: deps.secrets });
  // `agents` namespace lives in `src/agents/` (workflow kernel).
  return { ia, agents: {} };
}
