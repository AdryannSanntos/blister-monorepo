import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { carouselAgentSettingsSchema } from './agents/carousel';
import {
  agentWorkspaceSettingsResponseSchema,
  updateAgentWorkspaceSettingsSchema,
} from './blister-os';

describe('agent workspace settings schemas', () => {
  it('does not strip carousel fields when parsing API responses', () => {
    const payload = {
      agentId: 'carousel',
      config: {
        slidesCount: 7,
        brandName: 'Creator Lab',
        instagramHandle: 'creatorlab',
        accentColor: '#112233',
        defaultSocialNetworks: ['instagram'],
        aiGeneratedImages: true,
        metaRightMode: 'date',
      },
    };

    const parsed = agentWorkspaceSettingsResponseSchema.parse(payload);
    const settings = carouselAgentSettingsSchema.parse(parsed.config);

    assert.equal(settings.brandName, 'Creator Lab');
    assert.equal(settings.slidesCount, 7);
    assert.equal(settings.accentColor, '#112233');
    assert.equal(settings.metaRightMode, 'date');
  });

  it('does not coerce carousel PATCH payloads into cuts settings', () => {
    const body = {
      config: {
        slidesCount: 6,
        brandName: 'Marca X',
        accentColor: '#AABBCC',
        defaultSocialNetworks: ['instagram'],
        aiGeneratedImages: false,
        metaRightMode: 'handle',
      },
    };

    const parsed = updateAgentWorkspaceSettingsSchema.parse(body);
    const settings = carouselAgentSettingsSchema.parse(parsed.config);

    assert.equal(settings.brandName, 'Marca X');
    assert.equal(settings.accentColor, '#AABBCC');
    assert.equal(settings.slidesCount, 6);
  });
});
