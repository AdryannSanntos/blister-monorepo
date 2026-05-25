import { Injectable } from '@nestjs/common';

export interface BlockExecutionContext {
  runId: string;
  organizationId: string;
  stepId?: string;
  blockId: string;
  blockType: string;
  blockConfig: Record<string, unknown>;
  inputs: Record<string, unknown>;
  runState: Record<string, unknown>;
}

export interface BlockExecutionResult {
  outputs: Record<string, unknown>;
  suspend?: {
    type: 'clarification' | 'form' | 'validation';
    payload: Record<string, unknown>;
  };
  terminate?: boolean;
}

export type BlockExecutorFn = (ctx: BlockExecutionContext) => Promise<BlockExecutionResult>;

@Injectable()
export class AgentBlockExecutorRegistry {
  private readonly registry = new Map<string, BlockExecutorFn>();

  register(blockType: string, executor: BlockExecutorFn): void {
    this.registry.set(blockType, executor);
  }

  get(blockType: string): BlockExecutorFn | undefined {
    return this.registry.get(blockType);
  }

  has(blockType: string): boolean {
    return this.registry.has(blockType);
  }
}
