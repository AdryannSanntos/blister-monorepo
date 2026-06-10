"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAgentSchemas = void 0;
const zod_to_json_schema_1 = require("./zod-to-json-schema");
const defineAgentSchemas = (schemas) => {
    const json = Object.fromEntries(Object.entries(schemas).map(([key, schema]) => [key, (0, zod_to_json_schema_1.zodToJsonSchema)(schema)]));
    return {
        zod: schemas,
        json,
        infer: {},
    };
};
exports.defineAgentSchemas = defineAgentSchemas;
