import { randomBytes, scryptSync } from 'node:crypto';
import { defaultSystemRoles, getDefaultRolePermissions } from '@company-os/authz';
import type { DefaultSystemRole } from '@company-os/authz';
import { PrismaClient } from '../src/generated/prisma';

// Mesmo algoritmo do @better-auth/utils/password
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

const SEED_USER_ID = 'seed_dev_adryan_user_01';
const SEED_ORG_ID = 'seed_dev_workana_ai_org';
const SEED_ONBOARDING_DATA = {
  'company-basics': {
    companyName: 'Workana AI',
    industry: 'SaaS B2B para operacao com freelancers, fornecedores e times remotos',
    description:
      'Workana AI organiza contexto, briefing, equipe, permissoes, assets, agentes e integracoes para empresas que coordenam trabalho distribuido com foco em execucao.',
    website: 'https://www.workana.com',
  },
  positioning: {
    mission:
      'Ajudar empresas a coordenar trabalho com freelancers e parceiros com mais contexto, velocidade e padrao operacional.',
    vision:
      'Ser a camada operacional de inteligencia usada por empresas para escalar execucao com times flexiveis e externos.',
    valueProposition:
      'Centralizamos o brain da empresa e conectamos esse contexto a fluxos, equipe e agentes para reduzir retrabalho, acelerar entregas e manter consistencia.',
  },
  'products-services': {
    products:
      'Workspace por empresa, onboarding do Brain, gestao de equipe, roles e permissoes, assets de contexto, integracoes e agentes operacionais.',
    pricing:
      'Modelo SaaS B2B por empresa, com expansao futura por assentos, uso de agentes e creditos.',
  },
  'target-audience': {
    idealCustomer:
      'Empresas que contratam e coordenam freelancers, fornecedores e times remotos e precisam padronizar contexto, processos e execucao.',
    painPoints:
      'Briefings descentralizados, perda de contexto, onboarding lento, baixa previsibilidade, retrabalho e dificuldade para manter padrao entre pessoas e agentes.',
    channels:
      'Base Workana, indicacao, inside sales, conteudo consultivo e parcerias com operacoes e liderancas de growth, marketing e delivery.',
  },
  'tone-of-voice': {
    tone: 'Direto, consultivo, operacional e confiante.',
    communicationStyle:
      'Clareza acima de tudo, linguagem B2B, foco em execucao, sem jargoes vazios e sem soar como chatbot generico.',
    avoidWords:
      'Evitar hype, promessas vagas, excesso de buzzwords, linguagem infantilizada e qualquer tom de assistente genérico.',
  },
  'differentials-faq': {
    differentials:
      'Conecta contexto da empresa, permissoes, equipe e agentes no mesmo workspace; nasce orientado a operacao real, nao apenas conversa; respeita governanca e escalabilidade desde a base.',
    faq: 'O que e o Brain? Como o contexto e usado pelos agentes? Como funciona permissao por empresa? Como onboardar equipe? O que muda para quem trabalha com freelancers? Como integrar sistemas externos?',
  },
  'processes-rules': {
    processes:
      'Toda empresa passa por selecao/criacao de workspace, onboarding inicial do Brain, configuracao de equipe e permissoes e depois operacao via dashboard com assets e integracoes.',
    rules:
      'Toda acao sensivel precisa de permissao explicita; userId nunca vem do body; contexto de empresa existe apenas dentro de dashboard/onboarding; o Brain deve refletir a operacao real da empresa.',
    tools:
      'Next.js, NestJS, Prisma, PostgreSQL, better-auth, CASL, Zod, TanStack Query/Table, shadcn/ui e Resend.',
  },
} as const;

