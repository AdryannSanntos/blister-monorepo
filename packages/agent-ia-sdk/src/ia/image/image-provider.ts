export interface ImageGenerateParams {
  prompt: string;
  /** Provider-native size hint, e.g. `1024x1024`. */
  size?: string;
  /** Number of images to generate. */
  n?: number;
}

export interface ImageResult {
  url: string;
  /** Base64-encoded image bytes, when the provider returns inline data. */
  b64?: string;
}

/**
 * Image generation capability. No adapter is active yet — this interface lets
 * `agents/steps/create-image-generation-step.ts` depend on the capability now;
 * concrete adapters (DALL·E, Flux, Gemini image, …) plug in later. The
 * `AdapterFactory` throws `CapabilityNotConfiguredError` until one exists.
 */
export interface IImageProvider {
  generate(params: ImageGenerateParams): Promise<ImageResult>;
}
