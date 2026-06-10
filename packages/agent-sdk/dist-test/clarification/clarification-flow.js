"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineClarificationFlow = exports.mergeFormData = exports.getNextField = exports.resolveConditionalFields = void 0;
const isAnswered = (answers, name) => {
    const value = answers[name];
    if (value === undefined || value === null)
        return false;
    if (typeof value === 'string')
        return value.trim().length > 0;
    if (Array.isArray(value))
        return value.length > 0;
    return true;
};
/**
 * Filters a field list down to the ones that are currently relevant given the
 * answers collected so far. A field with `dependsOn` is only kept when its
 * dependency already matches the expected value (e.g. `slidesCount` only when
 * `postFormat === 'carousel'`).
 */
const resolveConditionalFields = (answers, fields) => {
    return fields.filter((field) => {
        if (!field.dependsOn)
            return true;
        return answers[field.dependsOn.field] === field.dependsOn.equals;
    });
};
exports.resolveConditionalFields = resolveConditionalFields;
/**
 * Returns the next required field that has not been answered yet, or null when
 * the brief is complete. Conditional fields are resolved against the current
 * answers before deciding.
 */
const getNextField = (answers, fields) => {
    const relevant = (0, exports.resolveConditionalFields)(answers, fields);
    for (const field of relevant) {
        if (field.required === false)
            continue;
        if (!isAnswered(answers, field.name))
            return field;
    }
    return null;
};
exports.getNextField = getNextField;
/** Merges resume `formData` into the run's accumulated payload. */
const mergeFormData = (payload, formData) => {
    if (!formData)
        return { ...payload };
    return { ...payload, ...formData };
};
exports.mergeFormData = mergeFormData;
/**
 * Declares a reusable clarification flow: an ordered set of fields plus a
 * `buildBrief` that turns the collected answers into a typed brief. Agents call
 * `getNextField` until it returns null, then `buildBrief`.
 */
const defineClarificationFlow = (config) => {
    return {
        fields: config.fields,
        getNextField: (answers) => (0, exports.getNextField)(answers, config.fields),
        buildBrief: config.buildBrief,
    };
};
exports.defineClarificationFlow = defineClarificationFlow;
