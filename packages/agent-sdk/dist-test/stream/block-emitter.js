"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockEmitter = void 0;
const DELTA_FLUSH_THRESHOLD = 24;
class BlockEmitter {
    opts;
    messageCounter;
    constructor(opts) {
        this.opts = opts;
        this.messageCounter = opts.messageStartIndex ?? 0;
    }
    openMessage(role = 'assistant') {
        const messageId = `${this.opts.runId}:m${this.messageCounter++}`;
        return new MessageHandleImpl(this.opts, messageId, role);
    }
    async userMessage(text) {
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
exports.BlockEmitter = BlockEmitter;
class MessageHandleImpl {
    opts;
    messageId;
    role;
    blockCounter = 0;
    outputEmitted = false;
    constructor(opts, messageId, role) {
        this.opts = opts;
        this.messageId = messageId;
        this.role = role;
        void publishEvent(this.opts, 'message_start', { messageId: this.messageId, role: this.role });
    }
    nextBlock() {
        const index = this.blockCounter++;
        return { blockId: `${this.messageId}:b${index}`, index };
    }
    async startBlock(blockType, label, stepKey) {
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
    async endBlock(blockId, status, payload) {
        await publishEvent(this.opts, 'block_end', {
            messageId: this.messageId,
            blockId,
            status,
            payload,
        });
        await this.opts.blocks.finalize(this.opts.runId, this.messageId, blockId, status, payload);
    }
    thinking() {
        return this.createStreamingBlock('thinking');
    }
    text() {
        return this.createStreamingBlock('text');
    }
    createStreamingBlock(blockType) {
        const started = this.startBlock(blockType);
        let buffer = '';
        const flush = (force) => {
            if (buffer.length === 0)
                return;
            if (!force && buffer.length < DELTA_FLUSH_THRESHOLD)
                return;
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
            delta: (textDelta) => {
                buffer += textDelta;
                flush(false);
            },
            end: async (payload) => {
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
    async searching(payload, label) {
        const { blockId } = await this.startBlock('searching_context', label);
        await this.endBlock(blockId, 'complete', payload);
    }
    async planning(payload) {
        const { blockId } = await this.startBlock('planning');
        await this.endBlock(blockId, 'complete', payload);
    }
    async formQuestion(formSchema) {
        const { blockId } = await this.startBlock('form_question');
        await this.endBlock(blockId, 'complete', { formSchema });
    }
    async output(payload) {
        this.outputEmitted = true;
        const { blockId } = await this.startBlock('output');
        await this.endBlock(blockId, 'complete', payload);
    }
    async ensureOutput(payload) {
        if (this.outputEmitted)
            return;
        await this.output(payload);
    }
    async error(message, payload) {
        const { blockId } = await this.startBlock('error');
        await this.endBlock(blockId, 'error', { message, ...(payload ?? {}) });
    }
    async working(label) {
        const { blockId } = await this.startBlock('working', label);
        return {
            done: (payload) => this.endBlock(blockId, 'complete', payload),
        };
    }
    async end() {
        await publishEvent(this.opts, 'message_end', { messageId: this.messageId });
    }
}
async function publishEvent(opts, type, data) {
    await opts.publisher.publish({
        runId: opts.runId,
        agentId: opts.agentId,
        companyId: opts.companyId,
        type,
        data,
        timestamp: new Date(),
    });
}
