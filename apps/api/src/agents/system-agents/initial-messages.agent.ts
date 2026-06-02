import { z } from 'zod';
import type { SystemAgentDefinition } from './system-agent.types';

/**
 * Agente de sistema: gera 5 mensagens de exemplo (prompts iniciais) para um
 * agente recém-criado, considerando o propósito do agente e o contexto da empresa.
 */

export interface InitialMessagesInput {
  agentName: string;
  agentDescription: string | null;
  agentInstructions: string | null;
  companyContext: string | null;
}

export interface InitialMessagesOutput {
  messages: string[];
}

const cleanMessages = (messages: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of messages) {
    if (typeof entry !== 'string') continue;
    const cleaned = entry
      .replace(/^["'\d.\-)\s]+/, '')
      .replace(/["'`]+$/g, '')
      .trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned.length > 160 ? cleaned.slice(0, 160) : cleaned);
    if (result.length >= 5) break;
  }
  return result;
};

const inputSchema = z.object({
  agentName: z.string().min(1),
  agentDescription: z.string().nullable(),
  agentInstructions: z.string().nullable(),
  companyContext: z.string().nullable(),
});

const resultSchema = z
  .object({ messages: z.array(z.string()) })
  .transform(({ messages }) => ({ messages: cleanMessages(messages) }))
  .refine((value) => value.messages.length > 0, { message: 'No messages' });

export const initialMessagesAgent: SystemAgentDefinition<
  InitialMessagesInput,
  InitialMessagesOutput
> = {
  key: 'initial-messages',
  name: 'Gerador de Mensagens Iniciais',
  description:
    'Gera 5 sugestões de primeira mensagem para um agente recém-criado, entendendo seu propósito e o contexto da empresa.',
  model: { temperature: 0.7, maxOutputTokens: 512 },
  outputSchema: {
    type: 'object',
    properties: {
      messages: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'string',
          description:
            'Exemplo de mensagem que o usuário enviaria para iniciar uma tarefa. Frase curta (até ~10 palavras), em português, no imperativo, sem aspas.',
        },
      },
    },
    required: ['messages'],
    additionalProperties: false,
  },
  resultSchema,
  inputSchema,
  sampleInput: {
    agentName: 'Redator de Copy LinkedIn',
    agentDescription: 'Gera posts profissionais de LinkedIn com gancho, desenvolvimento e CTA.',
    agentInstructions: null,
    companyContext: 'Empresa: Workana',
  },
  buildMessages(input) {
    const systemPrompt = [
      'Você cria sugestões de primeiras mensagens para um chat de agente de IA.',
      'As sugestões aparecem como atalhos acima do campo de mensagem, então devem soar como algo que o próprio usuário escreveria para começar uma tarefa.',
      'Regras: exatamente 5 sugestões, em português, no imperativo, curtas (até ~10 palavras), específicas para o que este agente faz, sem aspas e sem numeração.',
    ].join('\n');

    const userPrompt = [
      `Agente: ${input.agentName}`,
      input.agentDescription ? `Descrição: ${input.agentDescription}` : null,
      input.agentInstructions ? `Instruções internas: ${input.agentInstructions}` : null,
      input.companyContext ? `Contexto da empresa:\n${input.companyContext}` : null,
      'Gere as 5 sugestões de primeira mensagem.',
    ]
      .filter(Boolean)
      .join('\n\n');

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  },
};
