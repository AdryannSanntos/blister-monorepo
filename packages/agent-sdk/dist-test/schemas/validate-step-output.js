"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStepOutput = void 0;
const validateStepOutput = (schema, value) => {
    const result = schema.safeParse(value);
    if (!result.success) {
        return { success: false };
    }
    return { success: true, data: result.data };
};
exports.validateStepOutput = validateStepOutput;
