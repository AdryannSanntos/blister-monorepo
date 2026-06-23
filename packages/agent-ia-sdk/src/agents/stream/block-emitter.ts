import type { AgentRunBlockDto, AgentRunEventType, BlockType } from '@company-os/types';
import type { EventPublisher, RunEventPayload } from './run-events';

export interface AgentRunBlockServiceLike {
  save(input: {
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
  }): Promise<void>;
  appendText(agentRunId: string, messageId: string, blockId: string, delta: string): Promise<void>;
  finalize(
    agentRunId: string,
    messageId: string,
    blockId: string,
    status: 'streaming' | 'complete' | 'error',
    payload?: Record<string, unknown>,
  ): Promise<void>;
  listByRun(agentRunId: string): Promise<AgentRunBlockDto[]>;
}

export interface BlockEmitterOptions {
  runId: string;
  agentId: string;
  companyId: string;
  publisher: EventPublisher;
  blocks: AgentRunBlockServiceLike;
  messageStartIndex?: number;
}

export type BlockStatus = 'streaming' | 'complete' | 'error';

export interface StreamingBlock {
  delta(text: string): void;
  end(payload?: Record<string, unknown>): Promise<void>;
}

export interface WorkingBlock {
  done(payload?: Record<string, unknown>): Promise<void>;
}

export interface MessageHandle {
  thinking(): StreamingBlock;
  text(): StreamingBlock;
  searching(payload: Record<string, unknown>, label?: string): Promise<void>;
  planning(payload: Record<string, unknown>): Promise<void>;
  formQuestion(formSchema: Record<string, unknown>): Promise<void>;
  output(payload: Record<string, unknown>): Promise<void>;
  ensureOutput(payload: Record<string, unknown>): Promise<void>;
  error(message: string, payload?: Record<string, unknown>): Promise<void>;
  working(label: string): Promise<WorkingBlock>;
  end(): Promise<void>;
}

const DELTA_FLUSH_THRESHOLD = 24;

export class BlockEmitter {
  private messageCounter: number;

  constructor(private readonly opts: BlockEmitterOptions) {
    this.messageCounter = opts.messageStartIndex ?? 0;
  }

  openMessage(role: 'assistant' | 'user' = 'assistant'): MessageHandle {
    const messageId = `${this.opts.runId}:m${this.messageCounter++}`;
    return new MessageHandleImpl(this.opts, messageId, role);
  }

  async userMessage(text: string): Promise<void> {
    const messageId = `${this.opts.runId}:m${this.messageCounter++}`;
    const blockId = `${messageId}:b0`;

    await publishEvent(this.opts, 'message_start', { messageId, role: 'user' });
    await publishEvent(this.opts, 'block_start', {
      messageId,
      blockId,
      blockType: 'text',
      index: 0,
    });
    await this.opts.blocks.save({
      agentRunId: this.opts.runId,
      messageId,
      blockId,
      role: 'user',
      blockType: 'text',
      index: 0,
      text,
      status: 'streaming',
    });
    await publishEvent(this.opts, 'block_end', {
      messageId,
      blockId,
      status: 'complete',
      payload: { text },
    });
    await this.opts.blocks.finalize(this.opts.runId, messageId, blockId, 'complete', { text });
    await publishEvent(this.opts, 'message_end', { messageId });
  }
}

class MessageHandleImpl implements MessageHandle {
  private blockCounter = 0;
  private outputEmitted = false;

  constructor(
    private readonly opts: BlockEmitterOptions,
    private readonly messageId: string,
    private readonly role: 'assistant' | 'user',
  ) {
    void publishEvent(this.opts, 'message_start', { messageId: this.messageId, role: this.role });
  }

  private nextBlock(): { blockId: string; index: number } {
    const index = this.blockCounter++;
    return { blockId: `${this.messageId}:b${index}`, index };
  }

