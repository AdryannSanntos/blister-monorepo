import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultSystemRoles, getDefaultRolePermissions } from '@company-os/authz';
import type { DefaultSystemRole } from '@company-os/authz';
import { AnthropicAdapter } from '../src/ai-runtime/adapters/anthropic.adapter';
import { GeminiAdapter } from '../src/ai-runtime/adapters/gemini.adapter';
import type { AIRuntimeResolvedCredential, AIProviderListedModel } from '../src/ai-runtime/adapters/ai-provider.adapter';
import { OpenAIAdapter } from '../src/ai-runtime/adapters/openai.adapter';
import { OpenRouterAdapter } from '../src/ai-runtime/adapters/openrouter.adapter';
import { Prisma, PrismaClient } from '../src/generated/prisma';

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

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

function loadEnvFiles() {
  for (const filePath of [resolve(__dirname, '../../../.env'), resolve(__dirname, '../.env')]) {
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!process.env[key] || process.env[key] === 'change-me') {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();

const prisma = new PrismaClient();

const SEED_USER_ID = 'seed_dev_adryan_user_01';
const SEED_ORG_ID = 'seed_dev_workana_ai_org';
const SEED_ONBOARDING_DATA = {
  'company-basics': {
    companyName: 'Workana AI',
    industry: 'Tecnologia / SaaS',
    description:
      'Workana AI organiza contexto, briefing, equipe, permissoes, assets, agentes e integracoes para empresas que coordenam trabalho distribuido com foco em execucao.',
    website: 'https://www.workana.com.br',
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
    pricing: 'Assinatura (SaaS)',
  },
  'target-audience': {
    idealCustomer:
      'Empresas que contratam e coordenam freelancers, fornecedores e times remotos e precisam padronizar contexto, processos e execucao.',
    painPoints:
      'Briefings descentralizados, perda de contexto, onboarding lento, baixa previsibilidade, retrabalho e dificuldade para manter padrao entre pessoas e agentes.',
    channels:
      'Base Workana, indicacao, inside sales, conteudo consultivo e parcerias com operacoes e liderancas de growth, marketing e delivery., Orgânico / SEO, Email marketing, Eventos / Webinars, Mídia paga (Ads)',
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

const AI_MODELS = [
  {
    providerSlug: 'openrouter',
    slug: 'nemotron-3-super',
    name: 'Nemotron 3 Super',
    description: 'Text generation model for operational writing workflows.',
    externalModelId: 'nvidia/nemotron-3-super-120b-a12b:free',
    status: 'active',
    capabilityMetadata: { text: true, structuredOutput: true },
    pricingMetadata: {},
    limitsMetadata: {},
    schemaMetadata: {},
  },
  {
    providerSlug: 'openrouter',
    slug: 'gpt-image-1',
    name: 'GPT Image 1',
    description: 'Image generation model for visual workflows.',
    externalModelId: 'openai/gpt-image-1',
    status: 'active',
    capabilityMetadata: { image: true },
    pricingMetadata: {},
    limitsMetadata: {},
    schemaMetadata: {},
  },
] as const;

const TEST_AGENTS = [
  {
    slug: 'copy-linkedin-teste',
    name: 'Copy LinkedIn - Teste',
    description: 'Gera copy profissional para posts de LinkedIn a partir de um briefing em linguagem natural.',
    flowDefinition: {
      config: {
        name: 'Copy LinkedIn',
        objective: 'Transformar um briefing em um post de LinkedIn claro, direto e com CTA.',
        instructions:
          'Escreva em portugues do Brasil, com tom B2B, objetivo, confiavel e orientado a execucao.',
        fallbackMessage: 'Nao consegui gerar a copy agora. Tente novamente com mais contexto.',
      },
      nodes: [
        {
          id: 'input',
          type: 'input',
          config: {
            label: 'Briefing',
            position: { x: 80, y: 180 },
            successors: ['generate-copy'],
          },
        },
        {
          id: 'generate-copy',
          type: 'llm_generate',
          config: {
            label: 'Gerar copy',
            prompt:
              'Voce e um redator senior de marketing B2B. Com base na mensagem do usuario, gere um post de LinkedIn com: 1) gancho inicial, 2) desenvolvimento objetivo, 3) encerramento com CTA curto. Responda apenas com o texto final.',
            position: { x: 360, y: 180 },
            successors: ['output'],
          },
        },
        {
          id: 'output',
          type: 'output',
          config: {
            label: 'Entregar copy',
            position: { x: 660, y: 180 },
            successors: [],
          },
        },
      ],
    },
  },
  {
    slug: 'gerador-imagem-teste',
    name: 'Gerador de Imagem - Teste',
    description: 'Cria imagens para campanhas e posts com base em um prompt ou briefing do usuario.',
    flowDefinition: {
      config: {
        name: 'Gerador de Imagem',
        objective: 'Transformar uma descricao curta em uma imagem de campanha.',
        instructions:
          'Priorize composicoes limpas, contraste alto e linguagem visual de produto B2B.',
        fallbackMessage: 'Nao consegui gerar a imagem agora. Tente novamente com um prompt mais especifico.',
      },
      nodes: [
        {
          id: 'input',
          type: 'input',
          config: {
            label: 'Briefing visual',
            position: { x: 80, y: 180 },
            successors: ['generate-image'],
          },
        },
        {
          id: 'generate-image',
          type: 'image_generate',
          config: {
            label: 'Gerar imagem',
            prompt:
              'Crie uma imagem publicitaria moderna e profissional a partir do briefing enviado pelo usuario. Considere contexto B2B, composicao limpa e foco no assunto principal.',
            size: '1024x1024',
            position: { x: 360, y: 180 },
            successors: ['output'],
          },
        },
        {
          id: 'output',
          type: 'output',
          config: {
            label: 'Entregar imagem',
            position: { x: 660, y: 180 },
            successors: [],
          },
        },
      ],
    },
  },
  {
    slug: 'landing-html-teste',
    name: 'Landing HTML - Teste',
    description: 'Gera um HTML simples de landing page e para para revisao antes da entrega final.',
    flowDefinition: {
      config: {
        name: 'Landing HTML',
        objective: 'Gerar uma landing page em HTML pronta para revisao.',
        instructions:
          'Entregue HTML completo, sem markdown, com hierarquia clara, CTA visivel e texto em portugues.',
        fallbackMessage: 'Nao consegui montar o HTML agora. Tente novamente com um briefing mais detalhado.',
      },
      nodes: [
        {
          id: 'input',
          type: 'input',
          config: {
            label: 'Briefing da landing',
            position: { x: 80, y: 180 },
            successors: ['generate-html'],
          },
        },
        {
          id: 'generate-html',
          type: 'llm_generate',
          config: {
            label: 'Gerar HTML',
            prompt:
              'Com base no briefing do usuario, retorne um HTML completo de landing page. Responda apenas com HTML puro, sem markdown e sem comentarios.',
            position: { x: 340, y: 180 },
            successors: ['validate-html'],
          },
        },
        {
          id: 'validate-html',
          type: 'html_validation',
          htmlField: 'text',
          requireExplicitConfirmation: true,
          config: {
            label: 'Validar HTML',
            htmlField: 'text',
            requireExplicitConfirmation: true,
            position: { x: 620, y: 180 },
            successors: ['output'],
          },
        },
        {
          id: 'output',
          type: 'output',
          config: {
            label: 'Entregar HTML',
            position: { x: 900, y: 180 },
            successors: [],
          },
        },
      ],
    },
  },
] as const;

async function seedModels(providerIdsBySlug: Record<string, string>) {
  for (const model of AI_MODELS) {
    const providerId = providerIdsBySlug[model.providerSlug];
    if (!providerId) continue;

    const existingModel = await prisma.aIModel.findFirst({
      where: {
        providerId,
        OR: [{ externalModelId: model.externalModelId }, { slug: model.slug }],
      },
      select: { id: true },
    });

    if (existingModel) {
      await prisma.aIModel.update({
        where: { id: existingModel.id },
        data: {
          slug: model.slug,
          name: model.name,
          description: model.description,
          externalModelId: model.externalModelId,
          status: model.status,
          capabilityMetadata: model.capabilityMetadata,
          pricingMetadata: model.pricingMetadata,
          limitsMetadata: model.limitsMetadata,
          schemaMetadata: model.schemaMetadata,
        },
      });
      continue;
    }

    await prisma.aIModel.create({
      data: {
        providerId,
        slug: model.slug,
        name: model.name,
        description: model.description,
        externalModelId: model.externalModelId,
        status: model.status,
        capabilityMetadata: model.capabilityMetadata,
        pricingMetadata: model.pricingMetadata,
        limitsMetadata: model.limitsMetadata,
        schemaMetadata: model.schemaMetadata,
      },
    });
  }
}

function normalizeEnvCredential(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === 'change-me') {
    return null;
  }

  return normalized;
}

function resolveProviderEnvCredential(providerSlug: string): AIRuntimeResolvedCredential | null {
  const envMap: Record<string, string | undefined> = {
    openrouter: process.env.OPENROUTER_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
  };

  const value = normalizeEnvCredential(envMap[providerSlug]);
  if (!value) {
    return null;
  }

  return { id: `env:${providerSlug}`, value, scope: 'platform' };
}

function getProviderAdapter(providerSlug: string) {
  switch (providerSlug) {
    case 'openrouter':
      return new OpenRouterAdapter();
    case 'openai':
      return new OpenAIAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    case 'gemini':
      return new GeminiAdapter();
    default:
      return null;
  }
}

async function syncRemoteModels(providerIdsBySlug: Record<string, string>) {
  const results: string[] = [];

  for (const provider of AI_PROVIDERS) {
    const credential = resolveProviderEnvCredential(provider.slug);
    const adapter = getProviderAdapter(provider.slug);
    const providerId = providerIdsBySlug[provider.slug];

    if (!credential || !adapter || !providerId) {
      results.push(`${provider.slug}: skipped`);
      continue;
    }

    try {
      const models = await adapter.listModels(credential);
      let synced = 0;

      for (const model of models) {
        const existingModel = await prisma.aIModel.findFirst({
          where: {
            providerId,
            OR: [{ externalModelId: model.externalModelId }, { slug: model.slug }],
          },
          select: { id: true },
        });

        if (existingModel) {
          await prisma.aIModel.update({
            where: { id: existingModel.id },
            data: {
              slug: model.slug,
              name: model.name,
              description: model.description,
              externalModelId: model.externalModelId,
              status: model.status,
              capabilityMetadata: toJsonValue(model.capabilityMetadata),
              pricingMetadata: toJsonValue(model.pricingMetadata),
              limitsMetadata: toJsonValue(model.limitsMetadata),
              schemaMetadata: toJsonValue(model.schemaMetadata),
            },
          });
          synced += 1;
          continue;
        }

        await prisma.aIModel.create({
          data: {
            providerId,
            slug: model.slug,
            name: model.name,
            description: model.description,
            externalModelId: model.externalModelId,
            status: model.status,
            capabilityMetadata: toJsonValue(model.capabilityMetadata),
            pricingMetadata: toJsonValue(model.pricingMetadata),
            limitsMetadata: toJsonValue(model.limitsMetadata),
            schemaMetadata: toJsonValue(model.schemaMetadata),
          },
        });
        synced += 1;
      }

      results.push(`${provider.slug}: ${synced} modelos sincronizados`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'sync failed';
      results.push(`${provider.slug}: erro (${message})`);
    }
  }

  return results;
}

async function upsertTestAgent(orgId: string, userId: string, agent: (typeof TEST_AGENTS)[number]) {
  const savedAgent = await prisma.companyAgent.upsert({
    where: {
      organizationId_slug: {
        organizationId: orgId,
        slug: agent.slug,
      },
    },
    update: {
      name: agent.name,
      description: agent.description,
      status: 'active',
      updatedByUserId: userId,
    },
    create: {
      organizationId: orgId,
      slug: agent.slug,
      name: agent.name,
      description: agent.description,
      status: 'active',
      createdByUserId: userId,
      updatedByUserId: userId,
    },
  });

  const existingVersion = await prisma.agentVersion.findFirst({
    where: { agentId: savedAgent.id, versionNumber: 1 },
    orderBy: { createdAt: 'asc' },
  });

  const version = existingVersion
    ? await prisma.agentVersion.update({
        where: { id: existingVersion.id },
        data: {
          status: 'published',
          flowDefinition: agent.flowDefinition,
          inputSchema: {},
          outputSchema: {},
          publishedAt: new Date(),
          publishedByUserId: userId,
        },
      })
    : await prisma.agentVersion.create({
        data: {
          agentId: savedAgent.id,
          versionNumber: 1,
          status: 'published',
          flowDefinition: agent.flowDefinition,
          inputSchema: {},
          outputSchema: {},
          createdByUserId: userId,
          publishedAt: new Date(),
          publishedByUserId: userId,
        },
      });

  await prisma.companyAgent.update({
    where: { id: savedAgent.id },
    data: {
      activeVersionId: version.id,
      status: 'active',
      updatedByUserId: userId,
    },
  });
}

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

  await prisma.platformRoleAssignment.upsert({
    where: {
      userId_role: { userId: user.id, role: 'platform_admin' },
    },
    update: {},
    create: {
      userId: user.id,
      role: 'platform_admin',
      assignedBy: user.id,
    },
  });

  console.log('  Platform role: platform_admin');

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

  const providers = await prisma.aIProvider.findMany({
    where: { slug: { in: AI_PROVIDERS.map((provider) => provider.slug) } },
    select: { id: true, slug: true },
  });
  const providerIdsBySlug = Object.fromEntries(
    providers.map((provider) => [provider.slug, provider.id]),
  );

  await seedModels(providerIdsBySlug);

  console.log(`  AI Models: ${AI_MODELS.map((model) => model.slug).join(', ')}`);

  const remoteSyncResults = await syncRemoteModels(providerIdsBySlug);
  console.log(`  Provider sync: ${remoteSyncResults.join(' | ')}`);

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

  for (const agent of TEST_AGENTS) {
    await upsertTestAgent(org.id, user.id, agent);
  }

  console.log(`  Agentes de teste: ${TEST_AGENTS.map((agent) => agent.slug).join(', ')}`);
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
