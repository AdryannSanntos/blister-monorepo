import type { ITextProvider } from '../text/text-provider';

export interface CaptionInput {
  fileName: string;
  mimeType: string;
  imageBase64?: string;
}

export interface CaptionServiceDeps {
  textProvider: ITextProvider;
  /** Resolved caption model id to complete with. */
  model: string;
}

const CAPTION_SYSTEM_PROMPT =
  'You describe files for semantic search in a marketing knowledge base. ' +
  'Reply in Brazilian Portuguese with a concise, factual description (2-4 sentences). ' +
  'Mention visible text, products, colors, mood, and marketing context when relevant. ' +
  'Do not use markdown or bullet lists.';

const buildCaptionUserPrompt = (input: CaptionInput): string =>
  input.imageBase64
    ? `Describe this image file for search indexing.\nFile name: ${input.fileName}\nMIME type: ${input.mimeType}`
    : `Describe this campaign file for search indexing based on its metadata.\n` +
      `File name: ${input.fileName}\nMIME type: ${input.mimeType}`;

/**
 * Generates a search caption for a file using the text capability. Vision is
 * provided via `images` when an `imageBase64` is supplied — adapters that
 * support vision use it; others fall back to filename/metadata.
 */
export class CaptionService {
  private readonly textProvider: ITextProvider;
  private readonly model: string;

  constructor(deps: CaptionServiceDeps) {
    this.textProvider = deps.textProvider;
    this.model = deps.model;
  }

  async caption(input: CaptionInput): Promise<string> {
    const result = await this.textProvider.complete({
      model: this.model,
      temperature: 0.3,
      maxTokens: 512,
      messages: [
        { role: 'system', content: CAPTION_SYSTEM_PROMPT },
        { role: 'user', content: buildCaptionUserPrompt(input) },
      ],
      images:
        input.imageBase64 && input.mimeType.startsWith('image/')
          ? [{ mimeType: input.mimeType, base64: input.imageBase64 }]
          : undefined,
    });

    return result.content.trim();
  }
}
