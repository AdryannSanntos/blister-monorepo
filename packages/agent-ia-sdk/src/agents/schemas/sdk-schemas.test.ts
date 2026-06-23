import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { createNormalizer } from './normalizer';
import { parseLlmJson } from './parse-llm-json';
import { mergeAnalysisIntoPayload, normalizeAnalysisResult } from './request-analysis';
import { validateFormAnswer } from './clarification-answer';

describe('parseLlmJson', () => {
  const schema = z.object({ caption: z.string() });

  it('strips fences and extracts the object', () => {
    const result = parseLlmJson('```json\n{"caption":"oi"}\n```', schema);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.caption, 'oi');
  });

  it('repairs aliases before validating', () => {
    const repair = createNormalizer({ aliases: { copy: 'caption' } });
    const result = parseLlmJson('{"copy":"texto"}', schema, { repair });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.caption, 'texto');
  });

  it('returns the raw value on failure', () => {
    const result = parseLlmJson('not json', schema);
    assert.equal(result.success, false);
  });
});

describe('request analysis', () => {
  it('keeps missing/skipped fields in sync', () => {
    const analysis = normalizeAnalysisResult(
      { extracted: { tone: { value: 'fun', confidence: 'high', evidence: 'x' } } },
      [
        { name: 'tone', kind: 'single', label: 'Tom', required: true },
        { name: 'format', kind: 'single', label: 'Formato', required: true },
      ],
    );
    assert.deepEqual(analysis.skippedFieldNames, ['tone']);
    assert.deepEqual(analysis.missingFields, ['format']);
  });

  it('merges only high-confidence values not already answered', () => {
    const analysis = normalizeAnalysisResult(
      {
        extracted: {
          tone: { value: 'fun', confidence: 'high', evidence: 'x' },
          format: { value: 'single', confidence: 'low', evidence: 'y' },
        },
      },
      [],
    );
    const merged = mergeAnalysisIntoPayload({}, analysis, 'high');
    assert.equal(merged.tone, 'fun');
    assert.equal(merged.format, undefined);
  });
});

describe('validateFormAnswer', () => {
  it('accepts a valid option and rejects an invalid one', () => {
    const field = {
      name: 'tone',
      kind: 'single' as const,
      label: 'Tom',
      options: [{ id: 'fun', label: 'Divertido' }],
    };
    assert.equal(validateFormAnswer(field, 'fun').success, true);
    assert.equal(validateFormAnswer(field, 'nope').success, false);
  });
});
