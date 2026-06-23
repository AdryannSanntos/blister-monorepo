import {
  AgentBuilder,
  createPauseStep,
} from '@company-os/agent-ia-sdk/agents';
import { reviewCutsSchema } from '@company-os/types';

import { cutsLearningHandler } from './learning/feedback-handler';
import {
  cutsInputZod,
  cutsOutputZod,
  normalizeCut,
} from './schemas/output.schema';
import {
  createCleanupSourceStep,
  createFinalizeCutsStep,
  createResolveSourceStep,
  getCutsSettings,
} from './steps/cuts-steps';
import { createDispatchRendersStep } from './steps/dispatch-renders.step';
import { createAwaitRendersStep } from './steps/await-renders.step';
import { createRankSegmentsStep } from './steps/rank-segments.step';

const applyCutDecisions = (
  cuts: ReturnType<typeof normalizeCut>[],
  formData: Record<string, unknown> | undefined,
  autoAccept: boolean,
) => {
  if (autoAccept) {
    return cuts.map((cut) => ({ ...cut, reviewStatus: 'approved' as const }));
  }

  const parsed = reviewCutsSchema.safeParse(formData);
  if (!parsed.success) return cuts;

  const decisionMap = new Map(parsed.data.cutDecisions.map((d) => [d.cutId, d.decision]));

  return cuts.map((cut) => {
    const decision = decisionMap.get(cut.id);
    if (decision === 'approve') return { ...cut, reviewStatus: 'approved' as const };
    if (decision === 'reject') return { ...cut, reviewStatus: 'rejected' as const };
    return cut;
  });
};

export const cutsAgent = AgentBuilder.create({ id: 'cuts', version: '3.0.0' })
  .label('Gerador de Cortes')
  .description(
    'Transforma lives, podcasts e aulas longas em cortes curtos priorizados por potencial de retenção.',
  )
  .capabilities(['text', 'analysis'])
  .estimatedCost(0.08)
  .input(cutsInputZod)
  .output(cutsOutputZod)
  .review(reviewCutsSchema)
  .addStep('resolve_source', {
    label: 'Transcrever vídeo',
    type: 'preparation',
    run: createResolveSourceStep(),
  })
  .addStep('rank_segments', {
    label: 'Gerar cortes',
    type: 'llm_call',
    run: createRankSegmentsStep(),
  })
  .addStep('dispatch_renders', {
    label: 'Iniciar renderização',
    type: 'preparation',
    run: createDispatchRendersStep(),
  })
  .addStep('await_renders', {
    label: 'Aguardando cortes',
    type: 'form',
    run: createAwaitRendersStep(),
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
        const awaitsOutput = context.previousStepsOutput.await_renders as {
          cuts?: ReturnType<typeof normalizeCut>[];
          sourceFileId?: string;
          captionStyleId?: string;
        };
        const settings = getCutsSettings(context);
        const cuts = applyCutDecisions(
          awaitsOutput.cuts ?? [],
          context.inputPayload,
          settings.autoAcceptResults,
        );
        return {
          cuts,
          sourceFileId: awaitsOutput.sourceFileId ?? '',
          captionStyleId: awaitsOutput.captionStyleId,
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
