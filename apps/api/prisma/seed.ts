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

// V2 agent flowDefinition: usa edges explícitas + tipos de bloco da V2 (llm_call, output_formatter, finalizer)
// Todos os agentes usam OpenRouter via auto-seleção (só há um modelo ativo de texto: nemotron-3-super)
const TEST_AGENTS = [
  {
    slug: 'redator-linkedin',
    name: 'Redator de Copy LinkedIn',
    description: 'Transforma um briefing em um post de LinkedIn profissional com gancho, desenvolvimento e CTA.',
    flowDefinition: {
      config: {
        name: 'Redator LinkedIn',
        objective: 'Gerar post de LinkedIn a partir de um briefing em linguagem natural.',
        instructions: 'Tom B2B, direto, confiante e orientado a execucao. Portugues do Brasil.',
        fallbackMessage: 'Nao consegui gerar a copy. Tente com um briefing mais detalhado.',
      },
      nodes: [
        {
          id: 'input_1',
          type: 'input',
          config: {
            label: 'Briefing',
            position: { x: 80, y: 200 },
          },
        },
        {
          id: 'llm_1',
          type: 'llm_call',
          config: {
            label: 'Gerar copy',
            prompt:
              'Voce e um redator senior de marketing B2B especializado em LinkedIn. ' +
              'Com base no briefing do usuario, escreva um post de LinkedIn com:\n' +
              '1) Gancho inicial impactante (1-2 linhas)\n' +
              '2) Desenvolvimento claro e objetivo (3-5 paragrafos curtos)\n' +
              '3) Encerramento com CTA direto\n\n' +
              'Use espacamento com linha em branco entre paragrafos. ' +
              'Nao use hashtags em excesso (maximo 3). ' +
              'Escreva apenas o texto final do post, sem explicacoes adicionais.',
            position: { x: 380, y: 200 },
          },
        },
        {
          id: 'formatter_1',
          type: 'output_formatter',
          config: {
            label: 'Formatar saida',
            outputBlocks: ['markdown'],
            position: { x: 680, y: 200 },
          },
        },
        {
          id: 'finalizer_1',
          type: 'finalizer',
          config: {
            label: 'Entregar',
            position: { x: 980, y: 200 },
          },
        },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'input_1', sourcePortKey: 'payload', targetNodeId: 'llm_1', targetPortKey: 'payload' },
        { id: 'e2', sourceNodeId: 'llm_1', sourcePortKey: 'text', targetNodeId: 'formatter_1', targetPortKey: 'default' },
        { id: 'e3', sourceNodeId: 'formatter_1', sourcePortKey: 'ui_output', targetNodeId: 'finalizer_1', targetPortKey: 'ui_output' },
      ],
    },
  },
  {
    slug: 'estruturador-briefing',
    name: 'Estruturador de Briefing',
    description: 'Recebe uma descricao livre de projeto e entrega um briefing estruturado com escopo, entregaveis e criterios de aceite.',
    flowDefinition: {
      config: {
        name: 'Estruturador de Briefing',
        objective: 'Transformar uma descricao solta em um briefing claro e acionavel.',
        instructions: 'Saida estruturada em Markdown. Portugues do Brasil. Seja especifico e direto.',
        fallbackMessage: 'Nao consegui estruturar o briefing. Tente descrever melhor o projeto.',
      },
      nodes: [
        {
          id: 'input_1',
          type: 'input',
          config: {
            label: 'Descricao do projeto',
            position: { x: 80, y: 200 },
          },
        },
        {
          id: 'llm_1',
          type: 'llm_call',
          config: {
            label: 'Estruturar briefing',
            prompt:
              'Voce e um especialista em gestao de projetos e comunicacao operacional. ' +
              'Receba a descricao de projeto do usuario e entregue um briefing estruturado em Markdown com as seguintes secoes:\n\n' +
              '## Objetivo\n' +
              '## Contexto\n' +
              '## Escopo (o que esta e o que nao esta incluido)\n' +
              '## Entregaveis esperados\n' +
              '## Criterios de aceite\n' +
              '## Prazo sugerido\n' +
              '## Observacoes\n\n' +
              'Seja especifico, claro e acionavel. Infira o que nao foi dito quando necessario, mas indique com "(inferido)".',
            position: { x: 380, y: 200 },
          },
        },
        {
          id: 'formatter_1',
          type: 'output_formatter',
          config: {
            label: 'Formatar briefing',
            outputBlocks: ['markdown'],
            position: { x: 680, y: 200 },
          },
        },
        {
          id: 'finalizer_1',
          type: 'finalizer',
          config: {
            label: 'Entregar briefing',
            position: { x: 980, y: 200 },
          },
        },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'input_1', sourcePortKey: 'payload', targetNodeId: 'llm_1', targetPortKey: 'payload' },
        { id: 'e2', sourceNodeId: 'llm_1', sourcePortKey: 'text', targetNodeId: 'formatter_1', targetPortKey: 'default' },
        { id: 'e3', sourceNodeId: 'formatter_1', sourcePortKey: 'ui_output', targetNodeId: 'finalizer_1', targetPortKey: 'ui_output' },
      ],
    },
  },
  {
    slug: 'consultor-email-marketing',
    name: 'Consultor de Email Marketing',
    description: 'Cria uma campanha de email marketing completa (assunto, pre-header e corpo) a partir de um briefing.',
    flowDefinition: {
      config: {
        name: 'Email Marketing',
        objective: 'Gerar email de campanha pronto para envio a partir de um briefing.',
        instructions: 'Portugues do Brasil. Tom B2B, claro e com CTA evidente.',
        fallbackMessage: 'Nao consegui gerar o email. Descreva melhor o objetivo da campanha.',
      },
      nodes: [
        {
          id: 'input_1',
          type: 'input',
          config: {
            label: 'Briefing da campanha',
            position: { x: 80, y: 200 },
          },
        },
        {
          id: 'llm_1',
          type: 'llm_call',
          config: {
            label: 'Criar email',
            prompt:
              'Voce e um especialista em email marketing B2B. ' +
              'Com base no briefing do usuario, crie um email de campanha completo em Markdown com o seguinte formato:\n\n' +
              '**Assunto:** (maximo 60 caracteres, direto e com beneficio claro)\n\n' +
              '**Pre-header:** (maximo 90 caracteres, complementa o assunto)\n\n' +
              '---\n\n' +
              '**Corpo do email:**\n\n' +
              '[Saudacao personalizada]\n\n' +
              '[Abertura com contexto e relevancia — 1-2 paragrafos]\n\n' +
              '[Desenvolvimento: proposta de valor, argumento central — 2-3 paragrafos]\n\n' +
              '[CTA claro e unico — botao ou link em destaque]\n\n' +
              '[Fechamento]\n\n' +
              '---\n\n' +
              'Mantenha tom B2B, evite jargoes e seja especifico sobre o beneficio para o leitor.',
            position: { x: 380, y: 200 },
          },
        },
        {
          id: 'formatter_1',
          type: 'output_formatter',
          config: {
            label: 'Formatar email',
            outputBlocks: ['markdown'],
            position: { x: 680, y: 200 },
          },
        },
        {
          id: 'finalizer_1',
          type: 'finalizer',
          config: {
            label: 'Entregar email',
            position: { x: 980, y: 200 },
          },
        },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'input_1', sourcePortKey: 'payload', targetNodeId: 'llm_1', targetPortKey: 'payload' },
        { id: 'e2', sourceNodeId: 'llm_1', sourcePortKey: 'text', targetNodeId: 'formatter_1', targetPortKey: 'default' },
        { id: 'e3', sourceNodeId: 'formatter_1', sourcePortKey: 'ui_output', targetNodeId: 'finalizer_1', targetPortKey: 'ui_output' },
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

async function clearOrgAgents(orgId: string) {
  const agents = await prisma.companyAgent.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });

  if (agents.length === 0) return;

  const agentIds = agents.map((a) => a.id);

  // Null out activeVersionId to remove circular FK before deleting versions
  await prisma.companyAgent.updateMany({
    where: { id: { in: agentIds } },
    data: { activeVersionId: null },
  });

  // Delete versions, runs (cascade), threads (cascade), then agents
  await prisma.agentVersion.deleteMany({ where: { agentId: { in: agentIds } } });
  await prisma.agentRun.deleteMany({ where: { agentId: { in: agentIds } } });
  await prisma.agentChatThread.deleteMany({ where: { agentId: { in: agentIds } } });
  await prisma.companyAgent.deleteMany({ where: { id: { in: agentIds } } });
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

  await clearOrgAgents(org.id);
  console.log('  Agentes anteriores: removidos');

  for (const agent of TEST_AGENTS) {
    await upsertTestAgent(org.id, user.id, agent);
  }

  console.log(`  Agentes: ${TEST_AGENTS.map((agent) => agent.name).join(', ')}`);
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
