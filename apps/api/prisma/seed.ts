import { createHash, randomBytes, scryptSync } from 'node:crypto';
import {
  businessPermissionKeys,
  defaultSystemRoles,
  getDefaultRolePermissions,
} from '@company-os/authz';
import type { DefaultSystemRole } from '@company-os/authz';
import { WORKSPACE_AGENT_FOLDERS } from '@company-os/types';
import {
  CampaignStatus,
  CreditLedgerType,
  Prisma,
  PrismaClient,
  UserType,
} from '../src/generated/prisma';
import { seedAiCatalog } from './seed-ai-catalog';
import { seedMarketplaceItems } from './seed-marketplace';
import { ensureWorkspaceAgentFolders } from '../src/files/workspace-folders.util';

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
  { agentId: 'research', sortOrder: 0 },
  { agentId: 'cuts', sortOrder: 1 },
  { agentId: 'video_editor', sortOrder: 2 },
] as const;

const SYSTEM_FOLDERS = WORKSPACE_AGENT_FOLDERS.map((folder) => ({
  name: folder.name,
  systemKey: folder.systemKey,
}));

const DEMO_WORKSPACE_PROFILE = {
  displayName: 'Confeitaria da Paola',
  niche: 'Confeitaria artesanal · bolos e doces finos',
  audience: 'Mulheres 28–45 · eventos e presentes',
  voice: 'Acolhedora, direta, com toque de luxo acessível',
  positioning: 'Bolos que viram memória — não só sobremesa',
  contentPreferences: 'Vídeos curtos, depoimentos, bastidores de produção',
} as const;

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

// ─── Blister OS workspace bootstrap ─────────────────────────────────────────

async function seedPersonalSpaceForUser(
  userId: string,
  displayName: string,
  freeTierAmount: Prisma.Decimal,
  profile?: {
    niche: string;
    audience: string;
    voice: string;
    positioning: string;
    contentPreferences: string;
  },
) {
  const existing = await prisma.personalSpace.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const personalSpace = await tx.personalSpace.create({
      data: { userId, name: displayName },
    });

    await tx.workspaceSettings.create({
      data: {
        personalSpaceId: personalSpace.id,
        displayName,
        ...(profile ?? {}),
      },
    });

    await tx.personalCreditBalance.create({
      data: {
        personalSpaceId: personalSpace.id,
        amount: freeTierAmount,
        currency: 'USD',
      },
    });

    await ensureWorkspaceAgentFolders(tx, {
      personalSpaceId: personalSpace.id,
    });

    return personalSpace;
  });
}

async function ensureCompanyWorkspaceBootstrap(
  companyId: string,
  userId: string,
  profile: {
    displayName: string;
    niche: string;
    audience: string;
    voice: string;
    positioning: string;
    contentPreferences: string;
  },
) {
  await prisma.workspaceSettings.upsert({
    where: { companyId },
    update: profile,
    create: { companyId, ...profile },
  });

  const ownerRole = await prisma.role.findUnique({ where: { name: 'owner' } });
  if (ownerRole) {
    await prisma.companyMember.upsert({
      where: { companyId_userId: { companyId, userId } },
      update: { roleId: ownerRole.id },
      create: { companyId, userId, roleId: ownerRole.id },
    });
  }

  await ensureWorkspaceAgentFolders(prisma, { companyId });
}

async function seedDemoWorkspaceFiles(companyId: string, companySlug: string) {
  const cutsFolder = await prisma.workspaceFolder.findFirst({
    where: { companyId, systemKey: 'agent:cuts' },
  });
  if (!cutsFolder) return;

  const demoFiles = [
    {
      id: 'seed_demo_podcast_mp4',
      name: 'Podcast Ep. 12 — Confeitaria em casa.mp4',
      mimeType: 'video/mp4',
      storageKey: `${companySlug}/uploads/demo/podcast-ep12.mp4`,
      sizeBytes: 52_428_800,
      extractedText:
        'Hoje vamos falar sobre como transformar confeitaria caseira em negócio lucrativo. ' +
        'O segredo está no posicionamento premium e nos bastidores autênticos. ' +
        'Quando mostramos o processo real, a retenção dispara nos primeiros três segundos.',
    },
    {
      id: 'seed_demo_live_mp4',
      name: 'Live Instagram — Bastidores do bolo.mp4',
      mimeType: 'video/mp4',
      storageKey: `${companySlug}/uploads/demo/live-bastidores.mp4`,
      sizeBytes: 31_457_280,
      extractedText:
        'Olá pessoal, bem-vindos à live de bastidores. Vou mostrar como montamos o bolo de cenoura ' +
        'mais pedido da semana. Esse gancho inicial costuma prender quem ama doces artesanais.',
    },
  ] as const;

  for (const file of demoFiles) {
    await prisma.workspaceFile.upsert({
      where: { id: file.id },
      update: {
        name: file.name,
        extractedText: file.extractedText,
        status: 'INDEXED',
      },
      create: {
        id: file.id,
        companyId,
        folderId: cutsFolder.id,
        name: file.name,
        mimeType: file.mimeType,
        storageKey: file.storageKey,
        sizeBytes: file.sizeBytes,
        extractedText: file.extractedText,
        status: 'INDEXED',
        extractData: true,
        origin: 'UPLOAD',
      },
    });
  }
}

