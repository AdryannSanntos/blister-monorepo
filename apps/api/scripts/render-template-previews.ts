/**
 * Renders sample PNG previews for carousel templates.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer, { type Browser } from 'puppeteer';
import { CarouselTemplateService } from '../src/agents/carousel/services/carousel-template.service';
import { hydratePreviewSampleSlides } from './lib/hydrate-slides';
import { wrapSlideDocument } from './lib/slide-page';
import { PREVIEW_SAMPLES } from './preview-samples';

const SAMPLE_DIR = process.env.PREVIEW_SAMPLE_DIR ?? join(__dirname, '_sample-img');
const OUT_ROOT =
  process.env.PREVIEW_OUT_ROOT ?? join(__dirname, '..', '..', 'web', 'public', 'templates');

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=')[1];
};

async function renderTemplate(
  browser: Browser,
  service: CarouselTemplateService,
  templateId: string,
): Promise<void> {
  if (!PREVIEW_SAMPLES[templateId]) {
    throw new Error(
      `No preview samples defined for template "${templateId}". Add it to preview-samples.ts`,
    );
  }

  const outDir = join(OUT_ROOT, templateId);
  mkdirSync(outDir, { recursive: true });
  const slides = hydratePreviewSampleSlides(service, templateId, SAMPLE_DIR);

  for (const [index, slide] of slides.entries()) {
    const page = await browser.newPage();
    await page.setViewport({ width: slide.width, height: slide.height });
    await page.setContent(wrapSlideDocument(slide.css, slide.html), {
      waitUntil: 'load',
      timeout: 30_000,
    });
    const png = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: slide.width, height: slide.height },
    });
    await page.close();

    const fileName = `${slide.slideKey}.png`;
    writeFileSync(join(outDir, fileName), png);
    if (index === 0) writeFileSync(join(outDir, 'cover.png'), png);
    console.log(`  ✓ ${templateId}/${fileName}`);
  }
  console.log(`Previews written to ${outDir}\n`);
}

async function main() {
  if (!existsSync(SAMPLE_DIR)) {
    throw new Error(`Sample image dir not found: ${SAMPLE_DIR}`);
  }

  const requested = arg('template') ?? 'content-machine';
  const templateIds = requested === 'all' ? Object.keys(PREVIEW_SAMPLES) : [requested];

  const service = new CarouselTemplateService();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    for (const templateId of templateIds) {
      console.log(`Rendering "${templateId}"…`);
      await renderTemplate(browser, service, templateId);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
