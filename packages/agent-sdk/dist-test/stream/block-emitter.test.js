"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const index_1 = require("./index");
const makeDeps = () => {
    const events = [];
    const publisher = {
        publish: async (event) => {
            events.push({ type: event.type, data: event.data });
        },
    };
    const blocks = {
        save: async () => { },
        appendText: async () => { },
        finalize: async () => { },
        listByRun: async () => [],
    };
    return { events, publisher, blocks };
};
(0, node_test_1.describe)('BlockEmitter', () => {
    (0, node_test_1.it)('streams a thinking block: start, deltas, end', async () => {
        const { events, publisher, blocks } = makeDeps();
        const emitter = new index_1.BlockEmitter({
            runId: 'r1',
            agentId: 'post',
            companyId: 'c1',
            publisher,
            blocks,
        });
        const message = emitter.openMessage('assistant');
        const thinking = message.thinking();
        thinking.delta('pen');
        thinking.delta('sando ');
        await thinking.end();
        await message.end();
        const types = events.map((event) => event.type);
        strict_1.default.equal(types[0], 'message_start');
        strict_1.default.equal(types[1], 'block_start');
        strict_1.default.ok(types.includes('block_delta'));
        strict_1.default.equal(types.at(-2), 'block_end');
        strict_1.default.equal(types.at(-1), 'message_end');
    });
    (0, node_test_1.it)('emits a discrete searching block with payload', async () => {
        const { events, publisher, blocks } = makeDeps();
        const emitter = new index_1.BlockEmitter({
            runId: 'r1',
            agentId: 'post',
            companyId: 'c1',
            publisher,
            blocks,
        });
        const message = emitter.openMessage('assistant');
        await message.searching({ resultsCount: 3 }, 'Consultando o Cérebro da Marca');
        const start = events.find((event) => event.type === 'block_start');
        const end = events.find((event) => event.type === 'block_end');
        strict_1.default.equal(start?.data.blockType, 'searching_context');
        strict_1.default.equal(start?.data.label, 'Consultando o Cérebro da Marca');
        strict_1.default.deepEqual(end?.data.payload, { resultsCount: 3 });
        strict_1.default.equal(end?.data.status, 'complete');
    });
    (0, node_test_1.it)('seeds messageId from messageStartIndex', async () => {
        const { events, publisher, blocks } = makeDeps();
        const emitter = new index_1.BlockEmitter({
            runId: 'r1',
            agentId: 'post',
            companyId: 'c1',
            publisher,
            blocks,
            messageStartIndex: 2,
        });
        const message = emitter.openMessage('assistant');
        await message.searching({}, 'a');
        const start = events.find((event) => event.type === 'block_start');
        strict_1.default.equal(start?.data.messageId, 'r1:m2');
    });
    (0, node_test_1.it)('ensureOutput skips duplicate output blocks', async () => {
        const { events, publisher, blocks } = makeDeps();
        const emitter = new index_1.BlockEmitter({
            runId: 'r1',
            agentId: 'post',
            companyId: 'c1',
            publisher,
            blocks,
        });
        const message = emitter.openMessage('assistant');
        await message.output({ caption: 'first' });
        await message.ensureOutput({ caption: 'second' });
        const outputStarts = events.filter((event) => event.type === 'block_start' && event.data.blockType === 'output');
        strict_1.default.equal(outputStarts.length, 1);
    });
});
