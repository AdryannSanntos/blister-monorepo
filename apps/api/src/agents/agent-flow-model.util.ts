export type ConfiguredTextModel = {
  providerId?: string;
  modelId?: string;
};

export const resolveConfiguredTextModel = (flowDefinition: unknown): ConfiguredTextModel => {
  if (!flowDefinition || typeof flowDefinition !== 'object') {
    return {};
  }

  const flow = flowDefinition as {
    config?: Record<string, unknown>;
    nodes?: unknown[];
  };

  const workflowConfig = flow.config;
  if (typeof workflowConfig?.modelId === 'string' && workflowConfig.modelId.length > 0) {
    return {
      modelId: workflowConfig.modelId,
      providerId:
        typeof workflowConfig.providerId === 'string' ? workflowConfig.providerId : undefined,
    };
  }

  const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
  for (const node of nodes) {
    if (!node || typeof node !== 'object') {
      continue;
    }

    const record = node as { type?: string; config?: Record<string, unknown> };
    if (record.type !== 'llm_call') {
      continue;
    }

    const config = record.config ?? {};
    if (typeof config.modelId === 'string' && config.modelId.length > 0) {
      return {
        modelId: config.modelId,
        providerId: typeof config.providerId === 'string' ? config.providerId : undefined,
      };
    }

    if (typeof config.providerId === 'string' && config.providerId.length > 0) {
      return { providerId: config.providerId };
    }
  }

  return {};
};
