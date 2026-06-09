import { task, logger } from '@trigger.dev/sdk';
import { PrismaClient } from '../src/generated/prisma';
import { z } from 'zod';
import {
  executeRun,
  HttpEventPublisher,
  NoOpEventPublisher,
  type ExecutionDependencies,
  type LlmProvider,
  type ImageProvider,
  type ContextPackBuilder,
} from '../src/agents/runtime/kernel';

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

function getExecutionMode(): 'inline-stub' | 'inline-live' | 'trigger' {
  const mode = process.env.AGENT_EXECUTION_MODE ?? 'trigger';
  if (mode === 'inline-stub' || mode === 'inline-live' || mode === 'trigger') {
    return mode;
  }
  return 'trigger';
}

function createLlmProvider(): LlmProvider | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) return null;

  return {
    async complete(params) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL ?? 'https://blister.app',
          'X-Title': 'Blister',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: params.messages,
          max_tokens: params.maxTokens ?? 4096,
          temperature: params.temperature ?? 0.7,
          ...(params.structuredOutputSchema
            ? {
                response_format: {
                  type: 'json_schema',
                  json_schema: {
                    name: 'response',
                    schema: params.structuredOutputSchema,
                  },
                },
              }
            : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM call failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message?: { content: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const content = data.choices[0]?.message?.content ?? '';
      const tokensInput = data.usage?.prompt_tokens ?? 0;
      const tokensOutput = data.usage?.completion_tokens ?? 0;

      let structuredOutput: Record<string, unknown> | undefined;
      if (params.structuredOutputSchema) {
        try {
          structuredOutput = JSON.parse(content) as Record<string, unknown>;
        } catch {
          // Ignore parse errors
        }
      }

      const costUsd =
        (tokensInput / 1000) * 0.00015 + (tokensOutput / 1000) * 0.0006;

      return {
        content,
        model: 'openrouter/openai/gpt-4o-mini',
        tokensInput,
        tokensOutput,
        costUsd,
        structuredOutput,
      };
    },
  };
}

function createImageProvider(): ImageProvider | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  return {
    async generateImage(params) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
            generationConfig: { responseModalities: ['IMAGE'] },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
          };
        }>;
      };

      const imageData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!imageData?.data) {
        throw new Error('No image data in response');
      }

      return {
        base64: imageData.data,
        imageUrl: `data:${imageData.mimeType};base64,${imageData.data}`,
      };
    },
  };
}

function createContextPackBuilder(): ContextPackBuilder | null {
  return null;
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
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: ExecutePayload): Promise<ExecuteResult> => {
    const validated = executePayloadSchema.parse(payload);
    const mode = getExecutionMode();

    logger.info('Starting agent run execution', {
      runId: validated.runId,
      mode,
    });

    const deps: ExecutionDependencies = {
      prisma,
      contextPackBuilder: createContextPackBuilder(),
      llmProvider: mode === 'inline-stub' ? null : createLlmProvider(),
      imageProvider: mode === 'inline-stub' ? null : createImageProvider(),
      eventPublisher: createEventPublisher(),
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