async function seedDefaultMarketplaceEntitlements(
  companyId: string,
  userId: string,
) {
  const freeItems = await prisma.marketplaceItem.findMany({
    where: { price: 0, isActive: true },
  });

  for (const item of freeItems) {
    await prisma.workspaceEntitlement.upsert({
      where: {
        itemId_companyId: { itemId: item.id, companyId },
      },
      update: {},
      create: {
        itemId: item.id,
        companyId,
        redeemedByUserId: userId,
      },
    });
  }

  return freeItems.length;
}

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

  const legacyMember = await prisma.role.upsert({
    where: { name: 'member' },
    update: { isSystem: true },
    create: { name: 'member', isSystem: true },
  });
  const memberPermissions = getDefaultRolePermissions('member');
  await prisma.rolePermission.deleteMany({ where: { roleId: legacyMember.id } });
  await prisma.rolePermission.createMany({
    data: memberPermissions.map((key) => ({ roleId: legacyMember.id, key })),
  });
  console.log(`  • member (legacy): ${memberPermissions.length} permissões`);

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

async function seedAdminUser(freeTierAmount: Prisma.Decimal) {
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

  await seedPersonalSpaceForUser(user.id, ADMIN_USER.name, freeTierAmount);

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
    roleName: 'owner',
  });

  await seedPersonalSpaceForUser(
    user.id,
    DEMO_BUSINESS.name,
    freeTierAmount,
    DEMO_WORKSPACE_PROFILE,
  );

  const company = await prisma.company.upsert({
    where: { slug: DEMO_BUSINESS.companySlug },
    update: {
      name: DEMO_BUSINESS.companyName,
      ownerUserId: user.id,
    },
    create: {
      id: DEMO_BUSINESS.companyId,
      ownerUserId: user.id,
      name: DEMO_BUSINESS.companyName,
      slug: DEMO_BUSINESS.companySlug,
      onboardingCompletedAt: now(),
    },
  });

  await ensureCompanyWorkspaceBootstrap(company.id, user.id, {
    displayName: DEMO_WORKSPACE_PROFILE.displayName,
    niche: DEMO_WORKSPACE_PROFILE.niche,
    audience: DEMO_WORKSPACE_PROFILE.audience,
    voice: DEMO_WORKSPACE_PROFILE.voice,
    positioning: DEMO_WORKSPACE_PROFILE.positioning,
    contentPreferences: DEMO_WORKSPACE_PROFILE.contentPreferences,
  });

  await seedDemoWorkspaceFiles(company.id, company.slug);

  const entitlementCount = await seedDefaultMarketplaceEntitlements(
    company.id,
    user.id,
  );

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

  console.log(`  • ${DEMO_BUSINESS.email} / ${DEMO_BUSINESS.password} (owner)`);
  console.log(`  • Espaço pessoal + empresa: ${company.name}`);
  console.log(`  • Créditos empresa: US$ ${freeTierAmount}`);
  console.log(`  • Biblioteca: ${entitlementCount} itens grátis resgatados`);
  console.log(`  • Campanha demo: ${campaign.name}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Blister seed — completo e mínimo\n');

  await seedRoles();
  await seedPlatformSettings();
  await seedAiCatalog(prisma);
  await seedMarketplaceItems(prisma);

  const platformCredits = await prisma.platformCreditSettings.findUnique({
    where: { id: 'default' },
  });
  const freeTierAmount =
    platformCredits?.freeTierAmount ?? new Prisma.Decimal(20);

  await seedAdminUser(freeTierAmount);
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
