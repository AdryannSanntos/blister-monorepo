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

export type AssemblyAiTranscriptResponse = {
  id: string;
  status: AssemblyAiTranscriptStatus;
  text?: string;
  utterances?: AssemblyAiUtterance[];
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

  return {
    text: transcript.text ?? '',
    utterances: transcript.utterances ?? [],
  };
};
