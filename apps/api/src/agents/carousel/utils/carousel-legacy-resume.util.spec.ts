import { remapLegacyCarouselStepKey } from './carousel-legacy-resume.util';

describe('remapLegacyCarouselStepKey', () => {
  it('maps generate_design_plan (removed step) to generate_slides', () => {
    expect(remapLegacyCarouselStepKey('generate_design_plan')).toBe('generate_slides');
  });

  it('maps await_design_approval (removed step) to generate_slides', () => {
    expect(remapLegacyCarouselStepKey('await_design_approval')).toBe('generate_slides');
  });

  it('returns null for await_content_approval (now an active step)', () => {
    expect(remapLegacyCarouselStepKey('await_content_approval')).toBeNull();
  });

  it('returns null for a current, still-valid step key', () => {
    expect(remapLegacyCarouselStepKey('generate_ideas')).toBeNull();
  });
});
