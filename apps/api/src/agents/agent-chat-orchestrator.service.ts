import { Injectable } from '@nestjs/common';
import type {
  OrchestrateMessageInput,
  OrchestrationEvent,
  OrchestrationResult,
} from './dto/agent-chat-orchestration.dto';

const CONVERSATIONAL_PATTERNS = [
  /^(oi|olá|ola|hey|hi|hello|tudo\s+bem|bom\s+dia|boa\s+tarde|boa\s+noite)[.!?]?\s*$/i,
  /^(obrigad[ao]|valeu|thanks|thank\s+you)[.!?]?\s*$/i,
  /^(ok|okay|certo|entendi|entendido|show|beleza)[.!?]?\s*$/i,
];

const CONTEXT_RETRIEVAL_PATTERNS = [
  /\b(quais?\s+refer[eê]ncias?|que\s+refer[eê]ncias?|quais?\s+fontes?|que\s+fontes?)\b/i,
  /\b(me\s+mostra?|pode\s+me\s+mostrar|mostre[-\s]+me)\b/i,
  /\b(o\s+que\s+(você|vc)\s+(sabe?|conhece?|tem)\s+(sobre|de|a\s+respeito))\b/i,
  /\b(quais?\s+(são|é)\s+(seus?|suas?)\s+(conhecimentos?|informações?|dados?))\b/i,
  /\b(listar?|liste?|enumerar?)\b.*\b(refer[eê]ncias?|fontes?|dados?|informações?)\b/i,
];

const FINAL_ACTION_PATTERN =
  /\b(ger[ae]|cri[ae]|produz[ae]|elabor[ae]|escrev[ae]|redig[ae]|mont[ae]|constru[ae]|faça?|fa[zç]|execut[ae]|rod[ae])\b/i;

const DELIVERABLE_PATTERN =
  /\b(brief(ing)?|copy|conteúdo|post|relat[oó]rio|análise\s+completa|plano|entrega|versão\s+final|artefato|documento)\b/i;

const FINALITY_PATTERN = /\b(agora|definitivo|final|entrega|pronto|publicável)\b/i;

@Injectable()
export class AgentChatOrchestratorService {
  async orchestrateMessage(input: OrchestrateMessageInput): Promise<OrchestrationResult> {
    const msg = input.message.trim();
    const events: OrchestrationEvent[] = [];

    if (CONVERSATIONAL_PATTERNS.some((p) => p.test(msg))) {
      events.push({ type: 'intent_classified', label: 'Mensagem conversacional detectada' });
      return {
        mode: 'conversation',
        createRun: false,
        events,
        resolvedContextHints: [],
        executionReason: undefined,
      };
    }

    const isContextRetrieval = CONTEXT_RETRIEVAL_PATTERNS.some((p) => p.test(msg));
    if (isContextRetrieval) {
      events.push({ type: 'intent_classified', label: 'Consulta de contexto detectada' });
      events.push({ type: 'context_read', label: 'Lendo referências disponíveis' });
      return {
        mode: 'context_retrieval',
        createRun: false,
        events,
        resolvedContextHints: [],
        executionReason: undefined,
      };
    }

    const isExplicitExecution =
      FINAL_ACTION_PATTERN.test(msg) &&
      (DELIVERABLE_PATTERN.test(msg) || FINALITY_PATTERN.test(msg));

    if (!isExplicitExecution) {
      events.push({ type: 'intent_classified', label: 'Conversa operacional detectada' });
      return {
        mode: 'conversation',
        createRun: false,
        events,
        resolvedContextHints: [],
        executionReason: undefined,
      };
    }

    const executionReason = isExplicitExecution
      ? 'Pedido de geração de artefato detectado'
      : 'Mensagem requer processamento por agente';

    events.push({ type: 'intent_classified', label: 'Execução necessária detectada' });
    events.push({ type: 'execution_decided', label: executionReason });

    return {
      mode: 'execution',
      createRun: true,
      events,
      resolvedContextHints: [],
      executionReason,
    };
  }
}
