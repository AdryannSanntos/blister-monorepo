import type { AgentRunBlockDto, AgentRunEventType, BlockType } from '@company-os/types';
import type { EventPublisher } from './run-event.publisher';
import type { RunEventPayload } from './types';

/** Minimal surface of AgentRunBlockService that the emitter depends on. */
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
  appendText(
    agentRunId: string,
    messageId: string,
    blockId: string,
    delta: string,
  ): Promise<void>;
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
  /**
   * Seeds the internal message counter so messageIds stay unique across resume
   * invocations (where a fresh emitter is constructed for the same run).
   */
  messageStartIndex?: number;
}

type BlockStatus = 'streaming' | 'complete' | 'error';

/** Flush deltas to the wire once the buffer reaches this many characters. */
const DELTA_FLUSH_THRESHOLD = 24;

/** A block that accumulates text over time and is flushed in batches. */
export interface StreamingBlock {
  delta(text: string): void;
  end(payload?: Record<string, unknown>): Promise<void>;
}

/** A long-running discrete block that is closed via `done`. */
export interface WorkingBlock {
  done(payload?: Record<string, unknown>): Promise<void>;
}

export class BlockEmitter {
  private messageCounter: number;

  constructor(private readonly opts: BlockEmitterOptions) {
    this.messageCounter = opts.messageStartIndex ?? 0;
  }

  openMessage(role: 'assistant' | 'user' = 'assistant'): MessageHandle {
    const messageId = `${this.opts.runId}:m${this.messageCounter++}`;
    const handle = new MessageHandle(this.opts, messageId, role);
    return handle;
  }

  /**
   * Persists and emits a complete user turn as a single text block. Used by the
   * kernel to record the user's input (or submitted form answers) in the chat
   * thread before the assistant message begins.
   */
  async userMessage(text: string): Promise<void> {
    const messageId = `${this.opts.runId}:m${this.messageCounter++}`;
    const blockId = `${messageId}:b0`;

    await this.opts.publisher.publish({
      runId: this.opts.runId,
      agentId: this.opts.agentId,
      companyId: this.opts.companyId,
      type: 'message_start',
      data: { messageId, role: 'user' },
      timestamp: new Date(),
    });

    await this.opts.publisher.publish({
      runId: this.opts.runId,
      agentId: this.opts.agentId,
      companyId: this.opts.companyId,
      type: 'block_start',
      data: { messageId, blockId, blockType: 'text', index: 0 },
      timestamp: new Date(),
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

    await this.opts.publisher.publish({
      runId: this.opts.runId,
      agentId: this.opts.agentId,
      companyId: this.opts.companyId,
      type: 'block_end',
      data: { messageId, blockId, status: 'complete', payload: { text } },
      timestamp: new Date(),
    });
    await this.opts.blocks.finalize(this.opts.runId, messageId, blockId, 'complete', { text });

    await this.opts.publisher.publish({
      runId: this.opts.runId,
      agentId: this.opts.agentId,
      companyId: this.opts.companyId,
      type: 'message_end',
      data: { messageId },
      timestamp: new Date(),
    });
  }
}

class MessageHandle {
  private blockCounter = 0;
  private outputEmitted = false;

  constructor(
    private readonly opts: BlockEmitterOptions,
    private readonly messageId: string,
    private readonly role: 'assistant' | 'user',
  ) {
    void this.publishEvent('message_start', { messageId: this.messageId, role: this.role });
  }

  private nextBlock(): { blockId: string; index: number } {
    const index = this.blockCounter++;
    return { blockId: `${this.messageId}:b${index}`, index };
  }

  private async publishEvent(
    type: AgentRunEventType,
    data: Record<string, unknown>,
  ): Promise<void> {
    const event: RunEventPayload = {
      runId: this.opts.runId,
      agentId: this.opts.agentId,
      companyId: this.opts.companyId,
      type,
      data,
      timestamp: new Date(),
    };
    await this.opts.publisher.publish(event);
  }

  private async startBlock(
    blockType: BlockType,
    label?: string,
    stepKey?: string,
  ): Promise<{ blockId: string; index: number }> {
    const { blockId, index } = this.nextBlock();
    await this.publishEvent('block_start', {
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
    await this.publishEvent('block_end', {
      messageId: this.messageId,
      blockId,
      status,
      payload,
    });
    await this.opts.blocks.finalize(this.opts.runId, this.messageId, blockId, status, payload);
  }

  // --- Streaming blocks -----------------------------------------------------

  thinking(): StreamingBlock {
    return this.createStreamingBlock('thinking');
  }

  text(): StreamingBlock {
    return this.createStreamingBlock('text');
  }

  private createStreamingBlock(blockType: 'thinking' | 'text'): StreamingBlock {
    const started = this.startBlock(blockType);
    let buffer = '';
    let blockId: string | undefined;

    void started.then((b) => {
      blockId = b.blockId;
    });

    const flush = (force: boolean): void => {
      if (buffer.length === 0) return;
      if (!force && buffer.length < DELTA_FLUSH_THRESHOLD) return;
      const flushed = buffer;
      buffer = '';
      void started.then(({ blockId: id }) => {
        void this.publishEvent('block_delta', {
          messageId: this.messageId,
          blockId: id,
          delta: flushed,
        });
        void this.opts.blocks.appendText(this.opts.runId, this.messageId, id, flushed);
      });
    };

    return {
      delta: (textDelta: string): void => {
        buffer += textDelta;
        flush(false);
      },
      end: async (payload?: Record<string, unknown>): Promise<void> => {
        const { blockId: id } = await started;
        blockId = id;
        if (buffer.length > 0) {
          const flushed = buffer;
          buffer = '';
          await this.publishEvent('block_delta', {
            messageId: this.messageId,
            blockId: id,
            delta: flushed,
          });
          await this.opts.blocks.appendText(this.opts.runId, this.messageId, id, flushed);
        }
        await this.endBlock(id, 'complete', payload);
      },
    };
  }

  // --- Discrete blocks ------------------------------------------------------

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

  /** Emits an output block only when no step has already done so. */
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

  // --- Message lifecycle ----------------------------------------------------

  async end(): Promise<void> {
    await this.publishEvent('message_end', { messageId: this.messageId });
  }
}

export type { MessageHandle };
