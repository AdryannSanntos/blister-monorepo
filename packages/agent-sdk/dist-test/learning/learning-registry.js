"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningSerializerRegistry = void 0;
class LearningSerializerRegistry {
    static handlers = new Map();
    static register(agentId, handler) {
        LearningSerializerRegistry.handlers.set(agentId, handler);
    }
    static has(agentId) {
        return LearningSerializerRegistry.handlers.has(agentId);
    }
    static serialize(agentId, feedback) {
        const handler = LearningSerializerRegistry.handlers.get(agentId);
        if (!handler)
            return null;
        return handler.serialize(feedback);
    }
    static extractInsights(agentId, feedback) {
        const handler = LearningSerializerRegistry.handlers.get(agentId);
        if (!handler?.extractInsights)
            return null;
        return handler.extractInsights(feedback);
    }
    /** Test helper: forget all registered handlers. */
    static clear() {
        LearningSerializerRegistry.handlers.clear();
    }
}
exports.LearningSerializerRegistry = LearningSerializerRegistry;
