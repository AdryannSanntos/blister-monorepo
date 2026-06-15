import {
  AgentBuilder,
  createLlmCallStep,
  createPauseStep,
  createRetrieveContextStep,
} from '@company-os/agent-sdk';
import { reviewCutsSchema } from '@company-os/types';

import { cutsLearningHandler } from './learning/feedback-handler';
import { buildCutsSystemPrompt, buildCutsUserPrompt } from './prompts/cuts.prompts';
import {
  cutsInputZod,
  cutsLlmOutputZod,
  cutsOutputZod,
  normalizeCut,
} from './schemas/output.schema';
import {
  createCleanupSourceStep,
  createFinalizeCutsStep,
  createRenderCutsStep,
  createResolveSourceStep,
  getCutsSettings,
} from './steps/cuts-steps';

const applyCutDecisions = (
  cuts: ReturnType<typeof normalizeCut>[],
  formData: Record<string, unknown> | undefined,
  autoAccept: boolean,
) => {
  if (autoAccept) {
    return cuts.map((cut) => ({ ...cut, reviewStatus: 'approved' as const }));
  }

  const parsed = reviewCutsSchema.safeParse(formData);
  if (!parsed.success) {
    return cuts;
  }

  const decisionMap = new Map(parsed.data.cutDecisions.map((d) => [d.cutId, d.decision]));

  return cuts.map((cut) => {
    const decision = decisionMap.get(cut.id);
    if (decision === 'approve') return { ...cut, reviewStatus: 'approved' as const };
    if (decision === 'reject') return { ...cut, reviewStatus: 'rejected' as const };
    return cut;
  });
};

/**
 * Gerador de Cortes — transforma vídeos longos em cortes curtos priorizados
 * por potencial de retenção.
 *
 * Pipeline enxuto:
 * 1. prepare (contexto + vídeo/transcrição)
 * 2. rank_cuts (LLM)
 * 3. review + finalize (+ cleanup opcional)
 */
export const cutsAgent = AgentBuilder.create({ id: 'cuts', version: '2.1.0' })
  .label('Gerador de Cortes')
  .description(
    'Transforma lives, podcasts e aulas longas em cortes curtos priorizados por potencial de retenção.',
  )
  .capabilities(['text', 'analysis'])
  .estimatedCost(0.08)
  .input(cutsInputZod)
  .output(cutsOutputZod)
  .review(reviewCutsSchema)
  .withContext({
    includeBrandBrain: true,
    includeAgentLearning: true,
    includeCampaignContext: false,
    useUserInputAsRetrievalQuery: false,
  })
  .addStep('retrieve_context', {
    label: 'Contexto',
    type: 'preparation',
    run: createRetrieveContextStep(),
  })
  .addStep('resolve_source', {
    label: 'Transcrever vídeo',
    type: 'preparation',
    run: createResolveSourceStep(),
  })
  .addStep('rank_segments', {
    label: 'Gerar cortes',
    type: 'llm_call',
    run: createLlmCallStep({
      outputSchema: cutsLlmOutputZod,
      buildSystem: buildCutsSystemPrompt,
      buildUser: buildCutsUserPrompt,
      transformOutput: (data, context) => {
        const input = context.inputPayload as {
          sourceFileId?: string;
          settings?: { captionStyleId?: string; autoAcceptResults?: boolean };
        };
        const settings = getCutsSettings(context);
        const autoAccept = settings.autoAcceptResults;
        const normalized = data.cuts.map((cut, index) =>
          normalizeCut(
            { ...cut, id: `cut-${index + 1}` },
            autoAccept ? 'approved' : 'pending',
          ),
        );

        return {
          cuts: normalized,
          sourceFileId: input.sourceFileId ?? '',
          captionStyleId: settings.addCaptions ? settings.captionStyleId : undefined,
        };
      },
    }),
  })
  .addStep('render_cuts', {
    label: 'Renderizar cortes',
    type: 'preparation',
    run: createRenderCutsStep(),
  })
  .addStep('await_cut_review', {
    label: 'Revisar cortes',
    type: 'form',
    run: createPauseStep({
      pauseType: 'form',
      until: (context) => {
        const settings = getCutsSettings(context);
        if (settings.autoAcceptResults) return true;
        const cutDecisions = context.inputPayload.cutDecisions;
        return Array.isArray(cutDecisions) && cutDecisions.length > 0;
      },
      getFormSchema: () => reviewCutsSchema,
      pauseReason: 'awaiting_cut_review',
      previewBlock: 'output',
      onContinue: (context) => {
        const renderOutput = context.previousStepsOutput.render_cuts as {
          cuts?: ReturnType<typeof normalizeCut>[];
          sourceFileId?: string;
          captionStyleId?: string;
        };
        const settings = getCutsSettings(context);
        const cuts = applyCutDecisions(
          renderOutput.cuts ?? [],
          context.inputPayload,
          settings.autoAcceptResults,
        );

        return {
          cuts,
          sourceFileId: renderOutput.sourceFileId ?? '',
          captionStyleId: renderOutput.captionStyleId,
        };
      },
    }),
  })
  .addStep('finalize_cuts', {
    label: 'Finalizar',
    type: 'output',
    run: createFinalizeCutsStep(),
  })
  .addStep('cleanup_source', {
    label: 'Limpar fonte',
    type: 'preparation',
    run: createCleanupSourceStep(),
  })
  .withLearning(cutsLearningHandler)
  .build();

export const cutsAgentDefinition = cutsAgent.definition;
