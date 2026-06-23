import type { z } from 'zod';
import type { StepExecutionContext } from '../core/types';

/**
 * A tool an agent can call during an `llm_call` loop. The LLM proposes a call
 * with arguments matching `inputSchema`; `execute` runs it and the result is
 * fed back into the next LLM round.
 */
export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute: (input: TInput, context: StepExecutionContext) => Promise<TOutput>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register<TInput, TOutput>(tool: AgentTool<TInput, TOutput>): this {
    this.tools.set(tool.name, tool as unknown as AgentTool);
    return this;
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  list(): AgentTool[] {
    return [...this.tools.values()];
  }

  static fromTools(tools: AgentTool[]): ToolRegistry {
    const registry = new ToolRegistry();
    for (const tool of tools) registry.register(tool);
    return registry;
  }
}
