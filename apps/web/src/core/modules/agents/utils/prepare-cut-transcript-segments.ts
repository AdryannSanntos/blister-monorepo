import type {
  CutsTranscriptSegment,
  CutsTranscriptWord,
} from "@company-os/types";

/**
 * Display blocks are capped at this length so the active line never runs far
 * ahead of the audio in the teleprompter view. Sentence breaks take priority,
 * so most blocks are shorter than this.
 */
export const MAX_DISPLAY_SEGMENT_SEC = 5;

/** A word ending in sentence punctuation closes a display block. */
const SENTENCE_END = /[.?!;…]$/;
/** Detects a sentence boundary somewhere inside a block of text. */
const INNER_SENTENCE_BREAK = /[.?!;…]\s+\S/;

const countWords = (text: string): number =>
  text.split(/\s+/).filter(Boolean).length;

const baseIdFor = (segment: CutsTranscriptSegment): string =>
  segment.id ?? `seg-${segment.startSec}`;

/**
 * Splits using real word timestamps: a block ends at a sentence boundary or
 * once it would exceed `maxDurationSec`. No proportional guessing — every
 * boundary comes from the ASR's own word timings.
 */
const splitByWords = (
  segment: CutsTranscriptSegment,
  words: CutsTranscriptWord[],
  maxDurationSec: number,
): CutsTranscriptSegment[] => {
  const baseId = baseIdFor(segment);
  const blocks: CutsTranscriptSegment[] = [];
  let group: CutsTranscriptWord[] = [];

  const flush = (): void => {
    if (group.length === 0) return;
    const startSec = Math.max(segment.startSec, group[0].startSec);
    const endSec = Math.min(
      segment.endSec,
      Math.max(startSec, group[group.length - 1].endSec),
    );
    blocks.push({
      ...segment,
      id: `${baseId}-split-${blocks.length}`,
      startSec,
      endSec,
      text: group
        .map((word) => word.text)
        .join(" ")
        .trim(),
      words: group,
    });
    group = [];
  };

  for (const word of words) {
    group.push(word);
    const span = word.endSec - group[0].startSec;
    if (SENTENCE_END.test(word.text.trim()) || span >= maxDurationSec) flush();
  }
  flush();

  if (blocks.length <= 1) return [{ ...segment, words }];
  return blocks;
};

/** Splits a run of word strings across [startSec, endSec] into <=max chunks. */
const proportionalChunks = (
  words: string[],
  startSec: number,
  endSec: number,
  maxDurationSec: number,
): Array<{ startSec: number; endSec: number; text: string }> => {
  const duration = endSec - startSec;
  if (duration <= maxDurationSec || words.length <= 1) {
    return [{ startSec, endSec, text: words.join(" ") }];
  }

  const chunkCount = Math.max(2, Math.ceil(duration / maxDurationSec));
  const wordsPerChunk = Math.ceil(words.length / chunkCount);
  const chunks: Array<{ startSec: number; endSec: number; text: string }> = [];
  let wordIndex = 0;
  let cursor = startSec;

  for (
    let index = 0;
    index < chunkCount && wordIndex < words.length;
    index += 1
  ) {
    const slice = words.slice(wordIndex, wordIndex + wordsPerChunk);
    wordIndex += slice.length;
    const isLast = wordIndex >= words.length;
    const chunkEnd = isLast
      ? endSec
      : startSec + ((index + 1) * duration) / chunkCount;
    chunks.push({ startSec: cursor, endSec: chunkEnd, text: slice.join(" ") });
    cursor = chunkEnd;
  }

  return chunks;
};

/**
 * Fallback when no word timestamps exist: break on sentence punctuation first,
 * then cap each sentence at `maxDurationSec` with proportional sub-blocks.
 * Better than a blind proportional split, without breaking older transcripts.
 */
const splitProportional = (
  segment: CutsTranscriptSegment,
  maxDurationSec: number,
): CutsTranscriptSegment[] => {
  const baseId = baseIdFor(segment);
  const duration = segment.endSec - segment.startSec;
  const sentences = segment.text
    .split(/(?<=[.?!;…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [segment];

  const totalWords = Math.max(1, countWords(segment.text));
  const blocks: CutsTranscriptSegment[] = [];
  let cursor = segment.startSec;

  sentences.forEach((sentence, sentenceIndex) => {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean);
    const isLastSentence = sentenceIndex === sentences.length - 1;
    const sentenceEnd = isLastSentence
      ? segment.endSec
      : Math.min(
          segment.endSec,
          cursor + (duration * sentenceWords.length) / totalWords,
        );

    for (const chunk of proportionalChunks(
      sentenceWords,
      cursor,
      Math.max(cursor, sentenceEnd),
      maxDurationSec,
    )) {
      blocks.push({
        ...segment,
        id: `${baseId}-split-${blocks.length}`,
        startSec: chunk.startSec,
        endSec: chunk.endSec,
        text: chunk.text,
        words: undefined,
      });
    }
    cursor = sentenceEnd;
  });

  if (blocks.length <= 1) return [segment];
  return blocks;
};

/**
 * Splits a long STT utterance into shorter review blocks. Prefers real word
 * timestamps when present; otherwise falls back to a sentence-aware
 * proportional split. Either way blocks stay at or under `maxDurationSec`.
 */
export const splitLongTranscriptSegment = (
  segment: CutsTranscriptSegment,
  maxDurationSec = MAX_DISPLAY_SEGMENT_SEC,
): CutsTranscriptSegment[] => {
  const words = segment.words;
  if (words && words.length > 0) {
    return splitByWords(segment, words, maxDurationSec);
  }

  const duration = segment.endSec - segment.startSec;
  // Short blocks with no inner sentence break need no further work.
  if (duration <= maxDurationSec && !INNER_SENTENCE_BREAK.test(segment.text)) {
    return [segment];
  }
  if (countWords(segment.text) <= 1) return [segment];

  return splitProportional(segment, maxDurationSec);
};

/** Filters, clips, and splits transcript segments for one cut preview. */
export const prepareCutTranscriptSegments = (
  segments: CutsTranscriptSegment[],
  cutStartSec: number,
  cutEndSec: number,
): CutsTranscriptSegment[] => {
  const prepared: CutsTranscriptSegment[] = [];

  for (const segment of segments) {
    if (segment.endSec <= cutStartSec || segment.startSec >= cutEndSec)
      continue;

    const clippedWords = segment.words
      ?.filter((word) => word.endSec > cutStartSec && word.startSec < cutEndSec)
      .map((word) => ({
        text: word.text,
        startSec: Math.max(word.startSec, cutStartSec),
        endSec: Math.min(word.endSec, cutEndSec),
      }));

    const clipped: CutsTranscriptSegment = {
      ...segment,
      startSec: Math.max(segment.startSec, cutStartSec),
      endSec: Math.min(segment.endSec, cutEndSec),
      text: segment.text.trim(),
      words: clippedWords,
    };

    if (!clipped.text) continue;

    for (const part of splitLongTranscriptSegment(clipped)) {
      prepared.push(part);
    }
  }

  return prepared.sort(
    (a, b) => a.startSec - b.startSec || a.endSec - b.endSec,
  );
};
