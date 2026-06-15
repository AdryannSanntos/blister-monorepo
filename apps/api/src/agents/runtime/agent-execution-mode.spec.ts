import { resolveAgentExecutionMode } from './agent-execution-mode';

describe('resolveAgentExecutionMode', () => {
  it('defaults to inline-live in development', () => {
    expect(resolveAgentExecutionMode(undefined, 'development')).toBe('inline-live');
  });

  it('defaults to trigger in production', () => {
    expect(resolveAgentExecutionMode(undefined, 'production')).toBe('trigger');
  });

  it('respects explicit AGENT_EXECUTION_MODE', () => {
    expect(resolveAgentExecutionMode('inline-stub', 'production')).toBe('inline-stub');
  });

  it('uses explicit fallback when env is unset', () => {
    expect(resolveAgentExecutionMode(undefined, 'development', 'trigger')).toBe('trigger');
  });
});
