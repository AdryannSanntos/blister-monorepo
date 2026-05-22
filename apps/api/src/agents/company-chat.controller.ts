import { BadRequestException, Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { CompanyChatService } from './company-chat.service';
import { z } from 'zod';

const companyChatMessageSchema = z.strictObject({
  content: z.string().trim().min(1).max(20000),
  threadId: z.string().min(1).optional(),
});

@Controller('organizations/:orgId/company-chat')
export class CompanyChatController {
  constructor(private readonly companyChatService: CompanyChatService) {}

  @Post('messages')
  @RequirePermission('agent.execute')
  async sendMessage(
    @Param('orgId') orgId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = companyChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.companyChatService.handleMessage(
      orgId,
      currentUser.id,
      parsed.data.content,
      parsed.data.threadId,
    );
  }
}
