import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { AgentChatService } from './agent-chat.service';
import {
  createMessageSchema,
  createThreadSchema,
  editMessageAndBranchSchema,
  regenerateMessageSchema,
} from './dto';

const listThreadsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listMessagesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

@Controller('organizations/:orgId/agents/:agentId/chat')
export class AgentChatController {
  constructor(private readonly agentChatService: AgentChatService) {}

  @Get('threads')
  @RequirePermission('agent.execute')
  async listThreads(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Query() query: unknown,
    @Req() req: Request,
  ) {
    const parsed = listThreadsQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.listThreads(orgId, agentId, currentUser.id, parsed.data);
  }

  @Get('threads/:threadId/messages')
  @RequirePermission('agent.execute')
  async listMessages(
    @Param('orgId') orgId: string,
    @Param('threadId') threadId: string,
    @Query() query: unknown,
    @Req() req: Request,
  ) {
    const parsed = listMessagesQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.listMessages(orgId, threadId, currentUser.id, parsed.data);
  }

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

  @Patch('threads/:threadId')
  @RequirePermission('agent.execute')
  async renameThread(
    @Param('orgId') orgId: string,
    @Param('threadId') threadId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = z.object({ title: z.string().min(1).max(200) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.renameThread(orgId, threadId, currentUser.id, parsed.data.title);
  }

  @Delete('threads/:threadId')
  @RequirePermission('agent.execute')
  async deleteThread(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Param('threadId') threadId: string,
    @Req() req: Request,
  ) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.deleteThread(orgId, agentId, threadId, currentUser.id);
  }
}
