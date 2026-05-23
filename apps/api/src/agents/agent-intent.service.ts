import { Injectable } from '@nestjs/common';

// Mensagens que são claramente apenas conversa curta — sem tarefa implícita.
// Tudo o que não cair nestes padrões vai para execução, pois o agente precisa
// responder via run. O caminho conversacional sem run ainda não tem resposta
// implementada, portanto o default seguro é sempre executar.
const CONVERSATIONAL_ONLY_PATTERNS = [
  /^(oi|olá|ola|hey|hi|hello|tudo\s+bem|bom\s+dia|boa\s+tarde|boa\s+noite)[.!?]?\s*$/i,
  /^(obrigad[ao]|valeu|thanks|thank\s+you)[.!?]?\s*$/i,
  /^(ok|okay|certo|entendi|entendido|show|beleza)[.!?]?\s*$/i,
];

export type AgentIntentDecision = {
  mode: 'execution' | 'conversational';
  reason: 'task_requested' | 'conversation_only';
};

@Injectable()
export class AgentIntentService {
  async classify(input: { message: string }): Promise<AgentIntentDecision> {
    const normalizedMessage = input.message.trim();

    // Respostas muito curtas e claramente conversacionais não precisam de run.
    // Para todas as demais mensagens (perguntas, demandas, tarefas, análises,
    // planos, etc.) criamos um run para que o agente possa responder.
    const isConversationalOnly = CONVERSATIONAL_ONLY_PATTERNS.some((pattern) =>
      pattern.test(normalizedMessage),
    );

    return {
      mode: isConversationalOnly ? 'conversational' : 'execution',
      reason: isConversationalOnly ? 'conversation_only' : 'task_requested',
    };
  }
}
