import {
  buildCutClipFileName,
  buildCutRunFolderName,
  cutsRunFolderSystemKey,
  stripFileExtension,
} from './cut-run-folder.util';

describe('cut run folder naming', () => {
  it('builds a stable system key per run', () => {
    expect(cutsRunFolderSystemKey('run_abc')).toBe('agent:cuts:run:run_abc');
  });

  it('strips file extensions from source names', () => {
    expect(stripFileExtension('podcast-final.mp4')).toBe('podcast-final');
    expect(stripFileExtension('no-extension')).toBe('no-extension');
  });

  it('formats run folder names with date and source label', () => {
    const name = buildCutRunFolderName(
      'Deus existe Karnal.mp4',
      new Date('2026-06-15T18:30:00.000Z'),
    );
    expect(name).toBe('2026-06-15 — Deus existe Karnal');
  });

  it('formats clip file names with index and title', () => {
    expect(buildCutClipFileName(1, 'A IA Acredita em Deus?')).toBe(
      '01 — A IA Acredita em Deus?.mp4',
    );
    expect(buildCutClipFileName(12, 'Hook forte')).toBe('12 — Hook forte.mp4');
  });
});
