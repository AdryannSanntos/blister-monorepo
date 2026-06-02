import { z } from 'zod';
import type { SystemAgentDefinition } from './system-agent.types';

/**
 * Agente de sistema: gera um título curto (≤5 palavras) para uma conversa de
 * chat a partir do agente em execução e da primeira mensagem do usuário.
 */

export interface ThreadTitleInput {
  agentName: string;
  agentDescription: string | null;
  firstMessage: string;
}

export interface ThreadTitleOutput {
  title: string;
}

const sanitizeTitle = (raw: string): string => {
  const cleaned = raw
    .replace(/["'`]/g, '')
    .replace(/[.\s]+$/g, '')
    .trim();
  const title = cleaned.split(/\s+/).slice(0, 6).join(' ');
  return title.length > 80 ? title.slice(0, 80) : title;
};

const inputSchema = z.object({
  agentName: z.string().min(1),
  agentDescription: z.string().nullable(),
  firstMessage: z.string().trim().min(1),
});

const resultSchema = z
  .object({ title: z.string() })
  .transform(({ title }) => ({ title: sanitizeTitle(title) }))
  .refine((value) => value.title.length > 0, { message: 'Empty title' });

export const threadTitleAgent: SystemAgentDefinition<ThreadTitleInput, ThreadTitleOutput> = {
  key: 'thread-title',
  name: 'Gerador de Título de Conversa',
  description:
    'Analisa o agente em execução e a primeira mensagem do usuário para nomear a conversa em até 5 palavras.',
  model: { temperature: 0.3, maxOutputTokens: 64 },
  outputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description:
          'Título curto da conversa em português, no máximo 5 palavras, sem aspas, sem ponto final e sem emojis.',
      },
    },
    required: ['title'],
    additionalProperties: false,
  },
  resultSchema,
  inputSchema,
  sampleInput: {
    agentName: 'Redator de Copy LinkedIn',
    agentDescription: 'Gera posts profissionais de LinkedIn com gancho, desenvolvimento e CTA.',
    firstMessage: 'Preciso de um post sobre o lançamento do nosso novo produto.',
  },
  buildMessages(input) {
    const systemPrompt = [
      'Você nomeia conversas de um chat de agente de IA.',
      `O agente se chama "${input.agentName}".`,
      input.agentDescription ? `Função do agente: ${input.agentDescription}` : null,
      'Gere um título curto que resuma a intenção da primeira mensagem do usuário.',
      'Regras: máximo 5 palavras, em português, sem aspas, sem ponto final, sem emojis.',
    ]
      .filter(Boolean)
      .join('\n');

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input.firstMessage },
    ];
  },
};
