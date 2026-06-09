import { normalizeDesignPlanInput } from './design-plan.normalize';

describe('normalizeDesignPlanInput', () => {
  it('normalizes enum aliases and fills missing slide fields', () => {
    const plan = normalizeDesignPlanInput(
      {
        creativeDirection: '  Post premium para lançamento  ',
        brandVisualStyle: 'Moderno e vibrante com foco em produto',
        aestheticLanguage: 'Minimalist',
        compositionSystem: 'Grid editorial',
        brandPresence: 'protagonista',
        typography: {
          primaryFont: 'Inter',
          rules: 'Headline grande, corpo legível',
        },
        colorStrategy: {
          backgroundType: 'solido',
          primaryBackground: '#111111',
          textColor: '#FFFFFF',
          useGradient: false,
        },
        slides: [
          {
            role: 'capa',
            headline: 'Lançamento especial',
            compositionLayout: 'Hero centralizado',
            backgroundTreatment: 'Fundo escuro da marca',
          },
        ],
      },
      2,
    );

    expect(plan).not.toBeNull();
    expect(plan?.brandVisualStyle).toBe('Moderno e vibrante com foco em produto');
    expect(plan?.aestheticLanguage).toBe('minimalista');
    expect(plan?.brandPresence).toBe('protagonist');
    expect(plan?.colorStrategy.backgroundType).toBe('solid');
    expect(plan?.slides).toHaveLength(2);
    expect(plan?.slides[1]?.role).toBe('closing');
  });

  it('returns null when slides are missing headlines', () => {
    const plan = normalizeDesignPlanInput(
      {
        creativeDirection: 'Direção criativa',
        slides: [{ role: 'cover', headline: '' }],
      },
      1,
    );

    expect(plan).toBeNull();
  });
});
