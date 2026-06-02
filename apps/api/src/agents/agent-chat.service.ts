import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationSseService, type SseSink } from '../conversation/conversation-sse.service';
import { ConversationService } from '../conversation/conversation.service';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentChatOrchestratorService } from './agent-chat-orchestrator.service';
import { AgentIntentService } from './agent-intent.service';
import { AgentRunsService } from './agent-runs.service';
import type {
  CreateMessageDto,
  CreateThreadDto,
  EditMessageAndBranchDto,
  OrchestrationToolCall,
} from './dto';
import { SystemAgentsService } from './system-agents/system-agents.service';

export interface StreamAssistantReplyInput {
  agentId: string;
  threadId: string;
  content: string;
  attachments?: Array<{ kind: 'image' | 'file'; url: string; name?: string; mimeType?: string }>;
}

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

@Injectable()
export class AgentChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentIntentService: AgentIntentService,
    private readonly agentRunsService: AgentRunsService,
    private readonly agentChatOrchestratorService: AgentChatOrchestratorService,
    private readonly systemAgentsService: SystemAgentsService,
    private readonly conversationService: ConversationService,
    private readonly conversationSse: ConversationSseService,
  ) {}

  /**
   * SSE-first chat path: persists the user message, opens an assistant message
   * container, then streams the orchestrator's semantic events. Every event is
   * appended to the conversation log (assigning a `sequence`) and written to the
   * client live. Persistence is the source of truth — a dropped client can rebuild
   * the full narrative via {@link getThreadReplay}.
   */
  async streamAssistantReply(
    organizationId: string,
    userId: string,
    input: StreamAssistantReplyInput,
    sink: SseSink,
    options: { isAborted?: () => boolean } = {},
  ): Promise<void> {
    const thread = await this.ensureThreadExists(input.threadId);
    if (thread.organizationId !== organizationId || thread.createdByUserId !== userId) {
      throw new NotFoundException('Chat thread not found in organization');
    }
    if (!thread.agentId || thread.agentId !== input.agentId) {
      throw new NotFoundException('Chat thread not found for agent');
    }

    await this.createChatMessage({
      threadId: thread.id,
      role: 'user',
      content: input.content,
      metadata: toJsonValue({ attachments: input.attachments ?? [] }),
      createdByUserId: userId,
    });

    const assistantMessage = await this.createChatMessage({
      threadId: thread.id,
      role: 'assistant',
      content: '',
      metadata: toJsonValue({}),
    });

    // Primeira mensagem de uma thread ainda sem título → gera um título curto em
    // paralelo ao turno. O frontend mostra um shimmer até a thread recarregar.
    const titlePromise =
      !thread.title && thread.agentId
        ? this.systemAgentsService
            .generateThreadTitle(organizationId, thread.agentId, input.content)
            .then((result) => (result.status === 'completed' ? (result.data?.title ?? null) : null))
            .catch(() => null)
        : null;

    const append = async (eventType: string, payload: Record<string, unknown>) => {
      const { event } = await this.conversationService.appendEvent({
        organizationId,
        threadId: thread.id,
        messageId: assistantMessage.id,
        eventType,
        payload,
      } as Parameters<ConversationService['appendEvent']>[0]);
      this.conversationSse.writeEvent(sink, event);
      return event;
    };

    let finalText = '';
    let finalCitations: unknown[] = [];

    try {
      await append('message_created', { role: 'assistant' });

      for await (const emit of this.agentChatOrchestratorService.streamTurn({
        organizationId,
        agentId: thread.agentId,
        userId,
        message: input.content,
        threadId: thread.id,
      })) {
        if (options.isAborted?.()) break;
        await append(emit.eventType, emit.payload);

        if (emit.eventType === 'message_completed') {
          finalText = typeof emit.payload.text === 'string' ? emit.payload.text : finalText;
          finalCitations = Array.isArray(emit.payload.citations) ? emit.payload.citations : [];
        } else if (emit.eventType === 'message_text_snapshot' && !finalText) {
          finalText = typeof emit.payload.text === 'string' ? emit.payload.text : '';
        }
      }

      await this.prisma.agentChatMessage.update({
        where: { id: assistantMessage.id },
        data: { content: finalText, metadata: toJsonValue({ citations: finalCitations }) },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar a resposta';
      await append('message_failed', { errorMessage: message }).catch(() => undefined);
      await this.prisma.agentChatMessage
        .update({
          where: { id: assistantMessage.id },
          data: {
            content: finalText,
            metadata: toJsonValue({ failed: true, errorMessage: message }),
          },
        })
        .catch(() => undefined);
    } finally {
      if (titlePromise) {
        const generatedTitle = await titlePromise;
        if (generatedTitle) {
          await this.prisma.agentChatThread
            .update({ where: { id: thread.id }, data: { title: generatedTitle } })
            .catch(() => undefined);
        }
      }
      sink.end?.();
    }
  }

  /**
   * Replay-friendly thread read: each persisted message enriched with its
   * conversation projection (streamed text, status, tool calls, citations) so the
   * frontend renders the same operational narrative seen live.
   */
  async getThreadReplay(organizationId: string, threadId: string, userId: string) {
    const thread = await this.prisma.agentChatThread.findFirst({
      where: { id: threadId, organizationId },
      select: { id: true, createdByUserId: true },
    });
    if (!thread || thread.createdByUserId !== userId) {
      throw new NotFoundException('Chat thread not found');
    }

    const [messages, conversation] = await Promise.all([
      this.prisma.agentChatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          metadata: true,
          editedFromMessageId: true,
          regeneratedFromMessageId: true,
          createdAt: true,
        },
      }),
      this.conversationService.getThreadReplay(organizationId, threadId),
    ]);

    const projectionByMessageId = new Map(conversation.messages.map((m) => [m.messageId, m]));

    return {
      threadId,
      lastSequence: conversation.lastSequence,
      messages: messages.map((message) => {
        const projection = projectionByMessageId.get(message.id);
        return {
          id: message.id,
          role: message.role,
          content: projection?.text ? projection.text : message.content,
          status: projection?.status ?? 'completed',
          isStreaming: projection?.isStreaming ?? false,
          isFailed: projection?.isFailed ?? false,
          errorMessage: projection?.errorMessage ?? null,
          citations: projection?.citations ?? [],
          toolCalls: projection?.toolCalls ?? [],
          metadata: message.metadata,
          editedFromMessageId: message.editedFromMessageId,
          regeneratedFromMessageId: message.regeneratedFromMessageId,
          createdAt: message.createdAt,
        };
      }),
    };
  }

  async createThread(organizationId: string, userId: string, input: CreateThreadDto) {
    if (input.agentId) {
      await this.ensureAgentBelongsToOrganization(organizationId, input.agentId);
    }

    return this.prisma.agentChatThread.create({
      data: {
        organizationId,
        agentId: input.agentId,
        scope: input.scope,
        title: input.title,
        createdByUserId: userId,
      },
    });
  }

  async createUserMessageAndProcess(
    organizationId: string,
    userId: string,
    input: CreateMessageDto,
  ) {
    const thread = await this.ensureThreadExists(input.threadId);

    if (thread.organizationId !== organizationId) {
      throw new NotFoundException('Chat thread not found in organization');
    }

    const message = await this.createChatMessage({
      threadId: input.threadId,
      role: 'user',
      content: input.content,
      metadata: toJsonValue({ attachments: input.attachments ?? [] }),
      createdByUserId: userId,
    });

    if (!thread.agentId) {
      const decision = await this.agentIntentService.classify({ message: input.content });
      return { message, decision, run: null };
    }

    const orchestration = await this.agentChatOrchestratorService.orchestrateMessage({
      organizationId,
      agentId: thread.agentId,
      userId,
      message: input.content,
      threadId: thread.id,
    });

    const assistantMessage = await this.createChatMessage({
      threadId: thread.id,
      role: 'assistant',
      content: orchestration.assistantMessage,
      metadata: toJsonValue({
        orchestration,
        toolParts: orchestration.toolParts ?? [],
        citations: orchestration.citations ?? [],
      }),
    });

    await this.persistToolCallAudit({
      organizationId,
      agentId: thread.agentId,
      threadId: thread.id,
      messageId: assistantMessage.id,
      userId,
      toolCalls: orchestration.toolCalls ?? [],
    });

    if (!orchestration.createRun) {
      return { message, assistantMessage, orchestration, run: null };
    }

    await this.ensureThreadHasNoActiveExecution(thread.id);

    const run = await this.agentRunsService.createQueuedRun(
      thread.organizationId,
      thread.agentId,
      userId,
      {
        input: {
          message: input.content,
          threadId: thread.id,
          messageId: message.id,
          attachments: input.attachments ?? [],
        },
      },
    );

    return { message, assistantMessage, orchestration, run };
  }

  async editMessageAndBranch(
    organizationId: string,
    input: EditMessageAndBranchDto,
    userId: string,
  ) {
    const originalMessage = await this.prisma.agentChatMessage.findFirst({
      where: {
        id: input.messageId,
        threadId: input.threadId,
        thread: { organizationId },
      },
    });

    if (!originalMessage) {
      throw new NotFoundException('Chat message not found');
    }

    if (originalMessage.role !== 'user') {
      throw new BadRequestException('Only user messages can be edited into a new branch');
    }

    const originalThread = await this.prisma.agentChatThread.findUnique({
      where: { id: input.threadId },
    });

    if (!originalThread || originalThread.organizationId !== organizationId) {
      throw new NotFoundException('Chat thread not found');
    }

    if (originalThread.createdByUserId !== userId) {
      throw new NotFoundException('Chat thread not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const branchThread = await tx.agentChatThread.create({
        data: {
          organizationId: originalThread.organizationId,
          agentId: originalThread.agentId,
          scope: originalThread.scope,
          title: originalThread.title,
          parentThreadId: originalThread.id,
          branchedFromMessageId: originalMessage.id,
          createdByUserId: userId,
        },
      });

      const previousMessages = await tx.agentChatMessage.findMany({
        where: {
          threadId: originalThread.id,
          createdAt: { lt: originalMessage.createdAt },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (previousMessages.length > 0) {
        await tx.agentChatMessage.createMany({
          data: previousMessages.map((message) => ({
            threadId: branchThread.id,
            role: message.role,
            content: message.content,
            metadata: toJsonValue(message.metadata ?? {}),
            createdByUserId: message.createdByUserId,
          })),
        });
      }

      // The edited user message + its assistant reply are produced by the SSE
      // stream after the client navigates to the branch — single message path.
      return { branchId: branchThread.id, replacedMessageId: originalMessage.id };
    });
  }

  async listThreads(
    organizationId: string,
    agentId: string,
    userId: string,
    options: { cursor?: string; limit: number },
  ) {
    await this.ensureAgentBelongsToOrganization(organizationId, agentId);

    const threads = await this.prisma.agentChatThread.findMany({
      where: {
        organizationId,
        agentId,
        scope: 'agent_chat',
        createdByUserId: userId,
        ...(options.cursor ? { id: { lt: options.cursor } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: options.limit,
      select: {
        id: true,
        title: true,
        scope: true,
        agentId: true,
        parentThreadId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            agentRun: {
              select: { status: true },
            },
          },
        },
      },
    });

    return {
      threads: threads.map(({ messages, ...thread }) => ({
        ...thread,
        hasActiveRun:
          messages[0]?.agentRun?.status === 'queued' || messages[0]?.agentRun?.status === 'running',
      })),
      nextCursor: threads.length === options.limit ? threads[threads.length - 1]?.id : null,
    };
  }

  async listCompanyThreads(
    organizationId: string,
    userId: string,
    options: { cursor?: string; limit: number },
  ) {
    const threads = await this.prisma.agentChatThread.findMany({
      where: {
        organizationId,
        scope: 'company_chat',
        createdByUserId: userId,
        ...(options.cursor ? { id: { lt: options.cursor } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: options.limit,
      select: {
        id: true,
        title: true,
        scope: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return {
      threads,
      nextCursor: threads.length === options.limit ? threads[threads.length - 1]?.id : null,
    };
  }

  async listMessages(
    organizationId: string,
    threadId: string,
    userId: string,
    options: { cursor?: string; limit: number },
  ) {
    const thread = await this.prisma.agentChatThread.findFirst({
      where: { id: threadId, organizationId },
      select: { id: true, createdByUserId: true },
    });

    if (!thread) throw new NotFoundException('Chat thread not found');
    if (thread.createdByUserId !== userId) throw new NotFoundException('Chat thread not found');

    const messages = await this.prisma.agentChatMessage.findMany({
      where: {
        threadId,
        ...(options.cursor ? { id: { lt: options.cursor } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: options.limit,
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        agentRunId: true,
        editedFromMessageId: true,
        regeneratedFromMessageId: true,
        createdAt: true,
        agentRun: {
          select: {
            id: true,
            status: true,
            queuePosition: true,
            errorMessage: true,
            steps: {
              select: {
                id: true,
                blockKey: true,
                blockType: true,
                status: true,
                inputPayload: true,
                outputPayload: true,
                errorMessage: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    return {
      messages,
      nextCursor: messages.length === options.limit ? messages[messages.length - 1]?.id : null,
    };
  }

  async deleteThread(organizationId: string, agentId: string, threadId: string, userId: string) {
    const thread = await this.prisma.agentChatThread.findFirst({
      where: {
        id: threadId,
        organizationId,
        agentId,
        scope: 'agent_chat',
        createdByUserId: userId,
      },
      select: { id: true },
    });

    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }

    await this.ensureThreadHasNoActiveExecution(threadId);
    await this.prisma.agentChatThread.delete({ where: { id: threadId } });

    return { id: threadId };
  }

  async renameThread(organizationId: string, threadId: string, userId: string, title: string) {
    const thread = await this.prisma.agentChatThread.findFirst({
      where: { id: threadId, organizationId, createdByUserId: userId },
    });
    if (!thread) throw new NotFoundException('Chat thread not found');
    return this.prisma.agentChatThread.update({
      where: { id: threadId },
      data: { title },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  private async ensureThreadExists(threadId: string) {
    const thread = await this.prisma.agentChatThread.findUnique({ where: { id: threadId } });

    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }

    return thread;
  }

  private async ensureThreadHasNoActiveExecution(threadId: string) {
    const activeRunLinkedToThread = await this.prisma.agentRun.findFirst({
      where: {
        threadId,
        status: { in: ['queued', 'running'] },
      },
      select: { id: true },
    });

    if (activeRunLinkedToThread) {
      throw new BadRequestException('Thread already has an active execution');
    }
  }

  private createChatMessage(
    data: {
      threadId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      metadata?: Prisma.InputJsonValue;
      createdByUserId?: string | null;
      agentRunId?: string;
      editedFromMessageId?: string;
      regeneratedFromMessageId?: string;
    },
    prisma: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    return prisma.agentChatMessage.create({
      data: {
        threadId: data.threadId,
        role: data.role,
        content: data.content,
        metadata: data.metadata ?? toJsonValue({}),
        createdByUserId: data.createdByUserId,
        agentRunId: data.agentRunId,
        editedFromMessageId: data.editedFromMessageId,
        regeneratedFromMessageId: data.regeneratedFromMessageId,
      },
    });
  }

  /** Persists operational audit rows for each conversational tool call. */
  private async persistToolCallAudit(params: {
    organizationId: string;
    agentId: string | null;
    threadId: string;
    messageId: string;
    userId: string;
    toolCalls: OrchestrationToolCall[];
  }) {
    if (!params.agentId || params.toolCalls.length === 0) {
      return;
    }

    await this.prisma.agentChatToolCall.createMany({
      data: params.toolCalls.map((call) => ({
        organizationId: params.organizationId,
        agentId: params.agentId as string,
        threadId: params.threadId,
        messageId: params.messageId,
        toolName: call.toolName,
        status: call.status,
        inputPayload: toJsonValue(call.inputPayload),
        outputPayload:
          call.outputPayload === null ? Prisma.JsonNull : toJsonValue(call.outputPayload),
        errorMessage: call.errorMessage,
        durationMs: call.durationMs,
        createdByUserId: params.userId,
      })),
    });
  }

  private async ensureAgentBelongsToOrganization(organizationId: string, agentId: string) {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: agentId, organizationId },
      select: { id: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found in organization');
    }

    return agent;
  }

  private async ensureRunBelongsToThreadOrganization(organizationId: string, runId: string) {
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, organizationId },
      select: { id: true },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found in organization');
    }

    return run;
  }
}
