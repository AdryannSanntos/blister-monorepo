import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { StepExecutionContext } from '../core/types';
import {
  computeRoutingSkips,
  createConditionalStep,
  mapSuggestedPathToBranch,
  suggestWorkflowPath,
} from './routing';
import { normalizeAnalysisResult } from '../schemas/request-analysis';

const ctx = (overrides: Partial<StepExecutionContext> = {}): StepExecutionContext => ({
  runId: 'r',
  agentId: 'a',
  companyId: 'c',
  campaignId: null,
  stepKey: 'collect_brief',
  stepIndex: 0,
  inputPayload: {},
  previousStepsOutput: {},
  contextPack: { chunks: [], totalFound: 0 },
  brandProfile: null,
  ...overrides,
});

describe('routing', () => {
  it('skips steps of non-selected branches', () => {
    const rules = [
      {
        after: 'collect_brief',
        decide: () => 'single',
        branches: {
          carousel: ['plan_design', 'approve_design_plan', 'generate_post'],
          single: ['plan_design', 'generate_post'],
        },
      },
    ];

    const skips = computeRoutingSkips(rules, 'collect_brief', ctx());
    assert.deepEqual([...skips], ['approve_design_plan']);
  });

  it('runs a conditional step only when the predicate holds', async () => {
    const step = createConditionalStep({
      when: (c) => c.inputPayload.run === true,
      run: async () => ({ type: 'CONTINUE', output: { ran: true } }),
    });

    const skipped = await step(ctx({ inputPayload: { run: false } }), {
      llmProvider: null,
      imageProvider: null,
      assetResolver: null,
    });
    assert.deepEqual(skipped.output, {});

    const ran = await step(ctx({ inputPayload: { run: true } }), {
      llmProvider: null,
      imageProvider: null,
      assetResolver: null,
    });
    assert.deepEqual(ran.output, { ran: true });
  });

  it('maps suggestedPath and predicates to a branch', () => {
    const analysis = normalizeAnalysisResult(
      { suggestedPath: 'quick', extracted: {} },
      [],
    );
    assert.equal(
      mapSuggestedPathToBranch(analysis.suggestedPath, {
        quick: 'fast',
        full: 'complete',
        clarify: 'ask',
      }),
      'fast',
    );
    assert.equal(
      suggestWorkflowPath(analysis, {
        branches: [
          { id: 'never', when: () => false },
          { id: 'always', when: () => true },
        ],
      }),
      'always',
    );
  });
});
