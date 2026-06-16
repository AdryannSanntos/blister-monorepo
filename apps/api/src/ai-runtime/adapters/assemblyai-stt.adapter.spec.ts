import {
  buildTimedSegmentsFromWords,
  resolveAssemblyAiTimedSegments,
} from './assemblyai-stt.adapter';

describe('resolveAssemblyAiTimedSegments', () => {
  it('returns utterances when speaker labels are present', () => {
    const segments = resolveAssemblyAiTimedSegments({
      utterances: [{ start: 0, end: 5_000, text: 'Hello world.' }],
      words: [{ start: 0, end: 1_000, text: 'Hello' }],
      text: 'Hello world.',
    });

    expect(segments).toEqual([{ start: 0, end: 5_000, text: 'Hello world.' }]);
  });

  it('builds timed segments from words when utterances are missing', () => {
    const segments = resolveAssemblyAiTimedSegments({
      words: [
        { start: 0, end: 500, text: 'Primeiro' },
        { start: 600, end: 1_100, text: 'trecho.' },
        { start: 50_000, end: 50_500, text: 'Segundo' },
        { start: 50_600, end: 51_100, text: 'trecho.' },
      ],
      text: 'Primeiro trecho. Segundo trecho.',
    });

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      start: 0,
      end: 1_100,
      text: 'Primeiro trecho.',
    });
    expect(segments[1]).toMatchObject({
      start: 50_000,
      end: 51_100,
      text: 'Segundo trecho.',
    });
  });

  it('falls back to a single span when only text and duration are available', () => {
    const segments = resolveAssemblyAiTimedSegments({
      text: 'Conteúdo sem palavras individuais.',
      audio_duration: 120,
    });

    expect(segments).toEqual([
      {
        start: 0,
        end: 120_000,
        text: 'Conteúdo sem palavras individuais.',
      },
    ]);
  });

  it('returns an empty list when no speech was detected', () => {
    expect(resolveAssemblyAiTimedSegments({ text: '   ' })).toEqual([]);
  });
});

describe('buildTimedSegmentsFromWords', () => {
  it('splits long spans into multiple segments', () => {
    const words = Array.from({ length: 20 }, (_, index) => ({
      start: index * 3_000,
      end: index * 3_000 + 2_500,
      text: `word${index}`,
    }));

    const segments = buildTimedSegmentsFromWords(words);

    expect(segments.length).toBeGreaterThan(1);
    expect(segments[0].start).toBe(0);
    expect(segments.at(-1)?.end).toBe(59_500);
  });
});
