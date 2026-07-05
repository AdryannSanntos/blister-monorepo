import { normalizeSlideCopy } from './normalize-slide-copy.util';

describe('normalize-slide-copy.util', () => {
  it('applies guard, limits, and strips broken markers after truncate', () => {
    const longBody = `${'a'.repeat(215)} ==destaque`;
    const result = normalizeSlideCopy(
      {
        narrativeRole: 'scene',
        body: longBody,
        body2: '==um== e ==dois==',
      },
      { templateId: 'content-machine' },
    );

    expect(result.body?.endsWith('…')).toBe(true);
    expect(result.body).not.toContain('==');
    expect(result.body2).toBe('==um== e dois');
  });
});
