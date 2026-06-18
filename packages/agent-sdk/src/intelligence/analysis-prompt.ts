import type { ClarificationField } from '../clarification/clarification-field';
import type { EnrichmentField } from '../schemas/clarification-answer';
import type { StepExecutionContext } from '../core/types';

const describeField = (field: ClarificationField): string => {
  const options = field.options?.length
    ? ` Opções válidas: ${field.options.map((o) => o.id).join(', ')}.`
    : '';
  const required = field.required === false ? ' (opcional)' : ' (obrigatório)';
  return `- ${field.name}${required}: ${field.label}${options}`;
};

const describeBrand = (_context: StepExecutionContext): string => '';

/**
 * System prompt for the request-analysis LLM call. Instructs the model to
 * extract only values supported by the field options, attach confidence and
 * evidence, and never invent fields.
 */
export const buildAnalysisSystemPrompt = (
  context: StepExecutionContext,
  fields: ClarificationField[],
  enrichments: EnrichmentField[],
): string => {
  const fieldList = fields.map(describeField).join('\n');
  const enrichmentList = enrichments.length
    ? `\n## Campos de enriquecimento (vão para enrichedBrief, não são perguntas)\n${enrichments
        .map((e) => `- ${e.name}: ${e.description}`)
        .join('\n')}\n`
    : '';

  return [
    'Você analisa o pedido livre do usuário e extrai campos estruturados para um agente de marketing.',
    describeBrand(context),
    '## Campos estruturados que podem ser extraídos',
    fieldList,
    enrichmentList,
    '## Regras',
    '- Extraia apenas valores explicitamente suportados pelas opções de cada campo.',
    '- Para cada campo extraído, informe confidence (high|medium|low) e evidence (trecho do input).',
    '- Não invente campos nem valores fora das opções.',
    '- enrichedBrief recebe tom, ângulo narrativo, público e temas mencionados (texto livre).',
    '- missingFields = campos obrigatórios que você NÃO conseguiu extrair.',
    '- skippedFieldNames = campos obrigatórios que você conseguiu extrair com confiança.',
    '- suggestedPath: "quick" se nada falta, "clarify" se falta campo obrigatório, "full" para fluxo completo.',
    '- Responda SOMENTE com um objeto JSON válido seguindo o schema fornecido.',
  ]
    .filter(Boolean)
    .join('\n');
};

export const buildAnalysisUserPrompt = (userInput: string): string =>
  `Mensagem do usuário:\n"""\n${userInput}\n"""`;
