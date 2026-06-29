import type { AgentCapability, AgentCatalogItem } from '@company-os/types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { buildRegisteredAgents } from '../agent-catalog';

export interface RegisteredAgent {
  agentId: string;
  version?: string;
  label: string;
  description?: string;
  icon?: string;
  capabilities: AgentCapability[];
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  reviewSchema?: z.ZodType;
  steps: AgentStepDefinition[];
  isEnabled: boolean;
  estimatedCreditCost?: number;
}

export interface AgentStepDefinition {
  key: string;
  label: string;
  type:
    | 'preparation'
    | 'clarification'
    | 'llm_call'
    | 'validation'
    | 'form'
    | 'decision'
    | 'output'
    | 'image_generation';
  config?: Record<string, unknown>;
}

@Injectable()
export class AgentRegistryService implements OnModuleInit {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly agents = new Map<string, RegisteredAgent>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.registerBuiltInAgents();
    await this.syncWithDatabase();
  }

  register(agent: RegisteredAgent): void {
    if (this.agents.has(agent.agentId)) {
      this.logger.warn(`Agent ${agent.agentId} already registered, replacing`);
    }
    this.agents.set(agent.agentId, agent);
    this.logger.log(`Registered agent: ${agent.agentId}`);
  }

  get(agentId: string): RegisteredAgent | undefined {
    return this.agents.get(agentId);
  }

  getOrThrow(agentId: string): RegisteredAgent {
    const agent = this.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  list(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  listEnabled(): RegisteredAgent[] {
    return this.list().filter((a) => a.isEnabled);
  }

  async getCatalog(): Promise<AgentCatalogItem[]> {
    const dbConfigs = await this.prisma.pipelineAgentConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const catalog: AgentCatalogItem[] = [];

    for (const config of dbConfigs) {
      const agent = this.agents.get(config.agentId);
      if (agent) {
        catalog.push({
          agentId: agent.agentId,
          label: agent.label,
          description: agent.description ?? null,
          icon: agent.icon ?? null,
          capabilities: agent.capabilities,
          isEnabled: config.isEnabled && agent.isEnabled,
          estimatedCreditCost: agent.estimatedCreditCost ?? null,
          sortOrder: config.sortOrder,
        });
      }
    }

    return catalog;
  }

  async updateAgentConfig(
    agentId: string,
    config: { isEnabled?: boolean; sortOrder?: number },
  ): Promise<void> {
    await this.prisma.pipelineAgentConfig.upsert({
      where: { agentId },
      update: config,
      create: {
        agentId,
        isEnabled: config.isEnabled ?? true,
        sortOrder: config.sortOrder ?? 999,
      },
    });

    const agent = this.agents.get(agentId);
    if (agent && config.isEnabled !== undefined) {
      agent.isEnabled = config.isEnabled;
    }
  }

  private registerBuiltInAgents(): void {
    for (const agent of buildRegisteredAgents()) {
      this.register(agent);
    }
  }

  private async syncWithDatabase(): Promise<void> {
    for (const agent of this.agents.values()) {
      const existing = await this.prisma.pipelineAgentConfig.findUnique({
        where: { agentId: agent.agentId },
      });

      if (!existing) {
        await this.prisma.pipelineAgentConfig.create({
          data: {
            agentId: agent.agentId,
            isEnabled: true,
            sortOrder: this.getDefaultSortOrder(agent.agentId),
          },
        });
      } else {
        agent.isEnabled = existing.isEnabled;
      }
    }

    this.logger.log(`Synced ${this.agents.size} agents with database`);
  }

  private getDefaultSortOrder(agentId: string): number {
    const order: Record<string, number> = {
      research: 0,
      cuts: 1,
      carousel: 2,
      video_editor: 3,
    };
    return order[agentId] ?? 999;
  }
}
