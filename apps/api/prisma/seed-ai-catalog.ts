import { Prisma, type PrismaClient } from '../src/generated/prisma';

export type SeedModelDefinition = {
  externalId: string;
  name: string;
  inputCostPer1k: string;
  outputCostPer1k: string;
  capabilities: string[];
  isEnabled?: boolean;
};

const DEFAULT_INPUT_COST = '0.000100';
const DEFAULT_OUTPUT_COST = '0.000400';

export const ASSEMBLYAI_MODELS: SeedModelDefinition[] = [
  { externalId: 'claude-opus-4-7', name: 'Claude Opus 4.7', inputCostPer1k: '0.005000', outputCostPer1k: '0.025000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-opus-4-6', name: 'Claude Opus 4.6', inputCostPer1k: '0.005000', outputCostPer1k: '0.025000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', inputCostPer1k: '0.003000', outputCostPer1k: '0.015000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', inputCostPer1k: '0.005000', outputCostPer1k: '0.025000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', inputCostPer1k: '0.003000', outputCostPer1k: '0.015000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', inputCostPer1k: '0.001000', outputCostPer1k: '0.005000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-opus-4-20250514', name: 'Claude Opus 4', inputCostPer1k: '0.005000', outputCostPer1k: '0.025000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', inputCostPer1k: '0.003000', outputCostPer1k: '0.015000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-5.2', name: 'GPT-5.2', inputCostPer1k: '0.002000', outputCostPer1k: '0.008000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-5.1', name: 'GPT-5.1', inputCostPer1k: '0.002000', outputCostPer1k: '0.008000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-5', name: 'GPT-5', inputCostPer1k: '0.002000', outputCostPer1k: '0.008000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-5-nano', name: 'GPT-5 Nano', inputCostPer1k: '0.000100', outputCostPer1k: '0.000400', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-5-mini', name: 'GPT-5 Mini', inputCostPer1k: '0.000300', outputCostPer1k: '0.001200', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-4.1', name: 'GPT-4.1', inputCostPer1k: '0.002000', outputCostPer1k: '0.008000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-oss-120b', name: 'GPT-OSS 120B', inputCostPer1k: '0.000200', outputCostPer1k: '0.000800', capabilities: ['text'] },
  { externalId: 'gpt-oss-20b', name: 'GPT-OSS 20B', inputCostPer1k: '0.000100', outputCostPer1k: '0.000400', capabilities: ['text'] },
  { externalId: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', inputCostPer1k: '0.000100', outputCostPer1k: '0.000400', capabilities: ['text', 'structured_output'] },
  { externalId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', inputCostPer1k: '0.001250', outputCostPer1k: '0.005000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', inputCostPer1k: '0.000075', outputCostPer1k: '0.000300', capabilities: ['text', 'structured_output'] },
  { externalId: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', inputCostPer1k: '0.000050', outputCostPer1k: '0.000200', capabilities: ['text', 'structured_output'] },
  { externalId: 'qwen3-next-80b-a3b', name: 'Qwen3 Next 80B', inputCostPer1k: '0.000200', outputCostPer1k: '0.000800', capabilities: ['text'] },
  { externalId: 'qwen3-32B', name: 'Qwen3 32B', inputCostPer1k: '0.000150', outputCostPer1k: '0.000600', capabilities: ['text'] },
  { externalId: 'kimi-k2.5', name: 'Kimi K2.5', inputCostPer1k: '0.000200', outputCostPer1k: '0.000800', capabilities: ['text'] },
];

export const GEMINI_MODELS: SeedModelDefinition[] = [
  { externalId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', inputCostPer1k: '0.000075', outputCostPer1k: '0.000300', capabilities: ['text', 'structured_output'] },
  { externalId: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash (Image)', inputCostPer1k: '0.000100', outputCostPer1k: '0.000400', capabilities: ['image'] },
  { externalId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', inputCostPer1k: '0.001250', outputCostPer1k: '0.005000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', inputCostPer1k: '0.000050', outputCostPer1k: '0.000200', capabilities: ['text', 'structured_output'] },
  { externalId: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', inputCostPer1k: '0.000100', outputCostPer1k: '0.000400', capabilities: ['text', 'structured_output'] },
  { externalId: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', inputCostPer1k: '0.000050', outputCostPer1k: '0.000200', capabilities: ['text', 'structured_output'] },
  { externalId: 'gemini-embedding-001', name: 'Gemini Embedding', inputCostPer1k: '0.000025', outputCostPer1k: '0.000000', capabilities: ['embedding'] },
];

export const OPENAI_MODELS: SeedModelDefinition[] = [
  { externalId: 'gpt-4o', name: 'GPT-4o', inputCostPer1k: '0.002500', outputCostPer1k: '0.010000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-4o-mini', name: 'GPT-4o Mini', inputCostPer1k: '0.000150', outputCostPer1k: '0.000600', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-4.1', name: 'GPT-4.1', inputCostPer1k: '0.002000', outputCostPer1k: '0.008000', capabilities: ['text', 'structured_output'] },
  { externalId: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', inputCostPer1k: '0.000400', outputCostPer1k: '0.001600', capabilities: ['text', 'structured_output'] },
  { externalId: 'o3-mini', name: 'o3 Mini', inputCostPer1k: '0.001100', outputCostPer1k: '0.004400', capabilities: ['text', 'structured_output'] },
  { externalId: 'text-embedding-3-small', name: 'Text Embedding 3 Small', inputCostPer1k: '0.000020', outputCostPer1k: '0.000000', capabilities: ['embedding'] },
  { externalId: 'text-embedding-3-large', name: 'Text Embedding 3 Large', inputCostPer1k: '0.000130', outputCostPer1k: '0.000000', capabilities: ['embedding'] },
  { externalId: 'dall-e-3', name: 'DALL·E 3', inputCostPer1k: '0.040000', outputCostPer1k: '0.000000', capabilities: ['image'] },
];

export const ANTHROPIC_MODELS: SeedModelDefinition[] = [
  { externalId: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', inputCostPer1k: '0.003000', outputCostPer1k: '0.015000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', inputCostPer1k: '0.001000', outputCostPer1k: '0.005000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', inputCostPer1k: '0.005000', outputCostPer1k: '0.025000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', inputCostPer1k: '0.003000', outputCostPer1k: '0.015000', capabilities: ['text', 'structured_output'] },
  { externalId: 'claude-opus-4-20250514', name: 'Claude Opus 4', inputCostPer1k: '0.005000', outputCostPer1k: '0.025000', capabilities: ['text', 'structured_output'] },
];

const OPENROUTER_FALLBACK_MODELS: SeedModelDefinition[] = [
  { externalId: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', inputCostPer1k: '0.000150', outputCostPer1k: '0.000600', capabilities: ['text', 'structured_output'] },
  { externalId: 'openai/gpt-4o', name: 'GPT-4o', inputCostPer1k: '0.002500', outputCostPer1k: '0.010000', capabilities: ['text', 'structured_output'] },
  { externalId: 'openai/text-embedding-3-small', name: 'Text Embedding 3 Small', inputCostPer1k: '0.000020', outputCostPer1k: '0.000000', capabilities: ['embedding'] },
  { externalId: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', inputCostPer1k: '0.003000', outputCostPer1k: '0.015000', capabilities: ['text', 'structured_output'] },
  { externalId: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', inputCostPer1k: '0.000075', outputCostPer1k: '0.000300', capabilities: ['text', 'structured_output'] },
];

function inferOpenRouterCapabilities(model: {
  id: string;
  architecture?: { output_modalities?: string[]; input_modalities?: string[] };
}): string[] {
  const outputModalities = model.architecture?.output_modalities ?? [];
  const inputModalities = model.architecture?.input_modalities ?? [];
  const capabilities = new Set<string>();

  if (
    outputModalities.includes('image') ||
    model.id.includes('image') ||
    model.id.includes('dall-e')
  ) {
    capabilities.add('image');
  }

  if (
    model.id.includes('embedding') ||
    inputModalities.includes('embedding') ||
    model.id.includes('embed')
  ) {
    capabilities.add('embedding');
  }

  if (capabilities.size === 0) {
    capabilities.add('text');
    capabilities.add('structured_output');
  }

  return [...capabilities];
}

function inferGeminiCapabilities(model: {
  name: string;
  supportedGenerationMethods?: string[];
}): string[] {
  const externalId = model.name.replace(/^models\//, '');
  const methods = model.supportedGenerationMethods ?? [];
  const capabilities = new Set<string>();

  if (externalId.includes('embedding') || methods.includes('embedContent')) {
    capabilities.add('embedding');
  }

  if (
    externalId.includes('image') ||
    externalId.includes('imagen') ||
    methods.includes('predict')
  ) {
    capabilities.add('image');
  }

  if (capabilities.size === 0) {
    capabilities.add('text');
    if (methods.includes('generateContent')) {
      capabilities.add('structured_output');
    }
  }

  return [...capabilities];
}

export async function fetchGeminiModels(): Promise<SeedModelDefinition[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return GEMINI_MODELS;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );

    if (!response.ok) {
      console.warn(`  ⚠ Gemini models API returned ${response.status}, using static list`);
      return GEMINI_MODELS;
    }

    const payload = (await response.json()) as {
      models?: Array<{
        name: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }>;
    };

    const models = payload.models ?? [];
    if (models.length === 0) {
      return GEMINI_MODELS;
    }

    return models.map((model) => {
      const externalId = model.name.replace(/^models\//, '');
      return {
        externalId,
        name: model.displayName ?? externalId,
        inputCostPer1k: DEFAULT_INPUT_COST,
        outputCostPer1k: DEFAULT_OUTPUT_COST,
        capabilities: inferGeminiCapabilities(model),
      };
    });
  } catch (error) {
    console.warn('  ⚠ Failed to fetch Gemini models, using static list', error);
    return GEMINI_MODELS;
  }
}

export async function fetchOpenRouterModels(): Promise<SeedModelDefinition[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return OPENROUTER_FALLBACK_MODELS;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.warn(`  ⚠ OpenRouter models API returned ${response.status}, using fallback list`);
      return OPENROUTER_FALLBACK_MODELS;
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        pricing?: { prompt?: string; completion?: string };
        architecture?: { output_modalities?: string[]; input_modalities?: string[] };
      }>;
    };

    const models = payload.data ?? [];
    if (models.length === 0) {
      return OPENROUTER_FALLBACK_MODELS;
    }

    return models.map((model) => ({
      externalId: model.id,
      name: model.name ?? model.id,
      inputCostPer1k: model.pricing?.prompt ?? DEFAULT_INPUT_COST,
      outputCostPer1k: model.pricing?.completion ?? DEFAULT_OUTPUT_COST,
      capabilities: inferOpenRouterCapabilities(model),
    }));
  } catch (error) {
    console.warn('  ⚠ Failed to fetch OpenRouter models, using fallback list', error);
    return OPENROUTER_FALLBACK_MODELS;
  }
}

async function upsertProviderModels(
  prisma: PrismaClient,
  providerId: string,
  models: SeedModelDefinition[],
  providerEnabled: boolean,
): Promise<Map<string, string>> {
  const modelIds = new Map<string, string>();

  for (const model of models) {
    const isEnabled = model.isEnabled ?? providerEnabled;
    const record = await prisma.aiModel.upsert({
      where: {
        providerId_externalId: {
          providerId,
          externalId: model.externalId,
        },
      },
      update: {
        name: model.name,
        isEnabled,
        inputCostPer1k: new Prisma.Decimal(model.inputCostPer1k),
        outputCostPer1k: new Prisma.Decimal(model.outputCostPer1k),
        capabilities: [...model.capabilities],
      },
      create: {
        providerId,
        externalId: model.externalId,
        name: model.name,
        isEnabled,
        inputCostPer1k: new Prisma.Decimal(model.inputCostPer1k),
        outputCostPer1k: new Prisma.Decimal(model.outputCostPer1k),
        capabilities: [...model.capabilities],
      },
    });

    modelIds.set(model.externalId, record.id);
  }

  return modelIds;
}

export async function seedAiCatalog(prisma: PrismaClient): Promise<void> {
  console.log('→ Catálogo de IA...');

  const providers = [
    { slug: 'openrouter', name: 'OpenRouter', isEnabled: !!process.env.OPENROUTER_API_KEY },
    { slug: 'gemini', name: 'Google Gemini', isEnabled: !!process.env.GEMINI_API_KEY },
    { slug: 'assemblyai', name: 'AssemblyAI LLM Gateway', isEnabled: !!process.env.ASSEMBLYAI_API_KEY },
    { slug: 'openai', name: 'OpenAI', isEnabled: false },
    { slug: 'anthropic', name: 'Anthropic', isEnabled: false },
  ] as const;

  const providerIds = new Map<string, string>();

  for (const provider of providers) {
    const record = await prisma.aiProvider.upsert({
      where: { slug: provider.slug },
      update: { name: provider.name, isEnabled: provider.isEnabled },
      create: provider,
    });
    providerIds.set(provider.slug, record.id);
  }

  const openrouterId = providerIds.get('openrouter');
  const geminiId = providerIds.get('gemini');
  const assemblyaiId = providerIds.get('assemblyai');
  const openaiId = providerIds.get('openai');
  const anthropicId = providerIds.get('anthropic');

  if (!openrouterId) {
    throw new Error('OpenRouter provider not seeded');
  }

  const fetchedOpenRouterModels = await fetchOpenRouterModels();
  const openRouterModelsById = new Map(
    fetchedOpenRouterModels.map((model) => [model.externalId, model]),
  );

  for (const fallback of OPENROUTER_FALLBACK_MODELS) {
    if (!openRouterModelsById.has(fallback.externalId)) {
      openRouterModelsById.set(fallback.externalId, fallback);
    }
  }

  const openRouterModels = [...openRouterModelsById.values()];
  const openrouterModelIds = await upsertProviderModels(
    prisma,
    openrouterId,
    openRouterModels,
    !!process.env.OPENROUTER_API_KEY,
  );

  if (geminiId) {
    const geminiModels = await fetchGeminiModels();
    await upsertProviderModels(
      prisma,
      geminiId,
      geminiModels,
      !!process.env.GEMINI_API_KEY,
    );
    console.log(`  • Gemini fetched: ${geminiModels.length} modelos`);
  }

  if (assemblyaiId) {
    await upsertProviderModels(
      prisma,
      assemblyaiId,
      ASSEMBLYAI_MODELS,
      !!process.env.ASSEMBLYAI_API_KEY,
    );
  }

  if (openaiId) {
    await upsertProviderModels(prisma, openaiId, OPENAI_MODELS, false);
  }

  if (anthropicId) {
    await upsertProviderModels(prisma, anthropicId, ANTHROPIC_MODELS, false);
  }

  const textModel =
    (openrouterModelIds.get('openai/gpt-4o-mini')
      ? { id: openrouterModelIds.get('openai/gpt-4o-mini')! }
      : null) ??
    (await prisma.aiModel.findFirst({
      where: {
        providerId: openrouterId,
        externalId: 'openai/gpt-4o-mini',
      },
    })) ??
    (await prisma.aiModel.findFirst({
      where: {
        providerId: openrouterId,
        capabilities: { has: 'text' },
        NOT: { capabilities: { has: 'embedding' } },
      },
      orderBy: { inputCostPer1k: 'asc' },
    }));

  const embeddingModel =
    (openrouterModelIds.get('openai/text-embedding-3-small')
      ? { id: openrouterModelIds.get('openai/text-embedding-3-small')! }
      : null) ??
    (await prisma.aiModel.findFirst({
      where: {
        providerId: openrouterId,
        externalId: 'openai/text-embedding-3-small',
      },
    })) ??
    (await prisma.aiModel.findFirst({
      where: {
        providerId: openrouterId,
        capabilities: { has: 'embedding' },
      },
      orderBy: { inputCostPer1k: 'asc' },
    }));

  const textModelId = textModel?.id;
  const embeddingModelId = embeddingModel?.id;

  const geminiTextModel = await prisma.aiModel.findFirst({
    where: { providerId: geminiId, externalId: 'gemini-2.5-flash' },
  });

  const resolvedTextModelId = textModelId ?? geminiTextModel?.id;
  const resolvedEmbeddingModelId = embeddingModelId ?? geminiTextModel?.id;

  if (!resolvedTextModelId || !resolvedEmbeddingModelId) {
    throw new Error('Required text/embedding models not seeded');
  }

  const agentPolicies: Record<string, string> = {
    research: resolvedTextModelId,
    cuts: resolvedTextModelId,
    video_editor: resolvedTextModelId,
  };

  const pipelineAgents = [
    { agentId: 'research', sortOrder: 0 },
    { agentId: 'cuts', sortOrder: 1 },
    { agentId: 'video_editor', sortOrder: 2 },
  ] as const;

  for (const agent of pipelineAgents) {
    const modelIdForAgent = agentPolicies[agent.agentId] ?? resolvedTextModelId;
    await prisma.agentModelPolicy.upsert({
      where: { agentId: agent.agentId },
      update: {
        modelId: modelIdForAgent,
        markupMultiplier: new Prisma.Decimal(1.2),
        isEnabled: true,
      },
      create: {
        agentId: agent.agentId,
        modelId: modelIdForAgent,
        markupMultiplier: new Prisma.Decimal(1.2),
        isEnabled: true,
      },
    });
  }

  await prisma.ragPlatformSettings.update({
    where: { id: 'default' },
    data: { embeddingModelId: resolvedEmbeddingModelId },
  });

  console.log(`  • OpenRouter: ${openRouterModels.length} modelos`);
  console.log(`  • AssemblyAI: ${ASSEMBLYAI_MODELS.length} modelos`);
  console.log(`  • OpenAI: ${OPENAI_MODELS.length} modelos (catálogo)`);
  console.log(`  • Anthropic: ${ANTHROPIC_MODELS.length} modelos (catálogo)`);
}
