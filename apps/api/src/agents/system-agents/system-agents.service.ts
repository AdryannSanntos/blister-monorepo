import { Injectable } from '@nestjs/common';
import type { SystemAgentConfig } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { getSystemAgent, listSystemAgents } from './index';
import { type InitialMessagesOutput, initialMessagesAgent } from './initial-messages.agent';
import { SystemAgentRunnerService } from './system-agent-runner.service';
import type {
  AnySystemAgentDefinition,
  SystemAgentModelConfig,
  SystemAgentRunResult,
} from './system-agent.types';
import { type ThreadTitleOutput, threadTitleAgent } from './thread-title.agent';

export interface SystemAgentConfigInput {
  providerId?: string | null;
  modelId?: string | null;
  temperature?: number | null;
  maxOutputTokens?: number | null;
  enabled?: boolean;
}

export interface SystemAgentAdminView {
  key: string;
  name: string;
  description: string;
  defaultModel: SystemAgentModelConfig | null;
  config: {
    providerId: string | null;
    modelId: string | null;
    temperature: number | null;
    maxOutputTokens: number | null;
    enabled: boolean;
  };
  sampleInput: unknown;
  updatedAt: string | null;
}

const buildDisabledResult = <T>(agentKey: string): SystemAgentRunResult<T> => {
  const now = new Date().toISOString();
  return {
    agentKey,
    status: 'failed',
    data: null,
    errorMessage: 'Agente de sistema desabilitado',
    startedAt: now,
    finishedAt: now,
  };
};

const buildSkippedResult = <T>(agentKey: string, reason: string): SystemAgentRunResult<T> => {
  const now = new Date().toISOString();
  return {
    agentKey,
    status: 'failed',
    data: null,
    errorMessage: reason,
    startedAt: now,
    finishedAt: now,
  };
};

/**
 * Camada de aplicação dos agentes de sistema:
 *  - resolve a configuração editável (provider/modelo) e a injeta no runner;
 *  - expõe geradores tipados consumidos por outros serviços internos;
 *  - expõe operações de admin (listar, detalhar, editar, testar).
 *
 * Nenhuma operação aqui é exposta a usuários de empresa — só o sistema e o admin
 * de plataforma chamam estes caminhos.
 */
