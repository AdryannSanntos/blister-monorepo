import { Prisma, type PrismaClient } from '../../src/generated/prisma';

export type AgentExecutionMode = 'inline-stub' | 'inline-live' | 'trigger';

export function getExecutionMode(): AgentExecutionMode {
  const mode = process.env.AGENT_EXECUTION_MODE ?? 'inline-stub';
  if (mode !== 'inline-stub' && mode !== 'inline-live' && mode !== 'trigger') {
    throw new Error(`Invalid AGENT_EXECUTION_MODE: ${mode}`);
  }
  return mode;
}

export interface StubLlmResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}

export interface StubEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  tokensUsed: number;
}

const STUB_RESPONSES: Record<string, StubLlmResponse> = {
  copywriter: {
    content: JSON.stringify({
      caption:
        'Descubra o sabor irresistível do nosso novo produto! 🎉 Feito com ingredientes selecionados.',
      hashtags: ['#novidade', '#qualidade', '#marketing'],
      tone: 'enthusiastic',
    }),
    tokensInput: 150,
    tokensOutput: 80,
    costUsd: 0.0002,
  },
  strategist: {
    content: JSON.stringify({
      topics: [
        {
          title: 'Lançamento do produto',
          description: 'Post de divulgação do novo produto',
          suggestedDate: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          title: 'Depoimento de cliente',
          description: 'Compartilhar feedback positivo',
          suggestedDate: new Date(Date.now() + 172800000).toISOString(),
        },
      ],
      calendar: {
        weeklyPosts: 3,
        bestTimes: ['09:00', '12:00', '18:00'],
      },
      recommendations:
        'Focus on visual content and user testimonials for higher engagement.',
    }),
    tokensInput: 200,
    tokensOutput: 150,
    costUsd: 0.0004,
  },
  designer: {
    content: JSON.stringify({
      imagePrompt:
        'Modern, vibrant product showcase with clean background and professional lighting',
      style: 'minimalist',
      colors: ['#4A90D9', '#F5F5F5', '#333333'],
    }),
    tokensInput: 120,
    tokensOutput: 60,
    costUsd: 0.0001,
  },
  cuts: {
    content: JSON.stringify({
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
    }),
    tokensInput: 400,
    tokensOutput: 200,
    costUsd: 0.0004,
  },
};

export function getStubLlmResponse(agentId: string): StubLlmResponse {
  return (
    STUB_RESPONSES[agentId] ?? {
      content: JSON.stringify({ result: 'stub response', agentId }),
      tokensInput: 100,
      tokensOutput: 50,
      costUsd: 0.0001,
    }
  );
}

export function getStubEmbedding(): StubEmbeddingResponse {
  const embedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0),
  );
  const normalizedEmbedding = embedding.map((val) => val / magnitude);

  return {
    embedding: normalizedEmbedding,
    dimensions: 1536,
    tokensUsed: 50,
  };
}

export interface InlineRunResult {
  runId: string;
  status: 'COMPLETED' | 'FAILED' | 'PAUSED';
  outputPayload: Record<string, unknown>;
  creditCost: number;
  steps: Array<{
    stepKey: string;
    status: 'COMPLETED' | 'FAILED';
    output: Record<string, unknown>;
    creditCost: number;
    llmModel: string;
    tokensInput: number;
    tokensOutput: number;
  }>;
}

export async function executeRunInline(
  prisma: PrismaClient,
  runId: string,
): Promise<InlineRunResult> {
  const mode = getExecutionMode();

  if (mode === 'trigger') {
    throw new Error(
      'inline-executor cannot be used in trigger mode. Use Trigger.dev worker instead.',
    );
  }

  const run = await prisma.agentRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      company: { include: { brandProfile: true, creditBalance: true } },
    },
  });

  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  const agentId = run.agentId;
  const stubResponse = getStubLlmResponse(agentId);
  const llmModel =
    mode === 'inline-stub'
      ? `stub/${agentId}`
      : `openrouter/openai/gpt-4o-mini`;

  const steps: InlineRunResult['steps'] = [];
  let totalCreditCost = 0;

  const stepDefinitions = [
    { key: 'retrieve_context', type: 'preparation' },
    { key: 'generate_content', type: 'llm_call' },
    { key: 'validate_output', type: 'validation' },
  ];

  for (let i = 0; i < stepDefinitions.length; i++) {
    const stepDef = stepDefinitions[i];
    const stepCreditCost = stepDef.type === 'llm_call' ? stubResponse.costUsd : 0;

    const step = await prisma.agentRunStep.create({
      data: {
        agentRunId: runId,
        stepKey: stepDef.key,
        stepIndex: i,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    const stepOutput =
      stepDef.type === 'llm_call'
        ? JSON.parse(stubResponse.content)
        : { processed: true, stepKey: stepDef.key };

    await prisma.agentRunStep.update({
      where: { id: step.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        outputPayload: stepOutput,
        creditCost: new Prisma.Decimal(stepCreditCost),
        llmModel: stepDef.type === 'llm_call' ? llmModel : null,
        tokensInput:
          stepDef.type === 'llm_call' ? stubResponse.tokensInput : null,
        tokensOutput:
          stepDef.type === 'llm_call' ? stubResponse.tokensOutput : null,
      },
    });

    if (stepCreditCost > 0 && run.companyId) {
      const creditBalance = await prisma.creditBalance.findUnique({
        where: { companyId: run.companyId },
      });

      if (creditBalance) {
        const currentBalance = Number(creditBalance.amount);
        const markupMultiplier = 1.2;
        const debitAmount = stepCreditCost * markupMultiplier;

        if (currentBalance < debitAmount) {
          await prisma.agentRun.update({
            where: { id: runId },
            data: {
              status: 'FAILED',
              errorMessage: 'Insufficient credit balance',
              completedAt: new Date(),
            },
          });

          return {
            runId,
            status: 'FAILED',
            outputPayload: { error: 'Insufficient credit balance' },
            creditCost: totalCreditCost,
            steps,
          };
        }

        const newBalance = currentBalance - debitAmount;
        await prisma.creditBalance.update({
          where: { companyId: run.companyId },
          data: { amount: new Prisma.Decimal(newBalance) },
        });

        await prisma.creditLedger.create({
          data: {
            companyId: run.companyId,
            type: 'DEBIT',
            amount: new Prisma.Decimal(debitAmount),
            balanceAfter: new Prisma.Decimal(newBalance),
            description: `Agent run step: ${stepDef.key}`,
            agentRunId: runId,
            agentRunStepId: step.id,
          },
        });

        totalCreditCost += debitAmount;
      }
    }

    steps.push({
      stepKey: stepDef.key,
      status: 'COMPLETED',
      output: stepOutput,
      creditCost: stepCreditCost,
      llmModel: stepDef.type === 'llm_call' ? llmModel : '',
      tokensInput: stepDef.type === 'llm_call' ? stubResponse.tokensInput : 0,
      tokensOutput: stepDef.type === 'llm_call' ? stubResponse.tokensOutput : 0,
    });
  }

  const outputPayload = JSON.parse(stubResponse.content);
  outputPayload.reviewStatus = 'PENDING';

  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      outputPayload,
      creditCost: new Prisma.Decimal(totalCreditCost),
    },
  });

  return {
    runId,
    status: 'COMPLETED',
    outputPayload,
    creditCost: totalCreditCost,
    steps,
  };
}
