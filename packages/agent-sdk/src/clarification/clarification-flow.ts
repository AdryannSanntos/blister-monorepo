import type { ClarificationField } from './clarification-field';

const isAnswered = (answers: Record<string, unknown>, name: string): boolean => {
  const value = answers[name];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Filters a field list down to the ones that are currently relevant given the
 * answers collected so far. A field with `dependsOn` is only kept when its
 * dependency already matches the expected value (e.g. `slidesCount` only when
 * `postFormat === 'carousel'`).
 */
export const resolveConditionalFields = (
  answers: Record<string, unknown>,
  fields: ClarificationField[],
): ClarificationField[] => {
  return fields.filter((field) => {
    if (!field.dependsOn) return true;
    return answers[field.dependsOn.field] === field.dependsOn.equals;
  });
};

/**
 * Returns the next required field that has not been answered yet, or null when
 * the brief is complete. Conditional fields are resolved against the current
 * answers before deciding.
 */
export const getNextField = (
  answers: Record<string, unknown>,
  fields: ClarificationField[],
): ClarificationField | null => {
  const relevant = resolveConditionalFields(answers, fields);

  for (const field of relevant) {
    if (field.required === false) continue;
    if (!isAnswered(answers, field.name)) return field;
  }

  return null;
};

/** Merges resume `formData` into the run's accumulated payload. */
export const mergeFormData = (
  payload: Record<string, unknown>,
  formData: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  if (!formData) return { ...payload };
  return { ...payload, ...formData };
};

export interface ClarificationFlow<TBrief> {
  fields: ClarificationField[];
  getNextField(answers: Record<string, unknown>): ClarificationField | null;
  buildBrief(answers: Record<string, unknown>): TBrief;
}

/**
 * Declares a reusable clarification flow: an ordered set of fields plus a
 * `buildBrief` that turns the collected answers into a typed brief. Agents call
 * `getNextField` until it returns null, then `buildBrief`.
 */
export const defineClarificationFlow = <TBrief>(config: {
  fields: ClarificationField[];
  buildBrief: (answers: Record<string, unknown>) => TBrief;
}): ClarificationFlow<TBrief> => {
  return {
    fields: config.fields,
    getNextField: (answers) => getNextField(answers, config.fields),
    buildBrief: config.buildBrief,
  };
};
