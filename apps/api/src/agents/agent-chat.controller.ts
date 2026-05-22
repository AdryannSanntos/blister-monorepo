import { BadRequestException, Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { AgentChatService } from './agent-chat.service';
import {
  createMessageSchema,
  createThreadSchema,
  editMessageAndBranchSchema,
  regenerateMessageSchema,
} from './dto';

@Controller('organizations/:orgId/agents/:agentId/chat')
export class AgentChatController {
  constructor(private readonly agentChatService: AgentChatService) {}

  @Post('threads')
  @RequirePermission('agent.execute')
  async createThread(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = createThreadSchema.safeParse({
      ...(body as object),
      scope: 'agent_chat',
      agentId,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.createThread(orgId, currentUser.id, {
      ...parsed.data,
      scope: 'agent_chat',
      agentId,
    });
  }

  @Post('threads/:threadId/messages')
  @RequirePermission('agent.execute')
  async sendMessage(
    @Param('orgId') orgId: string,
    @Param('threadId') threadId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = createMessageSchema.safeParse({ ...(body as object), threadId });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.createUserMessageAndProcess(orgId, currentUser.id, {
      ...parsed.data,
      threadId,
    });
  }

  @Post('threads/:threadId/branch')
  @RequirePermission('agent.execute')
  async editAndBranch(
    @Param('orgId') orgId: string,
    @Param('threadId') threadId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = editMessageAndBranchSchema.safeParse({ ...(body as object), threadId });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.editMessageAndBranch(
      orgId,
      { ...parsed.data, threadId },
      currentUser.id,
    );
  }

  @Post('threads/:threadId/regenerate')
  @RequirePermission('agent.execute')
  async regenerate(
    @Param('orgId') orgId: string,
    @Param('threadId') threadId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = regenerateMessageSchema.safeParse({ ...(body as object), threadId });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.regenerateMessage(
      orgId,
      { ...parsed.data, threadId },
      currentUser.id,
    );
  }
}