@Injectable()
export class SystemAgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: SystemAgentRunnerService,
  ) {}

  // --- Geradores internos -------------------------------------------------

  async generateThreadTitle(
    organizationId: string,
    agentId: string,
    firstMessage: string,
  ): Promise<SystemAgentRunResult<ThreadTitleOutput>> {
    if (!firstMessage.trim()) {
      return buildSkippedResult(threadTitleAgent.key, 'Mensagem vazia');
    }

    const config = await this.loadConfig(threadTitleAgent.key);
    if (config && !config.enabled) {
      return buildDisabledResult(threadTitleAgent.key);
    }

    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: agentId, organizationId },
      select: { name: true, description: true },
    });
    if (!agent) {
      return buildSkippedResult(threadTitleAgent.key, 'Agente não encontrado');
    }

    return this.runner.run(
      threadTitleAgent,
      {
        agentName: agent.name,
        agentDescription: agent.description ?? null,
        firstMessage,
      },
      { organizationId, modelOverride: this.toModelOverride(config) },
    );
  }

  async generateInitialMessages(
    organizationId: string,
    agentId: string,
  ): Promise<SystemAgentRunResult<InitialMessagesOutput>> {
    const config = await this.loadConfig(initialMessagesAgent.key);
    if (config && !config.enabled) {
      return buildDisabledResult(initialMessagesAgent.key);
    }

    const [agent, profile] = await Promise.all([
      this.prisma.companyAgent.findFirst({
        where: { id: agentId, organizationId },
        select: { name: true, description: true },
      }),
      this.prisma.agentContextProfile.findUnique({
        where: { agentId },
        select: { instructions: true },
      }),
    ]);
    if (!agent) {
      return buildSkippedResult(initialMessagesAgent.key, 'Agente não encontrado');
    }

    const companyContext = await this.loadCompanyContext(organizationId);

    return this.runner.run(
      initialMessagesAgent,
      {
        agentName: agent.name,
        agentDescription: agent.description ?? null,
        agentInstructions: profile?.instructions ?? null,
        companyContext,
      },
      { organizationId, modelOverride: this.toModelOverride(config) },
    );
  }

  // --- Admin --------------------------------------------------------------

  async listForAdmin(): Promise<SystemAgentAdminView[]> {
    const configs = await this.prisma.systemAgentConfig.findMany();
    const byKey = new Map(configs.map((config) => [config.key, config]));
    return listSystemAgents().map((definition) =>
      this.toAdminView(definition, byKey.get(definition.key) ?? null),
    );
  }

  async getForAdmin(key: string): Promise<SystemAgentAdminView | null> {
    const definition = getSystemAgent(key);
    if (!definition) {
      return null;
    }
    const config = await this.loadConfig(key);
    return this.toAdminView(definition, config);
  }

  async updateConfig(
    key: string,
    input: SystemAgentConfigInput,
    userId: string,
  ): Promise<SystemAgentAdminView | null> {
    const definition = getSystemAgent(key);
    if (!definition) {
      return null;
    }

    const data = {
      providerId: input.providerId === undefined ? undefined : input.providerId,
      modelId: input.modelId === undefined ? undefined : input.modelId,
      temperature: input.temperature === undefined ? undefined : input.temperature,
      maxOutputTokens: input.maxOutputTokens === undefined ? undefined : input.maxOutputTokens,
      enabled: input.enabled,
      updatedByUserId: userId,
    };

    await this.prisma.systemAgentConfig.upsert({
      where: { key },
      create: {
        key,
        providerId: input.providerId ?? null,
        modelId: input.modelId ?? null,
        temperature: input.temperature ?? null,
        maxOutputTokens: input.maxOutputTokens ?? null,
        enabled: input.enabled ?? true,
        updatedByUserId: userId,
      },
      update: data,
    });

    return this.toAdminView(definition, await this.loadConfig(key));
  }

  /** Roda o agente com input arbitrário (validado) para o playground do admin. */
  async runTest(
    key: string,
    rawInput: unknown,
    organizationId?: string,
  ): Promise<SystemAgentRunResult<unknown> | null> {
    const definition = getSystemAgent(key);
    if (!definition) {
      return null;
    }

    const parsed = definition.inputSchema.safeParse(rawInput ?? definition.sampleInput);
    if (!parsed.success) {
      return buildSkippedResult(key, 'Input inválido para teste');
    }

    const config = await this.loadConfig(key);
    return this.runner.run(definition, parsed.data, {
      organizationId,
      modelOverride: this.toModelOverride(config),
    });
  }

  // --- Internos -----------------------------------------------------------

  private async loadConfig(key: string): Promise<SystemAgentConfig | null> {
    return this.prisma.systemAgentConfig.findUnique({ where: { key } });
  }

  private toModelOverride(config: SystemAgentConfig | null): SystemAgentModelConfig | undefined {
    if (!config) {
      return undefined;
    }
    return {
      providerId: config.providerId ?? undefined,
      modelId: config.modelId ?? undefined,
      temperature: config.temperature ?? undefined,
      maxOutputTokens: config.maxOutputTokens ?? undefined,
    };
  }

  private toAdminView(
    definition: AnySystemAgentDefinition,
    config: SystemAgentConfig | null,
  ): SystemAgentAdminView {
    return {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      defaultModel: definition.model ?? null,
      config: {
        providerId: config?.providerId ?? null,
        modelId: config?.modelId ?? null,
        temperature: config?.temperature ?? null,
        maxOutputTokens: config?.maxOutputTokens ?? null,
        enabled: config?.enabled ?? true,
      },
      sampleInput: definition.sampleInput,
      updatedAt: config?.updatedAt ? config.updatedAt.toISOString() : null,
    };
  }

  private async loadCompanyContext(organizationId: string): Promise<string | null> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const frames: string[] = [];
    if (organization?.name) {
      frames.push(`Empresa: ${organization.name}`);
    }

    const brain = await this.prisma.companyBrain.findUnique({
      where: { organizationId },
      select: { activeVersionId: true },
    });

    if (brain?.activeVersionId) {
      const version = await this.prisma.brainVersion.findUnique({
        where: { id: brain.activeVersionId },
        select: { data: true },
      });
      const summary = this.summarizeBrain(version?.data);
      if (summary) {
        frames.push(`Brain da empresa: ${summary}`);
      }
    }

    return frames.length > 0 ? frames.join('\n') : null;
  }

  private summarizeBrain(data: unknown): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const serialized = JSON.stringify(data);
    if (serialized === '{}' || serialized === 'null') {
      return null;
    }
    return serialized.length > 1500 ? `${serialized.slice(0, 1500)}…` : serialized;
  }
}
