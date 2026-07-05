import contentMachine from './preview-samples/content-machine';
import daylight from './preview-samples/daylight';
import editorialPerformance from './preview-samples/editorial-performance';
import minimalClean from './preview-samples/minimal-clean';
import reel from './preview-samples/reel';
import spotlight from './preview-samples/spotlight';
/**
 * Index of per-template preview sample content used by
 * render-template-previews.ts. Each template owns one file in
 * ./preview-samples/<id>.ts exporting a default SampleSet, so multiple
 * templates can be authored in isolation without touching this file.
 */
import type { SampleBrand, SampleSet, SampleSlide } from './preview-samples/types';
import voltage from './preview-samples/voltage';

export type { SampleBrand, SampleSet, SampleSlide };

export const PREVIEW_SAMPLES: Record<string, SampleSet> = {
  'content-machine': contentMachine,
  daylight,
  'editorial-performance': editorialPerformance,
  'minimal-clean': minimalClean,
  reel,
  spotlight,
  voltage,
};
