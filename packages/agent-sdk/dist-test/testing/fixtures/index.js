"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextPackFixture = exports.brandProfileFixture = void 0;
exports.brandProfileFixture = {
    id: 'brand_fixture',
    companyId: 'harness_company',
    brandVoice: 'caloroso e profissional',
    niche: 'confeitaria artesanal',
    description: 'Confeitaria familiar especializada em bolos artesanais',
    targetAudience: 'famílias e amantes de doces',
    marketingObjective: 'awareness',
    mainProducts: 'bolos, tortas, doces',
    differentiators: 'receitas de família, ingredientes naturais',
    visualStyle: 'editorial clean com tons pastéis',
    palette: ['#F8E1E7', '#7A4E3B'],
    typography: 'serif elegante',
    socialNetworks: ['instagram', 'facebook'],
    logoStorageKey: null,
    logoVariants: null,
    brandAssets: null,
};
exports.contextPackFixture = {
    totalFound: 3,
    chunks: [
        {
            id: 'chunk_brand_1',
            content: 'A marca usa tom caloroso e foca em histórias de família.',
            sourceType: 'BRAND_BRAIN',
            score: 0.92,
            metadata: { title: 'Tom de voz' },
        },
        {
            id: 'chunk_learning_1',
            content: 'Posts aprovados anteriormente usaram CTAs curtos e diretos.',
            sourceType: 'AGENT_LEARNING',
            score: 0.81,
            metadata: { title: 'Aprendizado' },
        },
        {
            id: 'chunk_campaign_1',
            content: 'Campanha atual: lançamento da linha de bolos de cenoura.',
            sourceType: 'CAMPAIGN',
            score: 0.77,
            metadata: { title: 'Campanha' },
        },
    ],
    brandContext: 'Confeitaria familiar, tom caloroso.',
    learningContext: 'CTAs curtos funcionam melhor.',
    campaignContext: 'Lançamento bolo de cenoura.',
};
