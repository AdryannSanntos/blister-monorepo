"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const zod_1 = require("zod");
const index_1 = require("./index");
(0, node_test_1.describe)('agent schema helpers', () => {
    (0, node_test_1.it)('keeps Zod as source of truth and derives JSON schema', () => {
        const schemas = (0, index_1.defineAgentSchemas)({
            input: zod_1.z.object({ userInput: zod_1.z.string().min(5) }),
            output: zod_1.z.object({ caption: zod_1.z.string(), hashtags: zod_1.z.array(zod_1.z.string()) }),
        });
        strict_1.default.equal(schemas.zod.input.safeParse({ userInput: 'bolo de cenoura' }).success, true);
        strict_1.default.equal(schemas.zod.input.safeParse({ userInput: 'x' }).success, false);
        strict_1.default.equal(schemas.json.output.type, 'object');
        strict_1.default.ok(schemas.json.output.properties);
    });
    (0, node_test_1.it)('parses structured LLM JSON and reports schema errors', () => {
        const schema = zod_1.z.object({ caption: zod_1.z.string(), hashtags: zod_1.z.array(zod_1.z.string()) });
        const valid = (0, index_1.parseLlmJson)('{"caption":"Oi","hashtags":["#bolo"]}', schema);
        strict_1.default.equal(valid.success, true);
        if (valid.success)
            strict_1.default.deepEqual(valid.data.hashtags, ['#bolo']);
        const invalid = (0, index_1.parseLlmJson)('{"caption":1,"hashtags":[]}', schema);
        strict_1.default.equal(invalid.success, false);
    });
    (0, node_test_1.it)('validates step output at the execution boundary', () => {
        const schema = zod_1.z.object({ caption: zod_1.z.string() });
        strict_1.default.equal((0, index_1.validateStepOutput)(schema, { caption: 'ok' }).success, true);
        strict_1.default.equal((0, index_1.validateStepOutput)(schema, { caption: 1 }).success, false);
        strict_1.default.equal((0, index_1.zodToJsonSchema)(schema).type, 'object');
    });
});
