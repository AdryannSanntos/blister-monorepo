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
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { SSE_HEADERS } from '../conversation/conversation-sse.service';
import { startConversationStreamSchema } from '../conversation/dto/conversation-stream.dto';
import { AgentChatService } from './agent-chat.service';
import { createThreadSchema, editMessageAndBranchSchema } from './dto';

const listThreadsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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

  @Post('threads/:threadId/messages/stream')
  @RequirePermission('agent.execute')
  async streamMessage(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Param('threadId') threadId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const parsed = startConversationStreamSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;

    res.status(200);
    for (const [key, value] of Object.entries(SSE_HEADERS)) res.setHeader(key, value);
    res.flushHeaders?.();

    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    await this.agentChatService.streamAssistantReply(
      orgId,
      currentUser.id,
      {
        agentId,
        threadId,
        content: parsed.data.content,
        attachments: parsed.data.attachments,
      },
      res,
      { isAborted: () => aborted },
    );
  }

  @Get('threads/:threadId/replay')
  @RequirePermission('agent.execute')
  async replay(
    @Param('orgId') orgId: string,
    @Param('threadId') threadId: string,
    @Req() req: Request,
  ) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentChatService.getThreadReplay(orgId, threadId, currentUser.id);
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
