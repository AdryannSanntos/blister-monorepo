"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemoryCacheProvider = exports.sleep = void 0;
const sleep = (ms) => ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
exports.sleep = sleep;
/** In-memory cache provider for tests. */
const createInMemoryCacheProvider = () => {
    const store = new Map();
    return {
        store,
        get: async (key) => store.get(key) ?? null,
        set: async (key, value) => {
            store.set(key, value);
        },
    };
};
exports.createInMemoryCacheProvider = createInMemoryCacheProvider;
