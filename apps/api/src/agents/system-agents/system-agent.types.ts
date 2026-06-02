import type { z } from 'zod';

/**
 * Contrato dos **agentes de sistema** do Workana AI.
 *
 * Um agente de sistema NÃO pertence a nenhuma empresa: é uma peça interna que o
 * próprio sistema dispara dentro de fluxos (gerar título de conversa, sugerir
 * mensagens iniciais, etc.). Tem instruções, modelo, contexto e schema de saída
 * próprios, e sempre responde em JSON estruturado validado.
 *
 * Nenhum usuário tem acesso a esses agentes — não há controller/endpoint que os
 * exponha. Apenas serviços internos chamam o {@link SystemAgentRunnerService}.
 */

/** Estados de execução de um agente de sistema, consumíveis por backend e UI. */
export type SystemAgentRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SystemAgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Configuração de modelo do agente. Omitir deixa o AI runtime auto-selecionar. */
export interface SystemAgentModelConfig {
  providerId?: string;
  modelId?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface SystemAgentRunContext {
  /** Org no escopo da qual o runtime resolve credenciais/modelos (opcional). */
  organizationId?: string;
  /**
   * Override de modelo resolvido a partir da configuração editável no admin.
   * Sobrepõe campo a campo o `model` padrão da definição.
   */
  modelOverride?: SystemAgentModelConfig;
}

/**
 * Definição declarativa de um agente de sistema. Cada arquivo em
 * `system-agents/*.agent.ts` exporta uma destas — é toda a "criação e
 * configuração" do agente: identidade, modelo, prompt e schema de saída.
 */
export interface SystemAgentDefinition<TInput, TOutput> {
  /** Identificador estável e único do agente (kebab-case). */
  key: string;
  name: string;
  description: string;
  model?: SystemAgentModelConfig;
  /** JSON Schema enviado ao provedor para forçar a saída estruturada. */
  outputSchema: Record<string, unknown>;
  /** Schema Zod que valida (e normaliza) a saída estruturada do modelo. */
  resultSchema: z.ZodType<TOutput>;
  /** Schema Zod do input do agente — usado para validar o "testar" no admin. */
  inputSchema: z.ZodType<TInput>;
  /** Input de exemplo para o playground de teste no admin. */
  sampleInput: TInput;
  /** Monta as mensagens (system/user) do turno a partir do input tipado. */
  buildMessages(input: TInput, context: SystemAgentRunContext): SystemAgentMessage[];
}

/** Resultado de uma execução de agente de sistema, com estado explícito. */
export interface SystemAgentRunResult<TOutput> {
  agentKey: string;
  status: SystemAgentRunStatus;
  data: TOutput | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export type AnySystemAgentDefinition = SystemAgentDefinition<unknown, unknown>;
