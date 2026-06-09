import { describe, expect, it } from 'vitest';
import {
  agentRunEventTypeSchema,
  blockTypeSchema,
  agentRunBlockDtoSchema,
  blockStartEventDataSchema,
  blockDeltaEventDataSchema,
} from '@company-os/types';

describe('block contracts', () => {
  it('accepts new lifecycle + block events', () => {
    for (const t of ['message_start', 'block_start', 'block_delta', 'block_end', 'message_end']) {
      expect(agentRunEventTypeSchema.safeParse(t).success).toBe(true);
    }
  });
  it('enumerates all block types', () => {
    for (const t of ['thinking', 'searching_context', 'planning', 'working', 'text', 'form_question', 'output', 'error']) {
      expect(blockTypeSchema.safeParse(t).success).toBe(true);
    }
  });
  it('validates block_start data', () => {
    expect(blockStartEventDataSchema.safeParse({ messageId: 'm1', blockId: 'b1', blockType: 'thinking', index: 0 }).success).toBe(true);
    expect(blockStartEventDataSchema.safeParse({ messageId: 'm1', blockId: 'b1', blockType: 'nope', index: 0 }).success).toBe(false);
  });
  it('validates block_delta data', () => {
    expect(blockDeltaEventDataSchema.safeParse({ messageId: 'm1', blockId: 'b1', delta: 'oi' }).success).toBe(true);
  });
  it('validates an AgentRunBlockDto', () => {
    expect(agentRunBlockDtoSchema.safeParse({
      id: 'x', messageId: 'm1', role: 'assistant', blockType: 'text',
      index: 0, label: null, text: 'hi', payload: {}, stepKey: null,
      status: 'complete', createdAt: new Date().toISOString(),
    }).success).toBe(true);
  });
});
