import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { AgentChatService } from './agent-chat.service';
import { CompanyChatService } from './company-chat.service';

const companyChatMessageSchema = z.strictObject({
  content: z.string().trim().min(1).max(20000),
  threadId: z.string().min(1).optional(),
});

const listCompanyThreadsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listCompanyMessagesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

@Controller('organizations/:orgId/company-chat')
export class CompanyChatController {
  constructor(
    private readonly companyChatService: CompanyChatService,
    private readonly agentChatService: AgentChatService,
  ) {}

  @Get('threads')
  @RequirePermission('agent.execute')
  async listThreads(@Param('orgId') orgId: string, @Query() query: unknown, @Req() req: Request) {
    const parsed = listCompanyThreadsQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.listCompanyThreads(orgId, currentUser.id, parsed.data);
  }

  @Get('threads/:threadId/messages')
  @RequirePermission('agent.execute')
  async listMessages(
    @Param('orgId') orgId: string,
    @Param('threadId') threadId: string,
    @Query() query: unknown,
    @Req() req: Request,
  ) {
    const parsed = listCompanyMessagesQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.listMessages(orgId, threadId, currentUser.id, parsed.data);
  }

  @Post('messages')
  @RequirePermission('agent.execute')
  async sendMessage(@Param('orgId') orgId: string, @Body() body: unknown, @Req() req: Request) {
    const parsed = companyChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    const orgContext = (req as unknown as Record<string, unknown>).orgContext as
      | { permissions?: string[] }
      | undefined;
    const permissions = orgContext?.permissions ?? [];

    return this.companyChatService.handleMessage(
      orgId,
      currentUser.id,
      parsed.data.content,
      permissions,
      parsed.data.threadId,
    );
  }
}
