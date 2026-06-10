"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidator = void 0;
/** Reusable validator bundle around a Zod schema. */
const createValidator = (schema) => {
    return {
        parse: (input) => schema.parse(input),
        safeParse: (input) => schema.safeParse(input),
        assert: (input) => {
            schema.parse(input);
        },
    };
};
exports.createValidator = createValidator;
