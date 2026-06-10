"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStubCreditReporter = exports.createNoOpEventPublisher = exports.createCollectingEventPublisher = exports.createInMemoryContextPackBuilder = exports.createStubImageProvider = exports.createStubLlmProviderRuntime = exports.createStubLlmProvider = void 0;
const toCompletion = (response) => ({
    content: typeof response === 'string' ? response : JSON.stringify(response ?? {}),
    model: 'stub/model',
    tokensInput: 10,
    tokensOutput: 5,
    costUsd: 0.001,
});
/** SDK-shaped ({system,user}) LLM provider returning a fixed canned response. */
const createStubLlmProvider = (response) => ({
    complete: async () => toCompletion(response),
    completeStream: async (_params, onChunk) => {
        const completion = toCompletion(response);
        onChunk(completion.content);
        return completion;
    },
});
exports.createStubLlmProvider = createStubLlmProvider;
/** Runtime-shaped (messages[]) LLM provider, used for the kernel generic path. */
const createStubLlmProviderRuntime = (response) => ({
    complete: async () => toCompletion(response),
});
exports.createStubLlmProviderRuntime = createStubLlmProviderRuntime;
const createStubImageProvider = (options) => ({
    generate: async () => ({
        imageUrl: options?.imageUrl ?? 'https://example.com/generated-image.png',
        base64: options?.base64,
        storageKey: options?.storageKey ?? 'stub/generated-image.png',
    }),
});
exports.createStubImageProvider = createStubImageProvider;
const createInMemoryContextPackBuilder = (pack) => ({
    buildPack: async () => pack,
});
exports.createInMemoryContextPackBuilder = createInMemoryContextPackBuilder;
const createCollectingEventPublisher = () => {
    const events = [];
    return {
        events,
        publish: async (event) => {
            events.push(event);
        },
    };
};
exports.createCollectingEventPublisher = createCollectingEventPublisher;
const createNoOpEventPublisher = () => ({
    publish: async () => { },
});
exports.createNoOpEventPublisher = createNoOpEventPublisher;
/** Billing reporter stub: always succeeds, debiting the base cost as-is. */
const createStubCreditReporter = () => ({
    getPlatformSettings: async () => ({ markupDefault: 1, minRunCost: 0 }),
    debitStep: async (params) => ({
        success: true,
        debitedAmount: params.baseCost,
        newBalance: 1000,
    }),
});
exports.createStubCreditReporter = createStubCreditReporter;
