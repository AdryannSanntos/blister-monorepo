export interface RunSnapshot {
  runId: string;
  agentId: string;
  agentVersion?: string;
  companyId: string;
  input: Record<string, unknown>;
  prompts: Array<{ stepKey: string; system?: string; user?: string }>;
  stepOutputs: Array<{ stepKey: string; output: Record<string, unknown> }>;
  llmResponses: Array<{ stepKey: string; model?: string; content?: string }>;
}

export class RunSnapshotBuilder {
  private readonly snapshot: RunSnapshot;

  constructor(params: {
    runId: string;
    agentId: string;
    companyId: string;
    agentVersion?: string;
    input: Record<string, unknown>;
  }) {
    this.snapshot = {
      runId: params.runId,
      agentId: params.agentId,
      agentVersion: params.agentVersion,
      companyId: params.companyId,
      input: params.input,
      prompts: [],
      stepOutputs: [],
      llmResponses: [],
    };
  }

  recordStepOutput(stepKey: string, output: Record<string, unknown>): this {
    this.snapshot.stepOutputs.push({ stepKey, output });
    return this;
  }

  recordPrompt(stepKey: string, prompt: { system?: string; user?: string }): this {
    this.snapshot.prompts.push({ stepKey, ...prompt });
    return this;
  }

  recordLlmResponse(stepKey: string, response: { model?: string; content?: string }): this {
    this.snapshot.llmResponses.push({ stepKey, ...response });
    return this;
  }

  build(): RunSnapshot {
    return this.snapshot;
  }
}
