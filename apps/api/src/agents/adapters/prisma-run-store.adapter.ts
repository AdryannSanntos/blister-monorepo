import type { RunStore, StoredRun } from '@company-os/agent-ia-sdk/agents';
import { Prisma, type PrismaClient } from '@company-os/db';

const runInclude = {
  steps: { orderBy: { stepIndex: 'asc' as const } },
} as const;

type RunWithRelations = Prisma.AgentRunGetPayload<{ include: typeof runInclude }>;

const mapRun = (run: RunWithRelations): StoredRun => ({
  id: run.id,
  agentId: run.agentId,
  // The SDK uses companyId as an opaque workspace-scope id (label/retrieval key).
  // Personal-space runs have no company, so we surface the personal space id.
  companyId: run.companyId ?? run.personalSpaceId ?? '',
  campaignId: null,
  status: run.status as StoredRun['status'],
  currentStepKey: run.currentStepKey,
  inputPayload: run.inputPayload as Record<string, unknown>,
  outputPayload: run.outputPayload as Record<string, unknown>,
  errorMessage: run.errorMessage,
  creditCost: Number(run.creditCost),
  startedAt: run.startedAt,
  steps: run.steps.map((step) => ({
    id: step.id,
    stepKey: step.stepKey,
    stepIndex: step.stepIndex,
    status: step.status,
    outputPayload: step.outputPayload as Record<string, unknown>,
  })),
});

export const createPrismaRunStore = (prisma: PrismaClient): RunStore => ({
  async findRun(runId) {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: runInclude,
    });
    return run ? mapRun(run) : null;
  },

  async mergeInputPayload(runId, formData) {
    const existing = await prisma.agentRun.findUniqueOrThrow({
      where: { id: runId },
      include: runInclude,
    });
    const mergedInput = {
      ...(existing.inputPayload as Record<string, unknown>),
      ...formData,
    };
    const updated = await prisma.agentRun.update({
      where: { id: runId },
      data: { inputPayload: JSON.parse(JSON.stringify(mergedInput)) },
      include: runInclude,
    });
    return mapRun(updated);
  },

  async getCompletedStepOutputs(runId) {
    const steps = await prisma.agentRunStep.findMany({
      where: {
        agentRunId: runId,
        status: 'COMPLETED',
        NOT: { resultType: 'PAUSED' },
      },
      orderBy: { stepIndex: 'asc' },
    });

    const output: Record<string, Record<string, unknown>> = {};
    for (const step of steps) {
      output[step.stepKey] = step.outputPayload as Record<string, unknown>;
    }
    return output;
  },

  async claimRunForExecution(runId, startedAt) {
    const fromQueued = await prisma.agentRun.updateMany({
      where: { id: runId, status: 'QUEUED' },
      data: {
        status: 'RUNNING',
        startedAt: startedAt ?? new Date(),
      },
    });

    if (fromQueued.count > 0) {
      const run = await prisma.agentRun.findUnique({
        where: { id: runId },
        include: runInclude,
      });
      return run ? mapRun(run) : null;
    }

    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: runInclude,
    });

    if (!run || run.status !== 'RUNNING') return null;

    const hasActiveStep = run.steps.some((step) => step.status === 'RUNNING');
    if (hasActiveStep) return null;

    return mapRun(run);
  },

  async getRunStatus(runId) {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      select: { status: true },
    });
    return run ? (run.status as StoredRun['status']) : null;
  },

  async setRunRunning(runId, startedAt) {
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        startedAt: startedAt ?? new Date(),
      },
    });
  },

  async setCurrentStepKey(runId, stepKey) {
    await prisma.agentRun.update({
      where: { id: runId },
      data: { currentStepKey: stepKey },
    });
  },

  async startStep(params) {
    if (params.existingStepId) {
      await prisma.agentRunStep.update({
        where: { id: params.existingStepId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          inputPayload: JSON.parse(JSON.stringify(params.inputPayload)),
        },
      });
      return { stepId: params.existingStepId };
    }

    const created = await prisma.agentRunStep.create({
      data: {
        agentRunId: params.runId,
        stepKey: params.stepKey,
        stepIndex: params.stepIndex,
        status: 'RUNNING',
        startedAt: new Date(),
        inputPayload: JSON.parse(JSON.stringify(params.inputPayload)),
      },
    });
    return { stepId: created.id };
  },

  async completeStep(params) {
    await prisma.agentRunStep.update({
      where: { id: params.stepId },
      data: {
        status: params.failed ? 'FAILED' : params.paused ? 'PENDING' : 'COMPLETED',
        resultType: params.resultType,
        outputPayload: JSON.parse(JSON.stringify(params.output)),
        errorMessage: params.error,
        llmModel: params.llmModel,
        tokensInput: params.tokensInput,
        tokensOutput: params.tokensOutput,
        creditCost: new Prisma.Decimal(params.creditCost),
        completedAt: new Date(),
      },
    });
  },

  async pauseRun(params) {
    await prisma.agentRun.update({
      where: { id: params.runId },
      data: {
        status: 'PAUSED',
        pauseReason: params.pauseReason,
        pauseFormSchema: params.pauseFormSchema
          ? JSON.parse(JSON.stringify(params.pauseFormSchema))
          : undefined,
        outputPayload: params.outputPayload
          ? JSON.parse(JSON.stringify(params.outputPayload))
          : undefined,
        creditCost: new Prisma.Decimal(params.creditCost),
      },
    });
  },

  async failRun(params) {
    await prisma.agentRun.update({
      where: { id: params.runId },
      data: {
        status: 'FAILED',
        errorMessage: params.errorMessage,
        creditCost: new Prisma.Decimal(params.creditCost),
        completedAt: new Date(),
      },
    });
  },

  async completeRun(params) {
    await prisma.agentRun.update({
      where: { id: params.runId },
      data: {
        status: 'COMPLETED',
        outputPayload: JSON.parse(JSON.stringify(params.outputPayload)),
        creditCost: new Prisma.Decimal(params.creditCost),
        completedAt: new Date(),
      },
    });
  },
});
