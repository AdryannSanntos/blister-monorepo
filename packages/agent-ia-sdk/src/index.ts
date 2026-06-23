/**
 * @company-os/agent-ia-sdk
 *
 * IA infrastructure for the backend. Two internal modules:
 *   - `ia/`     — AI capabilities (text, transcription, image, embedding, rag)
 *   - `agents/` — workflow kernel only (execute-run, AgentBuilder, generic steps)
 *
 * Agent **business logic** (cuts steps, prompts, schemas) lives in `apps/api/src/agents/`.
 * `agents/` consumes `ia/` through interfaces only; `ia/` never imports `agents/`.
 */
export * from './errors';
export * from './types';
export * from './ia';
export { TRANSCRIPTION_MAX_WAIT_MS } from './ia';
export { createAgentIaSdk } from './factory';
export type {
  AgentIaSdk,
  CreateAgentIaSdkDeps,
} from './factory';
