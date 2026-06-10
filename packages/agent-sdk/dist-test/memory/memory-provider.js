"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNoOpMemoryProvider = void 0;
/** Memory provider that recalls nothing — valid default until RAG is wired. */
const createNoOpMemoryProvider = () => ({
    recall: async () => [],
});
exports.createNoOpMemoryProvider = createNoOpMemoryProvider;
