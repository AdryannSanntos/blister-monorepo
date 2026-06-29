import type { TruncatableSlideCopy } from './copy-limits.util';

const OVERSIZED_THRESHOLD = 180;

const splitSentences = (text: string): string[] => {
  const matches = text.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g);
  return matches?.map((part) => part.trim()).filter(Boolean) ?? [text.trim()];
};

const chunkSentences = (sentences: string[], chunkCount: number): string[] => {
  if (sentences.length === 0) return [];
  if (chunkCount <= 1) return [sentences.join(' ')];

  const chunks: string[] = [];
  const perChunk = Math.ceil(sentences.length / chunkCount);

  for (let index = 0; index < sentences.length; index += perChunk) {
    chunks.push(sentences.slice(index, index + perChunk).join(' ').trim());
  }

  return chunks.filter(Boolean);
};

const splitLongText = (text: string, chunkCount: number): string[] => {
  const sentences = splitSentences(text);
  if (sentences.length >= chunkCount) {
    return chunkSentences(sentences, chunkCount);
  }

  if (text.length <= OVERSIZED_THRESHOLD) {
    return [text];
  }

  const words = text.split(/\s+/);
  const perChunk = Math.ceil(words.length / chunkCount);
  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += perChunk) {
    chunks.push(words.slice(index, index + perChunk).join(' ').trim());
  }

  return chunks.filter(Boolean);
};

export const splitOversizedContentMachineCopy = <T extends TruncatableSlideCopy>(
  slide: T,
  options?: { templateId?: string },
): T => {
  if (options?.templateId !== 'content-machine') return slide;
  if (slide.narrativeRole === 'hook') return slide;

  const body = slide.body?.trim();
  if (!body || body.length <= OVERSIZED_THRESHOLD) return slide;
  if (slide.body2?.trim()) return slide;

  const hasSubtitle = Boolean(slide.subtitle?.trim());
  const isCta = slide.narrativeRole === 'cta';

  if (isCta || hasSubtitle) {
    const [first, second] = splitLongText(body, 2);
    return {
      ...slide,
      body: first,
      body2: second || undefined,
    };
  }

  const [first, second, third] = splitLongText(body, 3);
  return {
    ...slide,
    body: first,
    body2: second || undefined,
    subtitle: third || slide.subtitle,
  };
};
