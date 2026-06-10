import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type AgentRunBlockServiceLike, BlockEmitter, type EventPublisher } from './index';

const makeDeps = () => {
  const events: Array<{ type: string; data: Record<string, unknown> }> = [];
  const publisher: EventPublisher = {
    publish: async (event) => {
      events.push({ type: event.type, data: event.data });
    },
  };
  const blocks: AgentRunBlockServiceLike = {
    save: async () => {},
    appendText: async () => {},
    finalize: async () => {},
    listByRun: async () => [],
  };

  return { events, publisher, blocks };
};

describe('BlockEmitter', () => {
  it('streams a thinking block: start, deltas, end', async () => {
    const { events, publisher, blocks } = makeDeps();
    const emitter = new BlockEmitter({
      runId: 'r1',
      agentId: 'post',
      companyId: 'c1',
      publisher,
      blocks,
    });
    const message = emitter.openMessage('assistant');
    const thinking = message.thinking();
    thinking.delta('pen');
    thinking.delta('sando ');
    await thinking.end();
    await message.end();

    const types = events.map((event) => event.type);
    assert.equal(types[0], 'message_start');
    assert.equal(types[1], 'block_start');
    assert.ok(types.includes('block_delta'));
    assert.equal(types.at(-2), 'block_end');
    assert.equal(types.at(-1), 'message_end');
  });

  it('emits a discrete searching block with payload', async () => {
    const { events, publisher, blocks } = makeDeps();
    const emitter = new BlockEmitter({
      runId: 'r1',
      agentId: 'post',
      companyId: 'c1',
      publisher,
      blocks,
    });
    const message = emitter.openMessage('assistant');
    await message.searching({ resultsCount: 3 }, 'Consultando o Cérebro da Marca');

    const start = events.find((event) => event.type === 'block_start');
    const end = events.find((event) => event.type === 'block_end');
    assert.equal(start?.data.blockType, 'searching_context');
    assert.equal(start?.data.label, 'Consultando o Cérebro da Marca');
    assert.deepEqual(end?.data.payload, { resultsCount: 3 });
    assert.equal(end?.data.status, 'complete');
  });

  it('seeds messageId from messageStartIndex', async () => {
    const { events, publisher, blocks } = makeDeps();
    const emitter = new BlockEmitter({
      runId: 'r1',
      agentId: 'post',
      companyId: 'c1',
      publisher,
      blocks,
      messageStartIndex: 2,
    });
    const message = emitter.openMessage('assistant');
    await message.searching({}, 'a');
    const start = events.find((event) => event.type === 'block_start');
    assert.equal(start?.data.messageId, 'r1:m2');
  });

  it('ensureOutput skips duplicate output blocks', async () => {
    const { events, publisher, blocks } = makeDeps();
    const emitter = new BlockEmitter({
      runId: 'r1',
      agentId: 'post',
      companyId: 'c1',
      publisher,
      blocks,
    });
    const message = emitter.openMessage('assistant');
    await message.output({ caption: 'first' });
    await message.ensureOutput({ caption: 'second' });
    const outputStarts = events.filter(
      (event) => event.type === 'block_start' && event.data.blockType === 'output',
    );
    assert.equal(outputStarts.length, 1);
  });
});
