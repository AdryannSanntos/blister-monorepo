import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cutOutputSchema,
  cutsAgentSettingsSchema,
  cutsRunInputSchema,
  cutsRunOutputSchema,
  reviewCutsSchema,
} from './cuts';

describe('cutsAgentSettingsSchema', () => {
  it('applies defaults', () => {
    const parsed = cutsAgentSettingsSchema.parse({});
    assert.equal(parsed.maxCuts, 5);
    assert.equal(parsed.cutDurationSec, 60);
    assert.equal(parsed.deleteSourceAfterRun, false);
    assert.equal(parsed.addCaptions, false);
    assert.equal(parsed.autoAcceptResults, true);
  });

  it('requires captionStyleId when addCaptions is true', () => {
    const result = cutsAgentSettingsSchema.safeParse({
      addCaptions: true,
    });
    assert.equal(result.success, false);
  });

  it('accepts captionStyleId when addCaptions is true', () => {
    const parsed = cutsAgentSettingsSchema.parse({
      addCaptions: true,
      captionStyleId: 'cs-bold',
    });
    assert.equal(parsed.captionStyleId, 'cs-bold');
  });

  it('rejects maxCuts above limit', () => {
    const result = cutsAgentSettingsSchema.safeParse({ maxCuts: 25 });
    assert.equal(result.success, false);
  });
});

describe('cutsRunInputSchema', () => {
  it('requires sourceFileId and settings snapshot', () => {
    const parsed = cutsRunInputSchema.parse({
      userInput: 'Generate cuts from my podcast',
      sourceFileId: 'file-123',
      settings: {},
    });
    assert.equal(parsed.sourceFileId, 'file-123');
    assert.equal(parsed.settings.maxCuts, 5);
  });
});

describe('cutOutputSchema', () => {
  it('validates viralScore 0-100 and reviewStatus', () => {
    const parsed = cutOutputSchema.parse({
      id: 'cut-1',
      title: 'Hook',
      description: 'Strong opening',
      startSec: 10,
      endSec: 70,
      durationSec: 60,
      viralScore: 92,
      reviewStatus: 'pending',
    });
    assert.equal(parsed.viralScore, 92);
    assert.equal(parsed.reviewStatus, 'pending');
  });

  it('rejects viralScore above 100', () => {
    const result = cutOutputSchema.safeParse({
      id: 'cut-1',
      title: 'Hook',
      description: 'Strong opening',
      startSec: 10,
      endSec: 70,
      durationSec: 60,
      viralScore: 101,
      reviewStatus: 'pending',
    });
    assert.equal(result.success, false);
  });
});

describe('cutsRunOutputSchema', () => {
  it('requires at least one cut', () => {
    const result = cutsRunOutputSchema.safeParse({
      cuts: [],
      sourceFileId: 'file-1',
    });
    assert.equal(result.success, false);
  });
});

describe('reviewCutsSchema', () => {
  it('validates cut decisions', () => {
    const parsed = reviewCutsSchema.parse({
      cutDecisions: [
        { cutId: 'cut-1', decision: 'approve' },
        { cutId: 'cut-2', decision: 'reject' },
      ],
    });
    assert.equal(parsed.cutDecisions.length, 2);
  });

  it('rejects empty decisions', () => {
    const result = reviewCutsSchema.safeParse({ cutDecisions: [] });
    assert.equal(result.success, false);
  });
});
