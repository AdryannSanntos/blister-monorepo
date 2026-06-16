export type AssemblyAiTranscriptStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'error';

export type AssemblyAiUtterance = {
  start: number;
  end: number;
  text: string;
};

export type AssemblyAiWord = {
  start: number;
  end: number;
  text: string;
};

export type AssemblyAiTranscriptResponse = {
  id: string;
  status: AssemblyAiTranscriptStatus;
  text?: string;
  utterances?: AssemblyAiUtterance[];
  words?: AssemblyAiWord[];
  audio_duration?: number;
  error?: string;
};

export type TranscribeWithAssemblyAiParams = {
  audioUrl: string;
  apiKey: string;
  baseUrl?: string;
  speechModels?: string[];
  languageCode?: string;
};

const DEFAULT_SPEECH_MODELS = ['universal-3-pro', 'universal-2'];

const pollIntervalMs = 3_000;
const maxPollAttempts = 40;
const segmentTargetMs = 45_000;
const minSegmentBreakMs = 15_000;

/** Groups word-level timestamps into ~45s chunks for cut ranking when utterances are absent. */
export const buildTimedSegmentsFromWords = (
  words: AssemblyAiWord[],
): AssemblyAiUtterance[] => {
  if (words.length === 0) {
    return [];
  }

  const segments: AssemblyAiUtterance[] = [];
  let chunkStart = words[0].start;
  let chunkEnd = words[0].end;
  let chunkTexts = [words[0].text];

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    const previousWord = words[index - 1];
    const spanMs = word.end - chunkStart;
    const isSentenceBreak =
      /[.!?]$/.test(previousWord.text) && spanMs >= minSegmentBreakMs;

    if (spanMs >= segmentTargetMs || isSentenceBreak) {
      segments.push({
        start: chunkStart,
        end: chunkEnd,
        text: chunkTexts.join(' '),
      });
      chunkStart = word.start;
      chunkTexts = [];
    }

    chunkTexts.push(word.text);
    chunkEnd = word.end;
  }

  if (chunkTexts.length > 0) {
    segments.push({
      start: chunkStart,
      end: chunkEnd,
      text: chunkTexts.join(' '),
    });
  }

  return segments;
};

/** Prefer speaker utterances, then word chunks, then a single span from audio duration. */
export const resolveAssemblyAiTimedSegments = (
  transcript: Pick<
    AssemblyAiTranscriptResponse,
    'utterances' | 'words' | 'text' | 'audio_duration'
  >,
): AssemblyAiUtterance[] => {
  if (transcript.utterances && transcript.utterances.length > 0) {
    return transcript.utterances;
  }

  if (transcript.words && transcript.words.length > 0) {
    return buildTimedSegmentsFromWords(transcript.words);
  }

  const text = transcript.text?.trim();
  if (!text) {
    return [];
  }

  const durationMs = (transcript.audio_duration ?? 0) * 1000;
  if (durationMs > 0) {
    return [{ start: 0, end: durationMs, text }];
  }

  return [];
};

export const transcribeWithAssemblyAi = async (
  params: TranscribeWithAssemblyAiParams,
): Promise<{ text: string; utterances: AssemblyAiUtterance[] }> => {
  const baseUrl = params.baseUrl ?? 'https://api.assemblyai.com';

  const createResponse = await fetch(`${baseUrl}/v2/transcript`, {
    method: 'POST',
    headers: {
      Authorization: params.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: params.audioUrl,
      speech_models: params.speechModels ?? DEFAULT_SPEECH_MODELS,
      language_code: params.languageCode,
      speaker_labels: true,
    }),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text();
    throw new Error(`AssemblyAI transcript create failed: ${createResponse.status} ${body}`);
  }

  const created = (await createResponse.json()) as AssemblyAiTranscriptResponse;
  let transcript = created;

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    if (transcript.status === 'completed') {
      break;
    }
    if (transcript.status === 'error') {
      throw new Error(transcript.error ?? 'AssemblyAI transcription failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const pollResponse = await fetch(`${baseUrl}/v2/transcript/${transcript.id}`, {
      headers: { Authorization: params.apiKey },
    });

    if (!pollResponse.ok) {
      const body = await pollResponse.text();
      throw new Error(`AssemblyAI transcript poll failed: ${pollResponse.status} ${body}`);
    }

    transcript = (await pollResponse.json()) as AssemblyAiTranscriptResponse;
  }

  if (transcript.status !== 'completed') {
    throw new Error('AssemblyAI transcription timed out');
  }

  const text = transcript.text ?? '';
  const utterances = resolveAssemblyAiTimedSegments(transcript);

  return {
    text,
    utterances,
  };
};
