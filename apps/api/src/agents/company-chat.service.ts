import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagContextAssemblyService } from '../rag/rag-context-assembly.service';
import { AgentChatService } from './agent-chat.service';
import { AgentIntentService } from './agent-intent.service';
import { ContextRerankerService } from './context/context-reranker.service';
import { StructuredContextService } from './context/structured-context.service';

type CompanyChatResult = {
  threadId: string;
  message: { id: string; content: string; role: string };
  delegatedToAgentId?: string;
  delegatedExecutionId?: string;
  fallbackMode?: 'context_agent';
  cards: Array<{ type: string; metadata?: Record<string, unknown> }>;
  responseTarget: 'company_chat';
  contextSources: Array<{ sourceLabel: string; snippet: string; score: number }>;
};

@Injectable()
export class CompanyChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentChatService: AgentChatService,
    private readonly agentIntentService: AgentIntentService,
    private readonly structuredContextService: StructuredContextService,
    private readonly contextRerankerService: ContextRerankerService,
    private readonly ragContextAssemblyService: RagContextAssemblyService,
  ) {}

  async handleMessage(
    organizationId: string,
    userId: string,
    content: string,
    permissions: string[] = [],
    threadId?: string,
  ): Promise<CompanyChatResult> {
    let resolvedThreadId = threadId;
    if (!resolvedThreadId) {
      const thread = await this.agentChatService.createThread(organizationId, userId, {
        scope: 'company_chat',
        title: content.slice(0, 80),
      });
      resolvedThreadId = thread.id;
    }

    const result = await this.agentChatService.createUserMessageAndProcess(organizationId, userId, {
      threadId: resolvedThreadId,
      content,
    });

    const [structuredContext, ragPack] = await Promise.all([
      this.structuredContextService.loadContext({
        organizationId,
        permissions: permissions.length
          ? permissions
          : ['brain.read', 'asset.read', 'agent.read', 'member.read'],
        userId,
      }),
      this.ragContextAssemblyService.assemble(organizationId, content, {
        limit: 5,
        permissions,
      }).catch(() => ({ query: content, chunks: [], totalFound: 0 })),
    ]);

    const structuredItems = Object.entries(structuredContext)
      .filter(([, v]) => v !== null && (!Array.isArray(v) || v.length > 0))
      .map(([key, value]) => ({
        sourceLabel: key,
        snippet: JSON.stringify(value).slice(0, 300),
        score: 0,
      }));

    const ragItems = ragPack.chunks.map(
      (c: { title: string | null; sourceType: string; snippet: string; score: number }) => ({
        sourceLabel: c.title ?? c.sourceType,
        snippet: c.snippet,
        score: c.score,
      }),
    );

    const reranked = this.contextRerankerService.rerank({
      query: content,
      structured: structuredItems,
      rag: ragItems,
      limit: 8,
    });

    const customAgents = await this.prisma.companyAgent.findMany({
      where: { organizationId, status: 'active' },
      select: { id: true, name: true, slug: true },
      take: 5,
    });

    const cards: CompanyChatResult['cards'] = [];

    if (customAgents.length === 0) {
      cards.push({ type: 'create_agent', metadata: { suggestion: 'No custom agents found' } });
    }

    const decision = await this.agentIntentService.classify({ message: content });
    let delegatedToAgentId: string | undefined;
    let delegatedExecutionId: string | undefined;

    if (decision.mode === 'execution' && customAgents.length > 0) {
      delegatedToAgentId = customAgents[0].id;
      if (result.run) {
        delegatedExecutionId = result.run.id;
      }
    }

    return {
      threadId: resolvedThreadId,
      message: {
        id: result.message.id,
        content: result.message.content,
        role: result.message.role,
      },
      delegatedToAgentId,
      delegatedExecutionId,
      fallbackMode: customAgents.length === 0 ? 'context_agent' : undefined,
      cards,
      responseTarget: 'company_chat',
      contextSources: reranked,
    };
  }
}
