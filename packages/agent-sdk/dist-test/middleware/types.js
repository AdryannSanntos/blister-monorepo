"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyMiddleware = void 0;
const createEmptyMiddleware = () => ({
    beforeRun: [],
    afterRun: [],
    beforeStep: [],
    afterStep: [],
});
exports.createEmptyMiddleware = createEmptyMiddleware;
