import type { z } from 'zod';
import type { StepExecutionContext, StepExecutor, StepResult } from '../core/types';
import { parseLlmJson } from '../schemas/parse-llm-json';
import { zodToJsonSchema } from '../schemas/zod-to-json-schema';
import type { AgentTool, ToolRegistry } from './tool-registry';

interface ToolCallRequest {
  tool?: string;
  arguments?: Record<string, unknown>;
  final?: boolean;
  answer?: unknown;
}

const renderToolCatalog = (tools: AgentTool[]): string =>
  tools
    .map(
      (tool) =>
        `- ${tool.name}: ${tool.description}. Argumentos: ${JSON.stringify(
          zodToJsonSchema(tool.inputSchema),
        )}`,
    )
    .join('\n');

/**
 * LLM → tool → LLM loop. Each round the model either requests a tool call
 * (`{ tool, arguments }`) or finishes (`{ final: true, answer }`). Tool results
 * are appended to the running transcript. Stops at `maxRounds`.
 */
export const createToolStep = <TSchema extends z.ZodType>(options: {
  registry: ToolRegistry;
  outputSchema: TSchema;
  buildSystem: (context: StepExecutionContext) => string;
  buildUser: (context: StepExecutionContext) => string;
  maxRounds?: number;
  maxTokens?: number;
  temperature?: number;
}): StepExecutor => {
  const maxRounds = options.maxRounds ?? 5;

  return async (context, deps): Promise<StepResult> => {
    if (!deps.llmProvider) {
      return { type: 'FAILED', error: 'LLM provider is required for tool steps' };
    }

    const tools = options.registry.list();
    const transcript: string[] = [options.buildUser(context)];

    const system = [
      options.buildSystem(context),
      '\n## Ferramentas disponíveis',
      renderToolCatalog(tools),
      '\n## Protocolo',
      'Para usar uma ferramenta responda APENAS: {"tool":"<nome>","arguments":{...}}',
      'Quando tiver a resposta final responda APENAS: {"final":true,"answer":{...}}',
    ].join('\n');

    for (let round = 0; round < maxRounds; round += 1) {
      const response = await deps.llmProvider.complete({
        system,
        user: transcript.join('\n\n'),
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      });

      let request: ToolCallRequest;
      try {
        request = JSON.parse(response.content.trim()) as ToolCallRequest;
      } catch {
        transcript.push(
          `Resposta inválida (não era JSON). Responda no protocolo definido.\n${response.content}`,
        );
        continue;
      }

      if (request.final) {
        const parsed = parseLlmJson(JSON.stringify(request.answer ?? {}), options.outputSchema);
        if (!parsed.success) {
          return { type: 'FAILED', error: parsed.error ?? 'Tool output failed schema validation' };
        }
        return {
          type: 'CONTINUE',
          output: parsed.data as Record<string, unknown>,
          llmModel: response.model,
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          creditCost: response.costUsd,
        };
      }

      const tool = request.tool ? options.registry.get(request.tool) : undefined;
      if (!tool) {
        transcript.push(`Ferramenta "${request.tool}" não existe. Escolha uma da lista.`);
        continue;
      }

      const argsParsed = tool.inputSchema.safeParse(request.arguments ?? {});
      if (!argsParsed.success) {
        transcript.push(`Argumentos inválidos para ${tool.name}: ${argsParsed.error.message}`);
        continue;
      }

      try {
        const result = await tool.execute(argsParsed.data, context);
        transcript.push(
          `Resultado de ${tool.name}: ${JSON.stringify(result)}`,
        );
      } catch (error) {
        transcript.push(
          `Erro ao executar ${tool.name}: ${error instanceof Error ? error.message : 'desconhecido'}`,
        );
      }
    }

    return { type: 'FAILED', error: `Tool loop exceeded ${maxRounds} rounds without a final answer` };
  };
};
