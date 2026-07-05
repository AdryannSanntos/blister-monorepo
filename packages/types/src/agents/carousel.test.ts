import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  carouselAgentSettingsSchema,
  carouselIdeaSelectionSchema,
  carouselRunInputSchema,
} from './carousel';

describe('carouselRunInputSchema', () => {
  it('accepts a single-slide carousel', () => {
    const parsed = carouselRunInputSchema.safeParse({
      theme: 'Morning habits',
      templateId: 'editorial-performance',
      socialNetworks: ['instagram'],
      slidesCount: 1,
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.slidesCount, 1);
    }
  });

  it('accepts single-slide settings nested in run input', () => {
    const parsed = carouselRunInputSchema.safeParse({
      theme: 'Morning habits',
      templateId: 'editorial-performance',
      socialNetworks: ['instagram'],
      slidesCount: 1,
      settings: carouselAgentSettingsSchema.parse({ slidesCount: 1 }),
    });

    assert.equal(parsed.success, true);
  });
});

describe('carouselIdeaSelectionSchema', () => {
  it('accepts selectedIdeaId when customIdea is absent', () => {
    const parsed = carouselIdeaSelectionSchema.safeParse({
      selectedIdeaId: 'idea_1',
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.selectedIdeaId, 'idea_1');
      assert.equal(parsed.data.customIdea, undefined);
    }
  });

  it('accepts customIdea when selectedIdeaId is absent', () => {
    const parsed = carouselIdeaSelectionSchema.safeParse({
      customIdea: { title: 'Minha ideia' },
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.customIdea?.title, 'Minha ideia');
      assert.equal(parsed.data.selectedIdeaId, undefined);
    }
  });

  it('accepts customIdea with optional description', () => {
    const parsed = carouselIdeaSelectionSchema.safeParse({
      customIdea: {
        title: 'Hook sobre produtividade',
        description: 'Foco em rotina matinal de 15 minutos',
      },
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.customIdea?.description, 'Foco em rotina matinal de 15 minutos');
    }
  });

  it('rejects when both selectedIdeaId and customIdea are absent', () => {
    const parsed = carouselIdeaSelectionSchema.safeParse({});

    assert.equal(parsed.success, false);
  });

  it('rejects customIdea with empty title', () => {
    const parsed = carouselIdeaSelectionSchema.safeParse({
      customIdea: { title: '' },
    });

    assert.equal(parsed.success, false);
  });
});