  private async startBlock(
    blockType: BlockType,
    label?: string,
    stepKey?: string,
  ): Promise<{ blockId: string; index: number }> {
    const { blockId, index } = this.nextBlock();
    await publishEvent(this.opts, 'block_start', {
      messageId: this.messageId,
      blockId,
      blockType,
      index,
      ...(label !== undefined ? { label } : {}),
      ...(stepKey !== undefined ? { stepKey } : {}),
    });
    await this.opts.blocks.save({
      agentRunId: this.opts.runId,
      messageId: this.messageId,
      blockId,
      role: 'assistant',
      blockType,
      index,
      label,
      stepKey,
      status: 'streaming',
    });
    return { blockId, index };
  }

  private async endBlock(
    blockId: string,
    status: BlockStatus,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    await publishEvent(this.opts, 'block_end', {
      messageId: this.messageId,
      blockId,
      status,
      payload,
    });
    await this.opts.blocks.finalize(this.opts.runId, this.messageId, blockId, status, payload);
  }

  thinking(): StreamingBlock {
    return this.createStreamingBlock('thinking');
  }

  text(): StreamingBlock {
    return this.createStreamingBlock('text');
  }

  private createStreamingBlock(blockType: 'thinking' | 'text'): StreamingBlock {
    const started = this.startBlock(blockType);
    let buffer = '';

    const flush = (force: boolean): void => {
      if (buffer.length === 0) return;
      if (!force && buffer.length < DELTA_FLUSH_THRESHOLD) return;
      const flushed = buffer;
      buffer = '';
      void started.then(({ blockId }) => {
        void publishEvent(this.opts, 'block_delta', {
          messageId: this.messageId,
          blockId,
          delta: flushed,
        });
        void this.opts.blocks.appendText(this.opts.runId, this.messageId, blockId, flushed);
      });
    };

    return {
      delta: (textDelta: string): void => {
        buffer += textDelta;
        flush(false);
      },
      end: async (payload?: Record<string, unknown>): Promise<void> => {
        const { blockId } = await started;
        if (buffer.length > 0) {
          const flushed = buffer;
          buffer = '';
          await publishEvent(this.opts, 'block_delta', {
            messageId: this.messageId,
            blockId,
            delta: flushed,
          });
          await this.opts.blocks.appendText(this.opts.runId, this.messageId, blockId, flushed);
        }
        await this.endBlock(blockId, 'complete', payload);
      },
    };
  }

  async searching(payload: Record<string, unknown>, label?: string): Promise<void> {
    const { blockId } = await this.startBlock('searching_context', label);
    await this.endBlock(blockId, 'complete', payload);
  }

  async planning(payload: Record<string, unknown>): Promise<void> {
    const { blockId } = await this.startBlock('planning');
    await this.endBlock(blockId, 'complete', payload);
  }

  async formQuestion(formSchema: Record<string, unknown>): Promise<void> {
    const { blockId } = await this.startBlock('form_question');
    await this.endBlock(blockId, 'complete', { formSchema });
  }

  async output(payload: Record<string, unknown>): Promise<void> {
    this.outputEmitted = true;
    const { blockId } = await this.startBlock('output');
    await this.endBlock(blockId, 'complete', payload);
  }

  async ensureOutput(payload: Record<string, unknown>): Promise<void> {
    if (this.outputEmitted) return;
    await this.output(payload);
  }

  async error(message: string, payload?: Record<string, unknown>): Promise<void> {
    const { blockId } = await this.startBlock('error');
    await this.endBlock(blockId, 'error', { message, ...(payload ?? {}) });
  }

  async working(label: string): Promise<WorkingBlock> {
    const { blockId } = await this.startBlock('working', label);
    return {
      done: (payload?: Record<string, unknown>): Promise<void> =>
        this.endBlock(blockId, 'complete', payload),
    };
  }

  async end(): Promise<void> {
    await publishEvent(this.opts, 'message_end', { messageId: this.messageId });
  }
}

async function publishEvent(
  opts: BlockEmitterOptions,
  type: AgentRunEventType,
  data: Record<string, unknown>,
): Promise<void> {
  await opts.publisher.publish({
    runId: opts.runId,
    agentId: opts.agentId,
    companyId: opts.companyId,
    type,
    data,
    timestamp: new Date(),
  });
}
