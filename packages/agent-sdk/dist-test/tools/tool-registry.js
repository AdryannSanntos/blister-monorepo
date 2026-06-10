"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
class ToolRegistry {
    tools = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
        return this;
    }
    get(name) {
        return this.tools.get(name);
    }
    list() {
        return [...this.tools.values()];
    }
    static fromTools(tools) {
        const registry = new ToolRegistry();
        for (const tool of tools)
            registry.register(tool);
        return registry;
    }
}
exports.ToolRegistry = ToolRegistry;
