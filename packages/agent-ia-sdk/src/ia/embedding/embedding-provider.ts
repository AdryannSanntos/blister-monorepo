/**
 * Embedding capability. The model and output dimensionality are bound when the
 * adapter is constructed (the `AdapterFactory` resolves the platform embedding
 * model), so `embed` takes only the texts to vectorise.
 */
export interface IEmbeddingProvider {
  readonly provider: string;
  /** The resolved external model id this provider embeds with. */
  readonly model: string;
  /** Output vector dimensionality (must match the pgvector column). */
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
