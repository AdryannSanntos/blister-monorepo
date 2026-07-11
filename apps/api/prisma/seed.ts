import { randomBytes, scryptSync } from 'node:crypto';
import {
  businessPermissionKeys,
  defaultSystemRoles,
  getDefaultRolePermissions,
} from '@company-os/authz';
import type { DefaultSystemRole } from '@company-os/authz';
import { Prisma, PrismaClient, UserType } from '@company-os/db';
import { seedAiCatalog } from './seed-ai-catalog';
import { seedMarketplaceItems, seedFreeTextStyleEntitlements } from './seed-marketplace';
import { ensureWorkspaceAgentFolders } from '../src/files/workspace-folders.util';

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

const PIPELINE_AGENTS = [
  { agentId: 'cuts', sortOrder: 1 },
  { agentId: 'carousel', sortOrder: 2 },
] as const;

const ADMIN_USER = {
  userId: 'seed_admin_user',
  accountId: 'seed_admin_account',
  email: 'admin@blister.com.br',
  password: 'Admin@123456',
  name: 'Admin Blister',
} as const;

const TEST_USER = {
  userId: 'seed_test_user',
  accountId: 'seed_test_account',
  email: 'cttadryansantoss@gmail.com',
  password: 'adryan1234',
  name: 'Adryan Santos',
} as const;

async function seedPersonalSpaceForUser(
  userId: string,
  displayName: string,
  freeTierAmount: Prisma.Decimal,
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
  console.log(`  • Pipeline: ${PIPELINE_AGENTS.map((a) => a.agentId).join(', ')}`);
}

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

async function seedTestUser(freeTierAmount: Prisma.Decimal) {
  console.log('→ Usuário de teste...');

  const user = await upsertCredentialUser({
    id: TEST_USER.userId,
    accountId: TEST_USER.accountId,
    name: TEST_USER.name,
    email: TEST_USER.email,
    password: TEST_USER.password,
    userType: UserType.USER,
    roleName: 'viewer',
  });

  await seedPersonalSpaceForUser(user.id, TEST_USER.name, freeTierAmount);

  const company = await prisma.company.upsert({
    where: { slug: 'blister' },
    update: {
      name: 'Blister',
      onboardingCompletedAt: now(),
    },
    create: {
      id: 'seed_test_company',
      ownerUserId: user.id,
      name: 'Blister',
      slug: 'blister',
      onboardingCompletedAt: now(),
    },
  });

  await prisma.workspaceSettings.upsert({
    where: { companyId: company.id },
    update: { displayName: company.name },
    create: {
      companyId: company.id,
      displayName: company.name,
      niche: 'Conteúdo digital',
      audience: 'Criadores de conteúdo',
      voice: 'Tom direto e profissional',
      positioning: 'Plataforma de conteúdo video-first',
    },
  });

  const memberRole = await prisma.role.findUnique({ where: { name: 'member' } });
  if (memberRole) {
    await prisma.companyMember.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      update: {},
      create: {
        companyId: company.id,
        userId: user.id,
        roleId: memberRole.id,
      },
    });
  }

  await prisma.creditBalance.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      amount: freeTierAmount,
      currency: 'USD',
    },
  });

  console.log(`  • ${TEST_USER.email} / ${TEST_USER.password} (member)`);
  console.log(`  • Empresa: ${company.name} (slug: ${company.slug})`);
}

async function main() {
  console.log('\n🌱 Blister seed\n');

  await seedRoles();
  await seedPlatformSettings();
  await seedAiCatalog(prisma);

  const platformCredits = await prisma.platformCreditSettings.findUnique({
    where: { id: 'default' },
  });
  const freeTierAmount =
    platformCredits?.freeTierAmount ?? new Prisma.Decimal(20);

  await seedAdminUser(freeTierAmount);
  await seedTestUser(freeTierAmount);
  await seedMarketplaceItems(prisma);
  await seedFreeTextStyleEntitlements(prisma, ADMIN_USER.userId);

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
