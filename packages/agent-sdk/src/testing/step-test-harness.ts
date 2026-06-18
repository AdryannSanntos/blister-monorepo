import type {
  AnyStepExecutor,
  ImageProvider,
  StepExecutionContext,
  StepExecutor,
  StepResult,
  StepRuntimeDeps,
} from '../core/types';
import { createStubImageProvider, createStubLlmProvider } from './stubs';

const baseContext = (overrides: Partial<StepExecutionContext>): StepExecutionContext => ({
  runId: 'step_harness_run',
  agentId: 'harness_agent',
  companyId: 'harness_company',
  stepKey: 'step',
  stepIndex: 0,
  inputPayload: {},
  previousStepsOutput: {},
  ...overrides,
});

/** Runs a single step executor in isolation with injected context/LLM stub. */
export class StepTestHarness {
  private readonly step: AnyStepExecutor;
  private context: StepExecutionContext = baseContext({});
  private llmResponse: unknown = {};
  private imageProvider: ImageProvider = createStubImageProvider();

  private constructor(step: AnyStepExecutor) {
    this.step = step;
  }

  static forStep(step: AnyStepExecutor): StepTestHarness {
    return new StepTestHarness(step);
  }

  withContext(overrides: Partial<StepExecutionContext>): this {
    this.context = baseContext(overrides);
    return this;
  }

  withLlmResponse(response: unknown): this {
    this.llmResponse = response;
    return this;
  }

  withImageProvider(provider: ImageProvider): this {
    this.imageProvider = provider;
    return this;
  }

  async run(): Promise<StepResult> {
    const deps: StepRuntimeDeps = {
      llmProvider: createStubLlmProvider(this.llmResponse),
      imageProvider: this.imageProvider,
    };

    if (this.step.length >= 2) {
      return (this.step as StepExecutor)(this.context, deps);
    }
    return (this.step as (c: StepExecutionContext) => Promise<StepResult>)(this.context);
  }
}
