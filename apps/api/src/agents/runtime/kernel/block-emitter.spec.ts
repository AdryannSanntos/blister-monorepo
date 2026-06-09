import { BlockEmitter } from './block-emitter';

const makeDeps = () => {
  const events: any[] = [];
  const publisher = { publish: jest.fn(async (e: any) => { events.push(e); }) };
  const blocks = { save: jest.fn(), appendText: jest.fn(), finalize: jest.fn() };
  return { events, publisher, blocks };
};

describe('BlockEmitter', () => {
  it('streams a thinking block: start, deltas, end (with batching flush)', async () => {
    const { events, publisher, blocks } = makeDeps();
    const em = new BlockEmitter({ runId: 'r1', agentId: 'post', companyId: 'c1', publisher: publisher as any, blocks: blocks as any });
    const msg = em.openMessage('assistant');
    const t = msg.thinking();
    t.delta('pen'); t.delta('sando ');
    await t.end();
    await msg.end();
    const types = events.map((e) => e.type);
    expect(types[0]).toBe('message_start');
    expect(types[1]).toBe('block_start');
    expect(types).toContain('block_delta');
    expect(types[types.length - 2]).toBe('block_end');
    expect(types[types.length - 1]).toBe('message_end');
    expect(blocks.save).toHaveBeenCalled();
    expect(blocks.finalize).toHaveBeenCalledWith('r1', expect.any(String), expect.any(String), 'complete', undefined);
  });

  it('emits a discrete searching block with payload', async () => {
    const { events } = makeDeps();
    const blocks = { save: jest.fn(), appendText: jest.fn(), finalize: jest.fn() };
    const publisher = { publish: jest.fn(async (e: any) => { events.push(e); }) };
    const em = new BlockEmitter({ runId: 'r1', agentId: 'post', companyId: 'c1', publisher: publisher as any, blocks: blocks as any });
    const msg = em.openMessage('assistant');
    await msg.searching({ resultsCount: 3 }, 'Consultando o Cérebro da Marca');
    const start = events.find((e) => e.type === 'block_start');
    const end = events.find((e) => e.type === 'block_end');
    expect(start.data.blockType).toBe('searching_context');
    expect(start.data.label).toBe('Consultando o Cérebro da Marca');
    expect(end.data.payload).toEqual({ resultsCount: 3 });
    expect(end.data.status).toBe('complete');
  });

  it('emits an error block', async () => {
    const { events } = makeDeps();
    const em = new BlockEmitter({ runId: 'r1', agentId: 'post', companyId: 'c1', publisher: { publish: jest.fn(async (e:any)=>{events.push(e);}) } as any, blocks: { save: jest.fn(), appendText: jest.fn(), finalize: jest.fn() } as any });
    const msg = em.openMessage('assistant');
    await msg.error('Não foi possível concluir a geração.');
    const end = events.find((e) => e.type === 'block_end');
    const start = events.find((e) => e.type === 'block_start');
    expect(start.data.blockType).toBe('error');
    expect(end.data.status).toBe('error');
    expect(end.data.payload).toEqual({ message: 'Não foi possível concluir a geração.' });
  });

  it('assigns deterministic, ordered ids and indexes per message', async () => {
    const { events } = makeDeps();
    const em = new BlockEmitter({ runId: 'r1', agentId: 'post', companyId: 'c1', publisher: { publish: jest.fn(async (e:any)=>{events.push(e);}) } as any, blocks: { save: jest.fn(), appendText: jest.fn(), finalize: jest.fn() } as any });
    const msg = em.openMessage('assistant');
    await msg.searching({}, 'a');
    await msg.planning({});
    const starts = events.filter((e) => e.type === 'block_start');
    expect(starts[0].data.index).toBe(0);
    expect(starts[1].data.index).toBe(1);
    expect(starts[0].data.messageId).toBe(starts[1].data.messageId);
    expect(starts[0].data.blockId).not.toBe(starts[1].data.blockId);
  });
});
