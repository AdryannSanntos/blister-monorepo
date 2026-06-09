import { createHash, randomBytes, scryptSync } from 'node:crypto';
import {
  businessPermissionKeys,
  defaultSystemRoles,
  getDefaultRolePermissions,
} from '@company-os/authz';
import type { DefaultSystemRole } from '@company-os/authz';
import {
  CampaignStatus,
  CreditLedgerType,
  Prisma,
  PrismaClient,
  UserType,
} from '../src/generated/prisma';

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password.normalize('NFKC'), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${key.toString('hex')}`;
}

function contentHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const prisma = new PrismaClient();

const now = () => new Date();

type SeedUserInput = {
  id: string;
  accountId: string;
  name: string;
  email: string;
  password: string;
  userType: UserType;
  roleName: DefaultSystemRole;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const PIPELINE_AGENTS = [
  { agentId: 'strategist', sortOrder: 0 },
  { agentId: 'copywriter', sortOrder: 1 },
  { agentId: 'designer', sortOrder: 2 },
  { agentId: 'post', sortOrder: 3 },
] as const;

const AI_PROVIDERS = [
  { slug: 'openrouter', name: 'OpenRouter', isEnabled: true },
  { slug: 'openai', name: 'OpenAI', isEnabled: false },
  { slug: 'anthropic', name: 'Anthropic', isEnabled: false },
  { slug: 'gemini', name: 'Google Gemini', isEnabled: !!process.env.GEMINI_API_KEY },
] as const;

/** Catálogo mínimo: 1 modelo de texto + 1 de embedding via OpenRouter. */
const OPENROUTER_MODELS = [
  {
    externalId: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    inputCostPer1k: '0.000150',
    outputCostPer1k: '0.000600',
    capabilities: ['text', 'structured_output'],
  },
  {
    externalId: 'openai/text-embedding-3-small',
    name: 'Text Embedding 3 Small',
    inputCostPer1k: '0.000020',
    outputCostPer1k: '0.000000',
    capabilities: ['embedding'],
  },
] as const;

/** Modelos Gemini para text, structured output, embeddings e image generation. */
const GEMINI_MODELS = [
  {
    externalId: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    inputCostPer1k: '0.000075',
    outputCostPer1k: '0.000300',
    capabilities: ['text', 'structured_output'],
  },
  {
    externalId: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash (Image)',
    inputCostPer1k: '0.000100',
    outputCostPer1k: '0.000400',
    capabilities: ['image'],
  },
  {
    externalId: 'gemini-embedding-001',
    name: 'Gemini Embedding',
    inputCostPer1k: '0.000025',
    outputCostPer1k: '0.000000',
    capabilities: ['embedding'],
  },
] as const;

const DEMO_BUSINESS = {
  userId: 'seed_business_user',
  accountId: 'seed_business_account',
  companyId: 'seed_business_company',
  brandProfileId: 'seed_business_brand',
  campaignId: 'seed_business_campaign',
  email: 'negocio@blister.com.br',
  password: 'Negocio@123456',
  name: 'Maria Silva',
  companyName: 'Doces da Maria',
  companySlug: 'doces-da-maria',
  brandVoice:
    'Acolhedor e caseiro, como uma conversa entre amigas. Usamos emojis com moderação e valorizamos ingredientes frescos.',
  niche: 'Confeitaria artesanal',
  campaignName: 'Lançamento Bolo de Cenoura',
  campaignObjective: 'Divulgar o novo bolo de cenoura com cobertura de chocolate',
} as const;

const ADMIN_USER = {
  userId: 'seed_admin_user',
  accountId: 'seed_admin_account',
  email: 'admin@blister.com.br',
  password: 'Admin@123456',
  name: 'Admin Blister',
} as const;

// ─── RBAC ───────────────────────────────────────────────────────────────────

async function seedRoles() {
  console.log('→ Roles e permissões...');

  for (const roleName of defaultSystemRoles) {
    const permissions = getDefaultRolePermissions(roleName);

    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isSystem: true },
      create: { name: roleName, isSystem: true },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    await prisma.rolePermission.createMany({
      data: permissions.map((key) => ({ roleId: role.id, key })),
    });

    console.log(`  • ${roleName}: ${permissions.length} permissões`);
  }

  console.log(`  • Domínio negócio: ${businessPermissionKeys.length} chaves`);
}

// ─── Platform settings ──────────────────────────────────────────────────────

async function seedPlatformSettings() {
  console.log('→ Configurações de plataforma...');

  await prisma.platformCreditSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      freeTierAmount: new Prisma.Decimal(20),
      currency: 'USD',
      markupDefault: new Prisma.Decimal(1.2),
      minRunCost: new Prisma.Decimal(0.01),
    },
  });

  await prisma.ragPlatformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      chunkSize: 512,
      chunkOverlap: 64,
      topK: 8,
      rerankEnabled: true,
    },
  });

  for (const agent of PIPELINE_AGENTS) {
    await prisma.pipelineAgentConfig.upsert({
      where: { agentId: agent.agentId },
      update: { sortOrder: agent.sortOrder, isEnabled: true },
      create: {
        agentId: agent.agentId,
        sortOrder: agent.sortOrder,
        isEnabled: true,
      },
    });
  }

  console.log('  • Créditos: US$ 20 free tier, markup 1.2x');
  console.log('  • RAG: chunk 512, topK 8, rerank ativo');
  console.log(`  • Pipeline: ${PIPELINE_AGENTS.map((a) => a.agentId).join(' → ')}`);
}

// ─── AI catalog ─────────────────────────────────────────────────────────────

async function seedAiCatalog() {
  console.log('→ Catálogo de IA...');

  const providerIds = new Map<string, string>();

  for (const provider of AI_PROVIDERS) {
    const record = await prisma.aiProvider.upsert({
      where: { slug: provider.slug },
      update: { name: provider.name, isEnabled: provider.isEnabled },
      create: provider,
    });
    providerIds.set(provider.slug, record.id);
  }

  const openrouterId = providerIds.get('openrouter');
  const geminiId = providerIds.get('gemini');

  if (!openrouterId) {
    throw new Error('OpenRouter provider not seeded');
  }

  const modelIds = new Map<string, string>();

  for (const model of OPENROUTER_MODELS) {
    const record = await prisma.aiModel.upsert({
      where: {
        providerId_externalId: {
          providerId: openrouterId,
          externalId: model.externalId,
        },
      },
      update: {
        name: model.name,
        isEnabled: true,
        inputCostPer1k: new Prisma.Decimal(model.inputCostPer1k),
        outputCostPer1k: new Prisma.Decimal(model.outputCostPer1k),
        capabilities: [...model.capabilities],
      },
      create: {
        providerId: openrouterId,
        externalId: model.externalId,
        name: model.name,
        isEnabled: true,
        inputCostPer1k: new Prisma.Decimal(model.inputCostPer1k),
        outputCostPer1k: new Prisma.Decimal(model.outputCostPer1k),
        capabilities: [...model.capabilities],
      },
    });
    modelIds.set(`openrouter/${model.externalId}`, record.id);
  }

  if (geminiId) {
    const geminiEnabled = !!process.env.GEMINI_API_KEY;

    for (const model of GEMINI_MODELS) {
      const record = await prisma.aiModel.upsert({
        where: {
          providerId_externalId: {
            providerId: geminiId,
            externalId: model.externalId,
          },
        },
        update: {
          name: model.name,
          isEnabled: geminiEnabled,
          inputCostPer1k: new Prisma.Decimal(model.inputCostPer1k),
          outputCostPer1k: new Prisma.Decimal(model.outputCostPer1k),
          capabilities: [...model.capabilities],
        },
        create: {
          providerId: geminiId,
          externalId: model.externalId,
          name: model.name,
          isEnabled: geminiEnabled,
          inputCostPer1k: new Prisma.Decimal(model.inputCostPer1k),
          outputCostPer1k: new Prisma.Decimal(model.outputCostPer1k),
          capabilities: [...model.capabilities],
        },
      });
      modelIds.set(`gemini/${model.externalId}`, record.id);
    }
  }

  const textModelId = modelIds.get('openrouter/openai/gpt-4o-mini');
  const embeddingModelId = modelIds.get('openrouter/openai/text-embedding-3-small');
  const geminiTextModelId = modelIds.get('gemini/gemini-2.5-flash');
  const geminiImageModelId = modelIds.get('gemini/gemini-2.5-flash-image');

  if (!textModelId || !embeddingModelId) {
    throw new Error('Required AI models not seeded');
  }

  const agentPolicies: Record<string, string> = {
    copywriter: textModelId,
    strategist: geminiTextModelId ?? textModelId,
    designer: geminiImageModelId ?? textModelId,
    post: textModelId,
  };

  for (const agent of PIPELINE_AGENTS) {
    const modelIdForAgent = agentPolicies[agent.agentId] ?? textModelId;
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
    data: { embeddingModelId },
  });

  const geminiStatus = process.env.GEMINI_API_KEY ? 'ativo' : 'inativo';
  console.log(`  • Providers: openrouter (ativo), gemini (${geminiStatus}), openai, anthropic (inativos)`);
  console.log('  • Modelos OpenRouter: gpt-4o-mini, text-embedding-3-small');
  console.log('  • Modelos Gemini: gemini-2.5-flash (text), gemini-2.5-flash-image, gemini-embedding-001');
  console.log('  • Policies: copywriter→GPT-4o-mini, strategist→Gemini Flash, designer→Gemini Image');
  console.log('  • Credenciais: OPENROUTER_API_KEY, GEMINI_API_KEY no .env');
}

// ─── Users ──────────────────────────────────────────────────────────────────

async function upsertCredentialUser(input: SeedUserInput) {
  const timestamp = now();

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, userType: input.userType },
    create: {
      id: input.id,
      name: input.name,
      email: input.email,
      emailVerified: true,
      userType: input.userType,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: { providerId: 'credential', accountId: input.email },
    },
    update: {},
    create: {
      id: input.accountId,
      userId: user.id,
      accountId: input.email,
      providerId: 'credential',
      password: hashPassword(input.password),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });

  const role = await prisma.role.findUnique({ where: { name: input.roleName } });
  if (!role) {
    throw new Error(`Role "${input.roleName}" not found`);
  }

  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  return user;
}

async function seedAdminUser() {
  console.log('→ Usuário admin (plataforma)...');

  const user = await upsertCredentialUser({
    id: ADMIN_USER.userId,
    accountId: ADMIN_USER.accountId,
    name: ADMIN_USER.name,
    email: ADMIN_USER.email,
    password: ADMIN_USER.password,
    userType: UserType.ADMIN,
    roleName: 'owner',
  });

  await prisma.platformRoleAssignment.upsert({
    where: { userId_role: { userId: user.id, role: 'platform_owner' } },
    update: {},
    create: {
      userId: user.id,
      role: 'platform_owner',
      assignedBy: user.id,
    },
  });

  console.log(`  • ${ADMIN_USER.email} / ${ADMIN_USER.password} (platform_owner)`);
}

async function seedDemoBusiness() {
  if (process.env.SEED_DEMO_BUSINESS === 'false') {
    console.log('→ Demo negócio: ignorado (SEED_DEMO_BUSINESS=false)');
    return;
  }

  console.log('→ Demo negócio (MEI)...');

  const settings = await prisma.platformCreditSettings.findUnique({
    where: { id: 'default' },
  });
  const freeTierAmount = settings?.freeTierAmount ?? new Prisma.Decimal(20);

  const user = await upsertCredentialUser({
    id: DEMO_BUSINESS.userId,
    accountId: DEMO_BUSINESS.accountId,
    name: DEMO_BUSINESS.name,
    email: DEMO_BUSINESS.email,
    password: DEMO_BUSINESS.password,
    userType: UserType.BUSINESS,
    roleName: 'member',
  });

  const company = await prisma.company.upsert({
    where: { ownerUserId: user.id },
    update: {
      name: DEMO_BUSINESS.companyName,
      slug: DEMO_BUSINESS.companySlug,
    },
    create: {
      id: DEMO_BUSINESS.companyId,
      ownerUserId: user.id,
      name: DEMO_BUSINESS.companyName,
      slug: DEMO_BUSINESS.companySlug,
      onboardingCompletedAt: now(),
    },
  });

  const brandContent = [
    DEMO_BUSINESS.companyName,
    DEMO_BUSINESS.brandVoice,
    DEMO_BUSINESS.niche,
  ].join('\n');

  await prisma.brandProfile.upsert({
    where: { companyId: company.id },
    update: {
      brandVoice: DEMO_BUSINESS.brandVoice,
      niche: DEMO_BUSINESS.niche,
      description: 'Confeitaria artesanal com foco em bolos caseiros.',
      targetAudience: 'Mulheres de 25 a 45 anos que buscam doces para festas em casa',
      marketingObjective: 'SELL_MORE',
      socialNetworks: ['instagram', 'whatsapp'],
      palette: {
        primary: {
          id: 'primary',
          name: 'Cor principal',
          hex: '#7C3AED',
          description: 'Cor principal da marca em posts e destaques',
        },
        secondary: {
          id: 'secondary',
          name: 'Cor secundária',
          hex: '#F97316',
          description: 'Detalhes, botões e chamadas de ação',
        },
        additional: [],
      },
      visualStyle: 'elegant',
      typography: 'Sans-serif moderna',
      mainProducts: 'Bolos sob encomenda, doces finos, kit festa',
      differentiators: 'Ingredientes frescos, receitas de família, entrega no mesmo dia',
    },
    create: {
      id: DEMO_BUSINESS.brandProfileId,
      companyId: company.id,
      brandVoice: DEMO_BUSINESS.brandVoice,
      niche: DEMO_BUSINESS.niche,
      description: 'Confeitaria artesanal com foco em bolos caseiros.',
      targetAudience: 'Mulheres de 25 a 45 anos que buscam doces para festas em casa',
      marketingObjective: 'SELL_MORE',
      socialNetworks: ['instagram', 'whatsapp'],
      palette: {
        primary: {
          id: 'primary',
          name: 'Cor principal',
          hex: '#7C3AED',
          description: 'Cor principal da marca em posts e destaques',
        },
        secondary: {
          id: 'secondary',
          name: 'Cor secundária',
          hex: '#F97316',
          description: 'Detalhes, botões e chamadas de ação',
        },
        additional: [],
      },
      visualStyle: 'elegant',
      typography: 'Sans-serif moderna',
      mainProducts: 'Bolos sob encomenda, doces finos, kit festa',
      differentiators: 'Ingredientes frescos, receitas de família, entrega no mesmo dia',
    },
  });

  await prisma.creditBalance.upsert({
    where: { companyId: company.id },
    update: { amount: freeTierAmount },
    create: {
      companyId: company.id,
      amount: freeTierAmount,
      currency: 'USD',
    },
  });

  const existingCredit = await prisma.creditLedger.findFirst({
    where: {
      companyId: company.id,
      type: CreditLedgerType.CREDIT,
      description: 'Free tier inicial',
    },
  });

  if (!existingCredit) {
    await prisma.creditLedger.create({
      data: {
        companyId: company.id,
        type: CreditLedgerType.CREDIT,
        amount: freeTierAmount,
        balanceAfter: freeTierAmount,
        currency: 'USD',
        description: 'Free tier inicial',
        metadata: { source: 'seed' },
      },
    });
  }

  const campaign = await prisma.campaign.upsert({
    where: { id: DEMO_BUSINESS.campaignId },
    update: {
      name: DEMO_BUSINESS.campaignName,
      objective: DEMO_BUSINESS.campaignObjective,
      status: CampaignStatus.ACTIVE,
    },
    create: {
      id: DEMO_BUSINESS.campaignId,
      companyId: company.id,
      name: DEMO_BUSINESS.campaignName,
      objective: DEMO_BUSINESS.campaignObjective,
      context: 'Público local, Instagram como canal principal.',
      status: CampaignStatus.ACTIVE,
    },
  });

  const hash = contentHash(brandContent);

  await prisma.ragDocument.upsert({
    where: {
      companyId_sourceType_sourceId_contentHash: {
        companyId: company.id,
        sourceType: 'BRAND_BRAIN',
        sourceId: company.id,
        contentHash: hash,
      },
    },
    update: { title: DEMO_BUSINESS.companyName },
    create: {
      companyId: company.id,
      sourceType: 'BRAND_BRAIN',
      sourceId: company.id,
      title: DEMO_BUSINESS.companyName,
      contentHash: hash,
      metadata: { seeded: true },
    },
  });

  console.log(`  • ${DEMO_BUSINESS.email} / ${DEMO_BUSINESS.password} (role: member)`);
  console.log(`  • Empresa: ${company.name} — US$ ${freeTierAmount} créditos`);
  console.log(`  • Campanha demo: ${campaign.name}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Blister seed — completo e mínimo\n');

  await seedRoles();
  await seedPlatformSettings();
  await seedAiCatalog();
  await seedAdminUser();
  await seedDemoBusiness();

  console.log('\n✅ Seed concluído.\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Seed falhou:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
