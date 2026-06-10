"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemoryCheckpointStore = void 0;
/** In-memory checkpoint store for tests and the harness. */
const createInMemoryCheckpointStore = () => {
    const checkpoints = new Map();
    return {
        checkpoints,
        saveCheckpoint: async (checkpoint) => {
            checkpoints.set(checkpoint.runId, checkpoint);
        },
        loadLatestCheckpoint: async (runId) => checkpoints.get(runId) ?? null,
    };
};
exports.createInMemoryCheckpointStore = createInMemoryCheckpointStore;
