import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AgentRunBlockDto } from '@company-os/types';
import type { Prisma } from '../../generated/prisma';

export interface SaveBlockInput {
  agentRunId: string;
  messageId: string;
  blockId: string;
  role: 'user' | 'assistant';
  blockType: string;
  index: number;
  label?: string;
  text?: string;
  payload?: Record<string, unknown>;
  stepKey?: string;
  status: 'streaming' | 'complete' | 'error';
}

interface BlockState {
  index: number;
  text: string;
}

@Injectable()
export class AgentRunBlockService {
  private readonly logger = new Logger(AgentRunBlockService.name);

  // Maps (agentRunId:messageId:blockId) -> { index, accumulated text }.
  // The live-execution path is the only writer, so an in-process map is enough
  // to target the right row by index without re-reading the database.
  private readonly blocks = new Map<string, BlockState>();

  constructor(private readonly prisma: PrismaService) {}

  private key(agentRunId: string, messageId: string, blockId: string): string {
    return `${agentRunId}:${messageId}:${blockId}`;
  }

  async save(input: SaveBlockInput): Promise<void> {
    const text = input.text ?? '';
    this.blocks.set(this.key(input.agentRunId, input.messageId, input.blockId), {
      index: input.index,
      text,
    });

    const payload = (input.payload ?? {}) as Prisma.InputJsonValue;

    await this.prisma.agentRunBlock.upsert({
      where: {
        agentRunId_messageId_index: {
          agentRunId: input.agentRunId,
          messageId: input.messageId,
          index: input.index,
        },
      },
      create: {
        agentRunId: input.agentRunId,
        messageId: input.messageId,
        role: input.role,
        blockType: input.blockType,
        index: input.index,
        label: input.label ?? null,
        text: input.text ?? null,
        payload,
        stepKey: input.stepKey ?? null,
        status: input.status,
      },
      update: {
        label: input.label ?? null,
        text: input.text ?? null,
        payload,
        status: input.status,
      },
    });
  }

  async appendText(
    agentRunId: string,
    messageId: string,
    blockId: string,
    delta: string,
  ): Promise<void> {
    const state = this.blocks.get(this.key(agentRunId, messageId, blockId));
    if (!state) {
      this.logger.warn(
        `appendText called for unknown block ${blockId} (run ${agentRunId}, message ${messageId}); save() must run first`,
      );
      return;
    }

    state.text += delta;

    await this.prisma.agentRunBlock.upsert({
      where: {
        agentRunId_messageId_index: {
          agentRunId,
          messageId,
          index: state.index,
        },
      },
      create: {
        agentRunId,
        messageId,
        role: 'assistant',
        blockType: 'text',
        index: state.index,
        text: state.text,
        payload: {},
        status: 'streaming',
      },
      update: {
        text: state.text,
      },
    });
  }

  async finalize(
    agentRunId: string,
    messageId: string,
    blockId: string,
    status: 'streaming' | 'complete' | 'error',
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const state = this.blocks.get(this.key(agentRunId, messageId, blockId));
    if (!state) {
      this.logger.warn(
        `finalize called for unknown block ${blockId} (run ${agentRunId}, message ${messageId}); save() must run first`,
      );
      return;
    }

    const jsonPayload = (payload ?? {}) as Prisma.InputJsonValue;

    await this.prisma.agentRunBlock.upsert({
      where: {
        agentRunId_messageId_index: {
          agentRunId,
          messageId,
          index: state.index,
        },
      },
      create: {
        agentRunId,
        messageId,
        role: 'assistant',
        blockType: 'text',
        index: state.index,
        text: state.text,
        payload: jsonPayload,
        status,
      },
      update: {
        text: state.text,
        payload: jsonPayload,
        status,
      },
    });
  }

  async listByRun(agentRunId: string): Promise<AgentRunBlockDto[]> {
    const rows = await this.prisma.agentRunBlock.findMany({
      where: { agentRunId },
      orderBy: [{ messageId: 'asc' }, { index: 'asc' }],
    });

    return rows.map((row) => this.mapToDto(row));
  }

  private mapToDto(row: {
    id: string;
    messageId: string;
    role: string;
    blockType: string;
    index: number;
    label: string | null;
    text: string | null;
    payload: unknown;
    stepKey: string | null;
    status: string;
    createdAt: Date;
  }): AgentRunBlockDto {
    return {
      id: row.id,
      messageId: row.messageId,
      role: row.role as AgentRunBlockDto['role'],
      blockType: row.blockType as AgentRunBlockDto['blockType'],
      index: row.index,
      label: row.label,
      text: row.text,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      stepKey: row.stepKey,
      status: row.status as AgentRunBlockDto['status'],
      createdAt: row.createdAt.toISOString(),
    };
  }
}
