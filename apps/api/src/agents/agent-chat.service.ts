import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentIntentService } from './agent-intent.service';
import { AgentRunsService } from './agent-runs.service';
import type {
  CreateMessageDto,
  CreateThreadDto,
  EditMessageAndBranchDto,
  RegenerateMessageDto,
} from './dto';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const toChatRole = (role: string): 'user' | 'assistant' | 'system' => {
  if (role === 'assistant' || role === 'system') {
    return role;
  }

  return 'user';
};

@Injectable()
export class AgentChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentIntentService: AgentIntentService,
    private readonly agentRunsService: AgentRunsService,
  ) {}

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
      createdByUserId: userId,
    });
    const decision = await this.agentIntentService.classify({ message: input.content });

    if (decision.mode !== 'execution' || !thread.agentId) {
      return { message, decision, run: null };
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
        },
      },
    );

    return { message, decision, run };
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

      for (const message of previousMessages) {
        await this.createChatMessage(
          {
            threadId: branchThread.id,
            role: toChatRole(message.role),
            content: message.content,
            metadata: toJsonValue(message.metadata ?? {}),
            createdByUserId: message.createdByUserId,
          },
          tx,
        );
      }

      const replacementMessage = await this.createChatMessage(
        {
          threadId: branchThread.id,
          role: 'user',
          content: input.content,
          metadata: toJsonValue({ branched: true }),
          editedFromMessageId: originalMessage.id,
          createdByUserId: userId,
        },
        tx,
      );

      return {
        branchId: branchThread.id,
        replacedMessageId: originalMessage.id,
        messageId: replacementMessage.id,
      };
    });
  }

  async regenerateMessage(organizationId: string, input: RegenerateMessageDto, userId: string) {
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

    if (originalMessage.role !== 'assistant') {
      throw new BadRequestException('Only assistant messages can be regenerated');
    }

    const thread = await this.ensureThreadExists(input.threadId);

    if (thread.organizationId !== organizationId) {
      throw new NotFoundException('Chat thread not found in organization');
    }

    if (!thread.agentId) {
      throw new BadRequestException('Regeneration requires an agent thread');
    }

    await this.ensureThreadHasNoActiveExecution(thread.id);

    const regenerationRequest = await this.createChatMessage({
      threadId: thread.id,
      role: 'user',
      content: originalMessage.content,
      metadata: toJsonValue({ regenerationRequested: true }),
      createdByUserId: userId,
      regeneratedFromMessageId: originalMessage.id,
    });

    const decision = await this.agentIntentService.classify({
      message: `gere uma nova versao final para: ${originalMessage.content}`,
    });
    const run = await this.agentRunsService.createQueuedRun(
      thread.organizationId,
      thread.agentId,
      userId,
      {
        input: {
          regenerationOfMessageId: originalMessage.id,
          threadId: thread.id,
          messageId: regenerationRequest.id,
        },
      },
    );

    return { message: regenerationRequest, decision, run };
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
      },
    });

    return {
      threads,
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
            steps: {
              select: { id: true, blockType: true, status: true, createdAt: true },
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
