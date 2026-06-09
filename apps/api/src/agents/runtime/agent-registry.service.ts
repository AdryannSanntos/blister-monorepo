import type { AgentCapability, AgentCatalogItem, AgentDefinition } from '@company-os/types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';

export interface RegisteredAgent {
  agentId: string;
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
  executor?: StepExecutor;
}

export type StepExecutor = (context: StepExecutionContext) => Promise<StepExecutionResult>;

export interface StepExecutionContext {
  runId: string;
  agentId: string;
  companyId: string;
  campaignId: string | null;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
  previousStepsOutput: Record<string, Record<string, unknown>>;
  contextPack: unknown;
  brandProfile: unknown;
  llmComplete: (messages: unknown[], options?: unknown) => Promise<unknown>;
}

export interface StepExecutionResult {
  type: 'CONTINUE' | 'PAUSED' | 'FAILED' | 'COMPLETE';
  output?: Record<string, unknown>;
  error?: string;
  pauseReason?: string;
  pauseFormSchema?: unknown;
  llmModel?: string;
  tokensInput?: number;
  tokensOutput?: number;
  creditCost?: number;
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
    this.register(this.createStrategistAgent());
    this.register(this.createCopywriterAgent());
    this.register(this.createDesignerAgent());
    this.register(this.createPostAgent());
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
      strategist: 1,
      copywriter: 2,
      designer: 3,
      post: 4,
    };
    return order[agentId] ?? 999;
  }

  private createStrategistAgent(): RegisteredAgent {
    return {
      agentId: 'strategist',
      label: 'Planejar conteúdo',
      description: 'Analisa o briefing e cria um plano de conteúdo estratégico',
      icon: 'compass',
      capabilities: ['strategy', 'planning', 'analysis'],
      inputSchema: z.object({
        userInput: z.string().min(1).max(10000),
        context: z.string().optional(),
      }),
      outputSchema: z.object({
        plan: z.string(),
        angles: z.array(z.string()),
        suggestedCalendar: z
          .array(
            z.object({
              date: z.string(),
              topic: z.string(),
              format: z.string(),
            }),
          )
          .optional(),
        summary: z.string(),
      }),
      reviewSchema: z.object({
        plan: z.string(),
        summary: z.string(),
      }),
      steps: [
        { key: 'analyze', label: 'Analisar contexto', type: 'llm_call' },
        { key: 'generate_plan', label: 'Gerar plano', type: 'llm_call' },
        { key: 'output', label: 'Formatar saída', type: 'output' },
      ],
      isEnabled: true,
      estimatedCreditCost: 0.05,
    };
  }

  private createCopywriterAgent(): RegisteredAgent {
    return {
      agentId: 'copywriter',
      label: 'Criar texto',
      description: 'Gera legendas, hashtags e variações de texto para posts',
      icon: 'pen-tool',
      capabilities: ['text_generation'],
      inputSchema: z.object({
        userInput: z.string().min(1).max(10000),
        tone: z.string().optional(),
        platform: z.enum(['instagram', 'facebook', 'linkedin', 'twitter']).optional(),
      }),
      outputSchema: z.object({
        caption: z.string(),
        hashtags: z.array(z.string()),
        variations: z
          .array(
            z.object({
              caption: z.string(),
              tone: z.string(),
            }),
          )
          .optional(),
        callToAction: z.string().optional(),
      }),
      reviewSchema: z.object({
        caption: z.string(),
        hashtags: z.array(z.string()),
      }),
      steps: [
        { key: 'analyze', label: 'Analisar briefing', type: 'llm_call' },
        { key: 'generate_copy', label: 'Gerar texto', type: 'llm_call' },
        { key: 'output', label: 'Formatar saída', type: 'output' },
      ],
      isEnabled: true,
      estimatedCreditCost: 0.03,
    };
  }

  private createDesignerAgent(): RegisteredAgent {
    return {
      agentId: 'designer',
      label: 'Gerar imagem',
      description: 'Cria visuais para posts usando a identidade da marca',
      icon: 'image',
      capabilities: ['image_generation'],
      inputSchema: z.object({
        userInput: z.string().min(1).max(10000),
        format: z.enum(['square', 'portrait', 'landscape']).optional(),
        style: z.string().optional(),
      }),
      outputSchema: z.object({
        imageStorageKey: z.string(),
        prompt: z.string(),
        format: z.string(),
        width: z.number(),
        height: z.number(),
      }),
      steps: [
        { key: 'analyze', label: 'Analisar requisitos', type: 'llm_call' },
        { key: 'generate_prompt', label: 'Gerar prompt', type: 'llm_call' },
        { key: 'generate_image', label: 'Gerar imagem', type: 'llm_call' },
        { key: 'output', label: 'Formatar saída', type: 'output' },
      ],
      isEnabled: true,
      estimatedCreditCost: 0.1,
    };
  }

  private createPostAgent(): RegisteredAgent {
    return {
      agentId: 'post',
      label: 'Criar post',
      description: 'Cria posts para redes sociais em HTML+CSS usando a identidade da marca',
      icon: 'package',
      capabilities: ['text_generation'],
      inputSchema: z.object({
        userInput: z.string().min(1).max(10000),
      }),
      outputSchema: z.object({
        platform: z.string(),
        format: z.enum(['single', 'carousel']),
        width: z.number(),
        height: z.number(),
        slidesCount: z.number().optional(),
        slides: z.array(z.object({ html: z.string() })),
        caption: z.string(),
        hashtags: z.array(z.string()),
      }),
      reviewSchema: z.object({
        caption: z.string(),
        hashtags: z.array(z.string()),
      }),
      steps: [
        { key: 'retrieve_context', label: 'Buscar contexto', type: 'preparation' },
        { key: 'collect_brief', label: 'Entender o pedido', type: 'clarification' },
        { key: 'plan_design', label: 'Planejar o design', type: 'llm_call' },
        { key: 'approve_design_plan', label: 'Aprovar plano de design', type: 'clarification' },
        { key: 'generate_post', label: 'Montar o post', type: 'llm_call' },
        { key: 'validate_output', label: 'Validar saída', type: 'validation' },
      ],
      isEnabled: true,
      estimatedCreditCost: 0.22,
    };
  }
}
