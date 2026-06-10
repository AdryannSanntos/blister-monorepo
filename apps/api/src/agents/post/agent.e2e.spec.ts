import { AgentTestHarness, assertMatchesSchema, brandProfileFixture } from '@company-os/agent-sdk';
import { postAgent } from './agent';
import { postDesignPlanZod } from './schemas/design-plan.schema';
import { postOutputZod } from './schemas/output.schema';

const designPlan = {
  creativeDirection: 'Post de lançamento caloroso destacando o bolo de cenoura artesanal.',
  brandVisualStyle: 'Editorial clean com tons pastéis e fotografia aconchegante.',
  aestheticLanguage: 'editorial' as const,
  compositionSystem: 'Grid de 12 colunas com respiro generoso e foco central.',
  brandPresence: 'signature' as const,
  typography: {
    primaryFont: 'Playfair Display',
    headlineScale: '48-64px',
    bodyScale: '18-20px',
    rules: 'Títulos em serif, corpo em sans-serif, alto contraste.',
  },
  colorStrategy: {
    backgroundType: 'solid' as const,
    primaryBackground: '#F8E1E7',
    textColor: '#7A4E3B',
    useGradient: false,
  },
  slides: [
    {
      index: 1,
      role: 'cover' as const,
      headline: 'Novo bolo de cenoura artesanal',
      compositionLayout: 'Headline centralizada com foto do bolo ao fundo.',
      backgroundTreatment: 'Cor sólida pastel com leve textura.',
      visualElements: ['foto do bolo', 'logo discreto'],
    },
  ],
  guardrails: ['Manter contraste alto', 'Não sobrecarregar o slide', 'Respeitar a paleta da marca'],
  qualityChecklist: [
    'Headline legível',
    'Paleta consistente',
    'Logo presente',
    'CTA claro quando aplicável',
  ],
};

const analysisResponse = {
  intent: 'Post de lançamento do bolo de cenoura para Instagram',
  confidence: 0.95,
  reasoning: 'Rede, formato e objetivo explícitos no pedido.',
  suggestedPath: 'quick',
  extracted: {
    socialNetwork: { value: 'instagram', confidence: 'high', evidence: 'para o Instagram' },
    postFormat: { value: 'single', confidence: 'high', evidence: 'imagem única' },
    objective: { value: 'promo', confidence: 'high', evidence: 'lançamento' },
  },
  missingFields: [],
  skippedFieldNames: ['socialNetwork', 'postFormat', 'objective'],
  enrichedBrief: { tone: 'caloroso', narrativeAngle: 'negócio familiar' },
};

const postOutput = {
  slides: [{ html: '<section><h1>Novo bolo de cenoura artesanal</h1></section>' }],
  caption: 'Chegou o nosso novo bolo de cenoura artesanal — feito com carinho de família! 🥕',
  hashtags: ['bolo', 'cenoura', 'confeitaria'],
};

describe('post agent (e2e in-memory)', () => {
  it('analysis is a valid design plan fixture', () => {
    assertMatchesSchema(designPlan, postDesignPlanZod);
  });

  it('runs the full pipeline: skips brief, pauses on approval, resumes to a valid post', async () => {
    const harness = AgentTestHarness.forAgent(postAgent)
      .withContext({ brandProfile: brandProfileFixture })
      .withLlmResponses({
        collect_brief: analysisResponse,
        plan_design: designPlan,
        generate_post: postOutput,
      });

    const paused = await harness.runUntilPaused({
      userInput: 'post de lançamento do bolo de cenoura para o Instagram, imagem única',
    });

    expect(paused.status).toBe('PAUSED');
    expect(paused.pauseFormSchema).toEqual({ type: 'design_plan_approval' });

    const completed = await harness.resume({ designPlanApproved: true }).run();

    expect(completed.status).toBe('COMPLETED');
    assertMatchesSchema(completed.output, postOutputZod);
    expect(completed.output?.platform).toBe('Instagram');
    expect(completed.output?.format).toBe('single');
    expect(Array.isArray(completed.output?.slides)).toBe(true);
  });
});
