import { OpenRouterAdapter } from './openrouter.adapter';

describe('OpenRouterAdapter.extractStreamDelta', () => {
  it('extracts the incremental content from a streamed chunk', () => {
    const payload = JSON.stringify({ choices: [{ delta: { content: 'Ola' } }] });
    expect(OpenRouterAdapter.extractStreamDelta(payload)).toBe('Ola');
  });

  it('returns null for the [DONE] sentinel', () => {
    expect(OpenRouterAdapter.extractStreamDelta('[DONE]')).toBeNull();
  });

  it('returns null for a role-only opening chunk with no content', () => {
    const payload = JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] });
    expect(OpenRouterAdapter.extractStreamDelta(payload)).toBeNull();
  });

  it('returns null for an empty-content chunk instead of emitting an empty delta', () => {
    const payload = JSON.stringify({ choices: [{ delta: { content: '' } }] });
    expect(OpenRouterAdapter.extractStreamDelta(payload)).toBeNull();
  });

  it('returns null for malformed JSON rather than throwing', () => {
    expect(OpenRouterAdapter.extractStreamDelta('{not json')).toBeNull();
  });

  it('preserves whitespace inside a content delta (tokens often start with a space)', () => {
    const payload = JSON.stringify({ choices: [{ delta: { content: ' mundo' } }] });
    expect(OpenRouterAdapter.extractStreamDelta(payload)).toBe(' mundo');
  });
});
