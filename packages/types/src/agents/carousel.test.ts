import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { carouselAgentSettingsSchema, carouselRunInputSchema } from './carousel';

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
