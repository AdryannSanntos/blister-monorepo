import type {
  ITranscriptionProvider,
  TranscribeParams,
  TranscriptSegment,
  TranscriptionResult,
} from '../transcription-provider';
import { TRANSCRIPTION_MAX_WAIT_MS } from '../transcription-provider';
import { parseProviderError } from '../../../errors';
import { retryOnTransient } from '../../../retry-on-transient';

export interface AssemblyAiSttAdapterOptions {
  apiKey: string;
  sttBaseUrl?: string;
}

type AssemblyAiTranscriptStatus = 'queued' | 'processing' | 'completed' | 'error';

interface AssemblyAiWord {
  start: number;
  end: number;
  text: string;
}

interface AssemblyAiUtterance {
  start: number;
  end: number;
  text: string;
  /** Diarization label (e.g. `A`, `B`) — present when speaker_labels is on. */
  speaker?: string;
  /** Word-level timestamps within this utterance (milliseconds). */
  words?: AssemblyAiWord[];
}

interface AssemblyAiTranscriptResponse {
  id: string;
  status: AssemblyAiTranscriptStatus;
  text?: string;
  utterances?: AssemblyAiUtterance[];
  words?: AssemblyAiWord[];
  audio_duration?: number;
  error?: string;
}

const DEFAULT_BASE_URL = 'https://api.assemblyai.com';
const DEFAULT_SPEECH_MODELS = ['universal-3-pro', 'universal-2'];

const POLL_INTERVAL_MS = 3_000;
const SEGMENT_TARGET_MS = 45_000;
const MIN_SEGMENT_BREAK_MS = 15_000;

/** Groups word-level timestamps into ~45s chunks for cut ranking when utterances are absent. */
export const buildTimedSegmentsFromWords = (words: AssemblyAiWord[]): TranscriptSegment[] => {
  if (words.length === 0) return [];

  const segments: TranscriptSegment[] = [];
  let chunkStart = words[0].start;
  let chunkEnd = words[0].end;
  let chunkWords: AssemblyAiWord[] = [words[0]];

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    const previousWord = words[index - 1];
    const spanMs = word.end - chunkStart;
    const isSentenceBreak = /[.!?]$/.test(previousWord.text) && spanMs >= MIN_SEGMENT_BREAK_MS;

    if (spanMs >= SEGMENT_TARGET_MS || isSentenceBreak) {
      segments.push({
        start: chunkStart,
        end: chunkEnd,
        text: chunkWords.map((item) => item.text).join(' '),
        words: chunkWords,
      });
      chunkStart = word.start;
      chunkWords = [];
    }

    chunkWords.push(word);
    chunkEnd = word.end;
  }

  if (chunkWords.length > 0) {
    segments.push({
      start: chunkStart,
      end: chunkEnd,
      text: chunkWords.map((item) => item.text).join(' '),
      words: chunkWords,
    });
  }

  return segments;
};

/** Prefer speaker utterances, then word chunks, then a single span from audio duration. */
export const resolveTimedSegments = (
  transcript: Pick<
    AssemblyAiTranscriptResponse,
    'utterances' | 'words' | 'text' | 'audio_duration'
  >,
): TranscriptSegment[] => {
  if (transcript.utterances && transcript.utterances.length > 0) {
    return transcript.utterances;
  }
  if (transcript.words && transcript.words.length > 0) {
    return buildTimedSegmentsFromWords(transcript.words);
  }

  const text = transcript.text?.trim();
  if (!text) return [];

  const durationMs = (transcript.audio_duration ?? 0) * 1000;
  return durationMs > 0 ? [{ start: 0, end: durationMs, text }] : [];
};

/** AssemblyAI speech-to-text adapter implementing the transcription capability. */
export class AssemblyAiSttAdapter implements ITranscriptionProvider {
  readonly provider = 'assemblyai';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: AssemblyAiSttAdapterOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.sttBaseUrl ?? DEFAULT_BASE_URL;
  }

  async transcribe(params: TranscribeParams): Promise<TranscriptionResult> {
    const created = await retryOnTransient(() => this.createTranscript(params));
    const transcript = await retryOnTransient(() => this.pollUntilDone(created));

    return {
      text: transcript.text ?? '',
      segments: resolveTimedSegments(transcript),
      words: transcript.words,
      duration: transcript.audio_duration,
    };
  }

  private async createTranscript(params: TranscribeParams): Promise<AssemblyAiTranscriptResponse> {
    const response = await fetch(`${this.baseUrl}/v2/transcript`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: params.audioUrl,
        speech_models: params.speechModels ?? DEFAULT_SPEECH_MODELS,
        language_code: params.language,
        speaker_labels: true,
      }),
    });

    if (!response.ok) {
      throw parseProviderError(this.provider, response.status, await response.text());
    }

    return (await response.json()) as AssemblyAiTranscriptResponse;
  }

  private async pollUntilDone(
    created: AssemblyAiTranscriptResponse,
  ): Promise<AssemblyAiTranscriptResponse> {
    const deadline = Date.now() + TRANSCRIPTION_MAX_WAIT_MS;
    let transcript = created;

    while (Date.now() < deadline) {
      if (transcript.status === 'completed') return transcript;
      if (transcript.status === 'error') {
        throw new Error(transcript.error ?? 'AssemblyAI transcription failed');
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const pollResponse = await fetch(`${this.baseUrl}/v2/transcript/${transcript.id}`, {
        headers: { Authorization: this.apiKey },
      });

      if (!pollResponse.ok) {
        throw parseProviderError(
          this.provider,
          pollResponse.status,
          await pollResponse.text(),
        );
      }

      transcript = (await pollResponse.json()) as AssemblyAiTranscriptResponse;
    }

    if (transcript.status !== 'completed') {
      throw new Error('AssemblyAI transcription timed out');
    }
    return transcript;
  }
}
