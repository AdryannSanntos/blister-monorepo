import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { defineAgentSchemas, parseLlmJson, validateStepOutput, zodToJsonSchema } from './index';

describe('agent schema helpers', () => {
  it('keeps Zod as source of truth and derives JSON schema', () => {
    const schemas = defineAgentSchemas({
      input: z.object({ userInput: z.string().min(5) }),
      output: z.object({ caption: z.string(), hashtags: z.array(z.string()) }),
    });

    assert.equal(schemas.zod.input.safeParse({ userInput: 'bolo de cenoura' }).success, true);
    assert.equal(schemas.zod.input.safeParse({ userInput: 'x' }).success, false);
    assert.equal(schemas.json.output.type, 'object');
    assert.ok(schemas.json.output.properties);
  });

  it('parses structured LLM JSON and reports schema errors', () => {
    const schema = z.object({ caption: z.string(), hashtags: z.array(z.string()) });

    const valid = parseLlmJson('{"caption":"Oi","hashtags":["#bolo"]}', schema);
    assert.equal(valid.success, true);
    if (valid.success) assert.deepEqual(valid.data.hashtags, ['#bolo']);

    const invalid = parseLlmJson('{"caption":1,"hashtags":[]}', schema);
    assert.equal(invalid.success, false);
  });

  it('validates step output at the execution boundary', () => {
    const schema = z.object({ caption: z.string() });
    assert.equal(validateStepOutput(schema, { caption: 'ok' }).success, true);
    assert.equal(validateStepOutput(schema, { caption: 1 }).success, false);
    assert.equal(zodToJsonSchema(schema).type, 'object');
  });
});
