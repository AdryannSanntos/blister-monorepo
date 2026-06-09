import type { AiModel } from "@company-os/types";

export const filterEnabledModels = (models: AiModel[]): AiModel[] =>
  models.filter((model) => model.isEnabled);

export const filterEmbeddingModels = (models: AiModel[]): AiModel[] =>
  filterEnabledModels(models).filter((model) =>
    model.capabilities?.includes("embedding"),
  );

export const filterTextModels = (models: AiModel[]): AiModel[] =>
  filterEnabledModels(models).filter((model) => {
    const capabilities = model.capabilities ?? [];
    return (
      capabilities.includes("text") || capabilities.includes("structured_output")
    );
  });
