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
import { createStubCutsRunDeps } from '../helpers/stub-cuts-run-deps';
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

const createHarnessLlmProvider = (): LlmProvider => ({
  async complete() {
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

  const agentRunBlockService = new AgentRunBlockService(
    prisma as unknown as PrismaService,
  );

  const deps: ExecutionDependencies = {
    prisma,
    llmProvider: createHarnessLlmProvider(),
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
