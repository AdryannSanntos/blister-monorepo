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

  it('derives cta keyword fallback', () => {
    const result: TruncatableSlideCopy = applyCopyLimits({
      narrativeRole: 'cta',
      callToAction: 'Salve para revisar amanhã',
    });

    expect(result.ctaKeyword).toBeTruthy();
  });
});
