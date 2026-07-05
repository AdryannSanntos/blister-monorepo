import { remapLegacyCarouselStepKey } from './carousel-legacy-resume.util';

describe('remapLegacyCarouselStepKey', () => {
  it('maps await_content_approval to generate_design_plan', () => {
    expect(remapLegacyCarouselStepKey('await_content_approval')).toBe('generate_design_plan');
  });

  it('maps await_design_approval to generate_slides', () => {
    expect(remapLegacyCarouselStepKey('await_design_approval')).toBe('generate_slides');
  });

  it('returns null for a current, still-valid step key', () => {
    expect(remapLegacyCarouselStepKey('generate_ideas')).toBeNull();
  });
});