const AI_PROVIDERS = [
  {
    slug: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified gateway for multiple AI providers and models.',
    status: 'active',
    iconMetadata: { iconKey: 'openrouter' },
    capabilityMetadata: { text: true, vision: true, image: true },
    pricingMetadata: {},
    limitsMetadata: {},
    schemaMetadata: { adapter: 'openrouter' },
  },
  {
    slug: 'openai',
    name: 'OpenAI',
    description: 'Native OpenAI provider catalog entry pending runtime credentials.',
    status: 'draft',
    iconMetadata: { iconKey: 'openai' },
    capabilityMetadata: { text: true, vision: true, image: true },
    pricingMetadata: {},
    limitsMetadata: {},
    schemaMetadata: { adapter: 'openai' },
  },
  {
    slug: 'anthropic',
    name: 'Anthropic',
    description: 'Native Anthropic provider catalog entry pending runtime credentials.',
    status: 'draft',
    iconMetadata: { iconKey: 'anthropic' },
    capabilityMetadata: { text: true, vision: true },
    pricingMetadata: {},
    limitsMetadata: {},
    schemaMetadata: { adapter: 'anthropic' },
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    description: 'Native Gemini provider catalog entry pending runtime credentials.',
    status: 'draft',
    iconMetadata: { iconKey: 'gemini' },
    capabilityMetadata: { text: true, vision: true, image: true },
    pricingMetadata: {},
    limitsMetadata: {},
    schemaMetadata: { adapter: 'gemini' },
  },
] as const;

async function main() {
  console.log('Iniciando seed...');

  // 1. Usuário com conta de credencial
  const password = hashPassword('adryan187781');

  const user = await prisma.user.upsert({
    where: { email: 'cttadryansantoss@gmail.com' },
    update: {},
    create: {
      id: SEED_USER_ID,
      name: 'Adryan Santos',
      email: 'cttadryansantoss@gmail.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      accounts: {
        create: {
          id: `${SEED_USER_ID}_cred`,
          accountId: SEED_USER_ID,
          providerId: 'credential',
          password,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    },
  });

  console.log(`  Usuário: ${user.email}`);

  // 2. Organização
  const org = await prisma.organization.upsert({
    where: { slug: 'workana-ai' },
    update: {},
    create: {
      id: SEED_ORG_ID,
      name: 'Workana AI',
      slug: 'workana-ai',
    },
  });

  console.log(`  Organização: ${org.name} (${org.slug})`);

  // 3. Roles padrão com permissões
  const roleIds: Record<string, string> = {};

  for (const roleName of defaultSystemRoles) {
    const existing = await prisma.role.findFirst({
      where: { organizationId: org.id, name: roleName },
    });

    if (existing) {
      roleIds[roleName] = existing.id;
    } else {
      const permissions = getDefaultRolePermissions(roleName as DefaultSystemRole);
      const role = await prisma.role.create({
        data: {
          organizationId: org.id,
          name: roleName,
          isSystem: true,
          permissions: {
            create: permissions.map((key) => ({ key })),
          },
        },
      });
      roleIds[roleName] = role.id;
    }
  }

  console.log(`  Roles: ${Object.keys(roleIds).join(', ')}`);

  // 4. Membership como owner
  await prisma.membership.upsert({
    where: {
      userId_organizationId: { userId: user.id, organizationId: org.id },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      roles: {
        create: { roleId: roleIds.owner },
      },
    },
  });

  console.log('  Membership: owner');

  for (const provider of AI_PROVIDERS) {
    await prisma.aIProvider.upsert({
      where: { slug: provider.slug },
      update: {
        name: provider.name,
        description: provider.description,
        status: provider.status,
        iconMetadata: provider.iconMetadata,
        capabilityMetadata: provider.capabilityMetadata,
        pricingMetadata: provider.pricingMetadata,
        limitsMetadata: provider.limitsMetadata,
        schemaMetadata: provider.schemaMetadata,
      },
      create: provider,
    });
  }

  console.log(`  AI Providers: ${AI_PROVIDERS.map((provider) => provider.slug).join(', ')}`);

  await prisma.onboardingDraft.upsert({
    where: { organizationId: org.id },
    update: {
      currentStep: 8,
      data: SEED_ONBOARDING_DATA,
      publishedAt: new Date(),
    },
    create: {
      organizationId: org.id,
      currentStep: 8,
      data: SEED_ONBOARDING_DATA,
      publishedAt: new Date(),
    },
  });

  console.log('  Brain: configurado e publicado');
  console.log('');
  console.log('Seed concluido.');
  console.log('  Email: cttadryansantoss@gmail.com');
  console.log('  Senha: adryan187781');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
