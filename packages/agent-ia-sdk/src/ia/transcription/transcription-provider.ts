/** Max wall-clock wait while polling async STT jobs (e.g. AssemblyAI). */
export const TRANSCRIPTION_MAX_WAIT_MS = 40 * 60 * 1000;

/** A single word with millisecond timestamps. */
export interface WordTimestamp {
  start: number;
  end: number;
  text: string;
}

/** A timed transcript segment (speaker utterance or word chunk), in milliseconds. */
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  /** Diarization label (e.g. `A`, `B`) when the provider resolves speakers. */
  speaker?: string;
  /** Word-level timestamps (milliseconds) belonging to this segment, when resolved. */
  words?: WordTimestamp[];
}

export interface TranscribeParams {
  /** Publicly fetchable URL the provider can read the audio/video from. */
  audioUrl: string;
  /** BCP-47-ish language code (e.g. `pt`). Omit to let the provider auto-detect. */
  language?: string;
  /** Optional provider-native speech model ids, highest priority first. */
  speechModels?: string[];
}

export interface TranscriptionResult {
  text: string;
  /**
   * Timed segments resolved from speaker utterances, falling back to word
   * chunks, then a single span. The cuts agent ranks cuts from these.
   */
  segments: TranscriptSegment[];
  words?: WordTimestamp[];
  /** Audio duration in seconds, when the provider reports it. */
  duration?: number;
}

/**
 * Speech-to-text capability. Adapters (AssemblyAI, …) implement this; the cuts
 * agent depends only on this interface.
 */
export interface ITranscriptionProvider {
  transcribe(params: TranscribeParams): Promise<TranscriptionResult>;
}
