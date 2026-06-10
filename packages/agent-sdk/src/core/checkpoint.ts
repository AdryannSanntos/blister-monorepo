/**
 * A checkpoint captures the run state after a step completes so a failure in a
 * later step can resume from the last good point instead of replaying earlier
 * (and potentially expensive) steps.
 */
export interface RunCheckpoint {
  runId: string;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
  previousStepsOutput: Record<string, Record<string, unknown>>;
  createdAt: Date;
}

export interface CheckpointStore {
  saveCheckpoint(checkpoint: RunCheckpoint): Promise<void>;
  loadLatestCheckpoint(runId: string): Promise<RunCheckpoint | null>;
}

/** In-memory checkpoint store for tests and the harness. */
export const createInMemoryCheckpointStore = (): CheckpointStore & {
  checkpoints: Map<string, RunCheckpoint>;
} => {
  const checkpoints = new Map<string, RunCheckpoint>();
  return {
    checkpoints,
    saveCheckpoint: async (checkpoint) => {
      checkpoints.set(checkpoint.runId, checkpoint);
    },
    loadLatestCheckpoint: async (runId) => checkpoints.get(runId) ?? null,
  };
};
