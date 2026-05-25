import { AgentChatOrchestratorService } from './agent-chat-orchestrator.service';

describe('AgentChatOrchestratorService', () => {
  const service = new AgentChatOrchestratorService();
  const baseInput = {
    organizationId: 'org-1',
    agentId: 'agent-1',
    userId: 'user-1',
    message: '',
  };

  it('keeps exploratory messages conversational without opening a run', async () => {
    const result = await service.orchestrateMessage({
      ...baseInput,
      message: 'quais referencias voce usaria para responder isso?',
    });

    expect(result.mode).toBe('context_retrieval');
    expect(result.createRun).toBe(false);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('keeps ambiguous operational conversation out of workflow execution', async () => {
    const result = await service.orchestrateMessage({
      ...baseInput,
      message: 'como voce estruturaria esse briefing?',
    });

    expect(result.mode).toBe('conversation');
    expect(result.createRun).toBe(false);
  });

  it('promotes final-deliverable messages into execution', async () => {
    const result = await service.orchestrateMessage({
      ...baseInput,
      message: 'gere agora o briefing final em formato de entrega',
    });

    expect(result.mode).toBe('execution');
    expect(result.createRun).toBe(true);
  });
});
