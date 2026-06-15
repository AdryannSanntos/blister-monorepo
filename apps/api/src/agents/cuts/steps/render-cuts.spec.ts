import { createStubCutsRunDeps } from '../ports/cuts-run-deps';

describe('render cut clips stub', () => {
  it('assigns cutFileId for each rendered cut', async () => {
    const deps = createStubCutsRunDeps();
    const result = await deps.renderCutClips({
      runId: 'run-1',
      companyId: 'company-1',
      personalSpaceId: null,
      sourceFile: {
        id: 'source-1',
        companyId: 'company-1',
        personalSpaceId: null,
        mimeType: 'video/mp4',
        storageKey: 'files/source.mp4',
        extractedText: null,
        name: 'source.mp4',
      },
      cuts: [
        {
          id: 'cut-1',
          title: 'Hook',
          description: 'Opening',
          startSec: 0,
          endSec: 60,
          durationSec: 60,
          viralScore: 90,
          reviewStatus: 'pending',
        },
        {
          id: 'cut-2',
          title: 'Proof',
          description: 'Testimonial',
          startSec: 120,
          endSec: 180,
          durationSec: 60,
          viralScore: 85,
          reviewStatus: 'pending',
        },
      ],
    });

    expect(result.cuts).toHaveLength(2);
    expect(result.cuts[0]?.cutFileId).toBe('stub-file-run-1-cut-1');
    expect(result.cuts[1]?.cutFileId).toBe('stub-file-run-1-cut-2');
  });
});
