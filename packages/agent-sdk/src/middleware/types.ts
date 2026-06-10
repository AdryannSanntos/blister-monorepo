import type { StepExecutionContext, StepResult } from '../core/types';

export interface RunMiddlewareContext {
  runId: string;
  agentId: string;
  companyId: string;
  inputPayload: Record<string, unknown>;
}

export interface RunCompletedMiddlewareContext extends RunMiddlewareContext {
  status: string;
  outputPayload?: Record<string, unknown>;
  creditCost: number;
}

export interface StepMiddlewareContext {
  stepContext: StepExecutionContext;
}

export interface StepCompletedMiddlewareContext extends StepMiddlewareContext {
  result: StepResult;
}

export type RunMiddleware = (context: RunMiddlewareContext) => void | Promise<void>;
export type RunCompletedMiddleware = (
  context: RunCompletedMiddlewareContext,
) => void | Promise<void>;
export type StepMiddleware = (context: StepMiddlewareContext) => void | Promise<void>;
export type StepCompletedMiddleware = (
  context: StepCompletedMiddlewareContext,
) => void | Promise<void>;

export interface AgentMiddleware {
  beforeRun: RunMiddleware[];
  afterRun: RunCompletedMiddleware[];
  beforeStep: StepMiddleware[];
  afterStep: StepCompletedMiddleware[];
}

export const createEmptyMiddleware = (): AgentMiddleware => ({
  beforeRun: [],
  afterRun: [],
  beforeStep: [],
  afterStep: [],
});
