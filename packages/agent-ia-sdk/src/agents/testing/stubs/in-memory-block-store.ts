import type { AgentRunBlockDto } from '@company-os/types';
import type { AgentRunBlockServiceLike } from '../../stream';

export interface InMemoryBlockStore extends AgentRunBlockServiceLike {
  blocks: AgentRunBlockDto[];
}

/** In-memory BlockStore that records every block emitted during a run. */
export const createInMemoryBlockStore = (): InMemoryBlockStore => {
  const blocks: AgentRunBlockDto[] = [];

  const find = (messageId: string, blockId: string): AgentRunBlockDto | undefined =>
    blocks.find((b) => b.messageId === messageId && b.id === blockId);

  return {
    blocks,
    save: async (input) => {
      blocks.push({
        id: input.blockId,
        messageId: input.messageId,
        role: input.role,
        blockType: input.blockType as AgentRunBlockDto['blockType'],
        index: input.index,
        label: input.label ?? null,
        text: input.text ?? null,
        payload: input.payload ?? {},
        stepKey: input.stepKey ?? null,
        status: input.status,
        createdAt: new Date().toISOString(),
      });
    },
    appendText: async (_runId, messageId, blockId, delta) => {
      const block = find(messageId, blockId);
      if (block) block.text = `${block.text ?? ''}${delta}`;
    },
    finalize: async (_runId, messageId, blockId, status, payload) => {
      const block = find(messageId, blockId);
      if (block) {
        block.status = status;
        if (payload) block.payload = payload;
      }
    },
    listByRun: async () => [...blocks],
  };
};
