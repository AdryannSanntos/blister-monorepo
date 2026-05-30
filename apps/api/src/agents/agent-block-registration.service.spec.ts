import { AgentBlockExecutorRegistry } from './agent-block-executor.registry';
import { AgentBlockRegistrationService } from './agent-block-registration.service';

describe('AgentBlockRegistrationService', () => {
  it('registers all phase 1 workflow block executors', () => {
    const registry = new AgentBlockExecutorRegistry();
    const service = new AgentBlockRegistrationService(
      registry,
      { createQueuedRun: jest.fn() } as never,
      { awaitRunCompletion: jest.fn() } as never,
      { generateText: jest.fn() } as never,
    );

    service.onModuleInit();

    expect(registry.has('input')).toBe(true);
    expect(registry.has('decision')).toBe(true);
    expect(registry.has('boolean')).toBe(true);
    expect(registry.has('if_else')).toBe(true);
    expect(registry.has('agent_call')).toBe(true);
    expect(registry.has('clarification')).toBe(true);
    expect(registry.has('form')).toBe(true);
    expect(registry.has('validation')).toBe(true);
    expect(registry.has('output_formatter')).toBe(true);
    expect(registry.has('finalizer')).toBe(true);
  });
});
