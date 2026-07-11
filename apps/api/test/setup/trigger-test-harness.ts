import type { PrismaClient } from '@company-os/db';
import {
  executeRun,
  NoOpEventPublisher,
  type ExecutionDependencies,
  type LlmProvider,
} from '../../src/agents/runtime/kernel';
import { AgentRunBlockService } from '../../src/agents/runtime/agent-run-block.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { setCutsRunDeps } from '../../src/agents/cuts/ports/cuts-run-deps';
import { setCarouselRunDeps } from '../../src/agents/carousel/ports/carousel-run-deps';
import { createStubCutsRunDeps } from '../helpers/stub-cuts-run-deps';
import { createStubCarouselRunDeps } from '../helpers/stub-carousel-run-deps';
import { tasks } from '@trigger.dev/sdk';

type TriggerPayload = {
  runId: string;
  resumeFromStep?: string;
  formData?: Record<string, unknown>;
};

const CUTS_STUB_LLM_RESPONSE = JSON.stringify({
  cuts: [
    {
      id: 'cut-1',
      title: 'Gancho polêmico sobre confeitaria',
      description: 'Abre com pergunta provocativa sobre preço de bolo artesanal',
      startSec: 120,
      endSec: 180,
      viralScore: 92,
    },
    {
      id: 'cut-2',
      title: 'Depoimento emocionante',
      description: 'Cliente conta como o bolo virou memória de família',
      startSec: 240,
      endSec: 300,
      viralScore: 85,
    },
    {
      id: 'cut-3',
      title: 'Bastidor da produção',
      description: 'Processo rápido mostrando ingredientes premium',
      startSec: 360,
      endSec: 420,
      viralScore: 78,
    },
  ],
});

const CAROUSEL_STUB_RESPONSES: Record<string, unknown> = {
  generate_ideas: {
    ideas: [
      { id: 'idea_1', title: '5 hábitos matinais', description: 'Rotina simples para creators' },
      { id: 'idea_2', title: 'Evite burnout', description: 'Consistência sem exaustão' },
    ],
  },
  generate_content: {
    slides: [
      { id: 'slide_1', order: 1, type: 'start', title: '5 hábitos', body: 'Comece o dia com foco' },
      { id: 'slide_2', order: 2, type: 'text', title: 'Hábito 1', body: 'Acorde mais cedo' },
    ],
  },
  generate_slides: {
    slides: [
      {
        id: 'slide_1',
        order: 1,
        type: 'start',
        htmlContent: '<div class="slide"><h1>5 hábitos</h1></div>',
        cssContent: '.slide{width:1080px;height:1350px}',
      },
      {
        id: 'slide_2',
        order: 2,
        type: 'text',
        htmlContent: '<div class="slide"><h2>Hábito 1</h2></div>',
        cssContent: '.slide{width:1080px;height:1350px}',
      },
    ],
  },
};

const resolveCarouselStubStep = (
  messages: Array<{ role: string; content: string }>,
): string => {
  const user = messages.find((message) => message.role === 'user')?.content ?? '';
  if (user.includes('HTML') || user.includes('htmlContent')) {
    return 'generate_slides';
  }
  if (user.includes('slide content') || user.includes('Slides to write')) {
    return 'generate_content';
  }
  return 'generate_ideas';
};

const createHarnessLlmProvider = (_prisma: PrismaClient): LlmProvider => ({
  async complete(params) {
    if (params.agentId === 'carousel') {
      const stepKey = params.stepKey ?? resolveCarouselStubStep(params.messages);
      const payload = CAROUSEL_STUB_RESPONSES[stepKey] ?? CAROUSEL_STUB_RESPONSES.generate_ideas;
      return {
        content: JSON.stringify(payload),
        model: 'stub/carousel',
        tokensInput: 300,
        tokensOutput: 150,
        costUsd: 0.0003,
      };
    }

    return {
      content: CUTS_STUB_LLM_RESPONSE,
      model: 'stub/cuts',
      tokensInput: 400,
      tokensOutput: 200,
      costUsd: 0.0004,
    };
  },
});

/** Runs executeRun inline with stub providers (tests only). */
export const executeAgentRunViaHarness = async (
  prisma: PrismaClient,
  payload: TriggerPayload,
): Promise<void> => {
  setCutsRunDeps(createStubCutsRunDeps());
  setCarouselRunDeps(createStubCarouselRunDeps());

  const agentRunBlockService = new AgentRunBlockService(
    prisma as unknown as PrismaService,
  );

  const deps: ExecutionDependencies = {
    prisma,
    llmProvider: createHarnessLlmProvider(prisma),
    imageProvider: null,
    eventPublisher: new NoOpEventPublisher(),
    blocks: agentRunBlockService,
  };

  await executeRun(deps, {
    runId: payload.runId,
    resumeFromStep: payload.resumeFromStep,
    formData: payload.formData,
  });
};

let harnessInstalled = false;

/** Mocks Trigger task dispatch to run executeRun in-process during E2E. */
export const installTriggerTestHarness = (prisma: PrismaClient): void => {
  if (harnessInstalled) return;
  harnessInstalled = true;

  jest.spyOn(tasks, 'trigger').mockImplementation(async (_taskId, payload) => {
    await executeAgentRunViaHarness(prisma, payload as TriggerPayload);
    return { id: 'harness-trigger-id' } as Awaited<ReturnType<typeof tasks.trigger>>;
  });
};
