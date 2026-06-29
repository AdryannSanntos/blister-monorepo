import { applyCopyLimits, type TruncatableSlideCopy } from './copy-limits.util';

describe('copy-limits.util', () => {
  it('truncates hook subtitle and clears body', () => {
    const result = applyCopyLimits({
      narrativeRole: 'hook',
      subtitle: 'a'.repeat(150),
      body: 'should be removed',
    });

    expect(result.subtitle?.length).toBeLessThanOrEqual(120);
    expect(result.body).toBeUndefined();
  });

  it('limits framework list items to four', () => {
    const result = applyCopyLimits({
      narrativeRole: 'framework',
      listItems: ['1', '2', '3', '4', '5'],
    });

    expect(result.listItems).toHaveLength(4);
  });

  it('limits each content-machine text block to 160 chars', () => {
    const result = applyCopyLimits(
      {
        narrativeRole: 'scene',
        body: 'a'.repeat(200),
        body2: 'b'.repeat(200),
        subtitle: 'c'.repeat(200),
      },
      { templateId: 'content-machine' },
    );

    expect(result.body).toBe(`${'a'.repeat(159)}…`);
    expect(result.body2).toBe(`${'b'.repeat(159)}…`);
    expect(result.subtitle).toBe(`${'c'.repeat(159)}…`);
  });

  it('keeps editorial body limit at 280 chars', () => {
    const longBody = 'a'.repeat(300);
    const result = applyCopyLimits(
      {
        narrativeRole: 'scene',
        body: longBody,
      },
      { templateId: 'editorial-performance' },
    );

    expect(result.body).toBe(`${'a'.repeat(279)}…`);
  });
});
