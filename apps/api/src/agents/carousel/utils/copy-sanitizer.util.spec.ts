import { sanitizeSlideCopyFields, stripHashtags } from './copy-sanitizer.util';

describe('copy-sanitizer.util', () => {
  it('removes hashtags and instagram handles', () => {
    expect(stripHashtags('Loop Engineering #AI #Marketing @adryansantoss')).toBe(
      'Loop Engineering',
    );
  });

  it('collapses content-machine hook slide to title only', () => {
    const hashtagWall = Array.from({ length: 40 }, (_, index) => `#Tag${index}`).join(' ');
    const result = sanitizeSlideCopyFields(
      {
        narrativeRole: 'hook',
        title: `Pare de escrever prompts. ${hashtagWall}`,
        body: 'Corpo que não deveria aparecer na capa.',
        subtitle: 'Subtítulo indevido.',
      },
      { templateId: 'content-machine', narrativeRole: 'hook' },
    );

    expect(result.title).toBe('Pare de escrever prompts.');
    expect(result.body).toBeUndefined();
    expect(result.subtitle).toBeUndefined();
    expect(result.title).not.toContain('#');
  });

  it('promotes body to title when hook cover title is missing', () => {
    const result = sanitizeSlideCopyFields(
      {
        narrativeRole: 'hook',
        body: 'Headline na legenda errada. #hashtag',
      },
      { templateId: 'content-machine', narrativeRole: 'hook' },
    );

    expect(result.title).toBe('Headline na legenda errada.');
    expect(result.body).toBeUndefined();
  });

  it('keeps subtitle on editorial hook slides', () => {
    const result = sanitizeSlideCopyFields(
      {
        narrativeRole: 'hook',
        title: 'Título forte',
        body: 'Linha de apoio para a capa.',
      },
      { templateId: 'editorial-performance', narrativeRole: 'hook' },
    );

    expect(result.title).toBe('Título forte');
    expect(result.subtitle).toBe('Linha de apoio para a capa.');
    expect(result.body).toBeUndefined();
  });
});
