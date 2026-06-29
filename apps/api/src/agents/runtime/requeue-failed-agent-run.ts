import type { PrismaClient } from '@company-os/db';

/** Re-queues a failed agent run so Trigger.dev can retry execution from the failed step. */
export const requeueFailedAgentRun = async (
  prisma: PrismaClient,
  runId: string,
): Promise<void> => {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { status: true },
  });

  if (!run || run.status !== 'FAILED') return;

  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: 'QUEUED',
      errorMessage: null,
      completedAt: null,
    },
  });
};
