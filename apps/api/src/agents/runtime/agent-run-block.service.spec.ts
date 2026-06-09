import { Test } from '@nestjs/testing';
import { AgentRunBlockService } from './agent-run-block.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AgentRunBlockService', () => {
  const upsert = jest.fn();
  const findMany = jest.fn().mockResolvedValue([]);
  const prisma = { agentRunBlock: { upsert, findMany } } as unknown as PrismaService;
  let svc: AgentRunBlockService;
  beforeEach(async () => {
    upsert.mockClear();
    findMany.mockClear();
    const mod = await Test.createTestingModule({
      providers: [AgentRunBlockService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AgentRunBlockService);
  });
  it('upserts a block on save', async () => {
    await svc.save({ agentRunId: 'r1', messageId: 'm1', blockId: 'b1', role: 'assistant', blockType: 'text', index: 0, status: 'streaming' });
    expect(upsert).toHaveBeenCalledTimes(1);
  });
  it('appendText concatenates onto existing text', async () => {
    await svc.save({ agentRunId: 'r1', messageId: 'm1', blockId: 'b1', role: 'assistant', blockType: 'text', index: 0, status: 'streaming' });
    upsert.mockClear();
    await svc.appendText('r1', 'm1', 'b1', 'lo');
    expect(upsert).toHaveBeenCalled();
  });
  it('listByRun maps rows to DTOs with ISO createdAt', async () => {
    findMany.mockResolvedValueOnce([{ id: 'b1', agentRunId: 'r1', messageId: 'm1', role: 'assistant', blockType: 'text', index: 0, label: null, text: 'hi', payload: {}, stepKey: null, status: 'complete', createdAt: new Date(), updatedAt: new Date() }]);
    const dtos = await svc.listByRun('r1');
    expect(dtos[0].createdAt).toEqual(expect.any(String));
    expect(dtos[0].id).toBe('b1');
  });
});
