import { resolveAgentExecutionMode } from './agent-execution-mode';

describe('resolveAgentExecutionMode', () => {
  it('defaults to trigger', () => {
    expect(resolveAgentExecutionMode(undefined)).toBe('trigger');
  });

  it('accepts explicit trigger mode', () => {
    expect(resolveAgentExecutionMode('trigger')).toBe('trigger');
  });

  it('rejects legacy inline modes', () => {
    expect(() => resolveAgentExecutionMode('inline-stub')).toThrow(/Unsupported/);
    expect(() => resolveAgentExecutionMode('inline-live')).toThrow(/Unsupported/);
  });
});
