/**
 * Validates carousel template preview samples for layout safety.
 *
 * Run: npx tsx apps/api/scripts/validate-template-previews.ts --template=all
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { CarouselTemplateService } from '../src/agents/carousel/services/carousel-template.service';
import { hydratePreviewSampleSlides, listAllTemplateIds } from './lib/hydrate-slides';
import { wrapSlideDocument } from './lib/slide-page';
import { collectSlideLayoutMetrics, layoutMetricsToIssues } from './lib/visual-metrics';
import { PREVIEW_SAMPLES } from './preview-samples';

const SAMPLE_DIR = process.env.PREVIEW_SAMPLE_DIR ?? join(__dirname, '_sample-img');

type ValidationIssue = {
  templateId: string;
  slideKey: string;
  code: string;
  message: string;
};

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=')[1];
};

const validateSlidePage = async (
  page: Page,
  input: { templateId: string; slideKey: string },
): Promise<ValidationIssue[]> => {
  const metrics = await page.evaluate(collectSlideLayoutMetrics);
  return layoutMetricsToIssues(metrics, input).map((issue) => ({
    templateId: input.templateId,
    slideKey: input.slideKey,
    code: issue.code,
    message: issue.message,
  }));
};

const validateTemplate = async (
  browser: Browser,
  service: CarouselTemplateService,
  templateId: string,
): Promise<ValidationIssue[]> => {
  if (!PREVIEW_SAMPLES[templateId]) return [];

  const hydrated = hydratePreviewSampleSlides(service, templateId, SAMPLE_DIR);
  const issues: ValidationIssue[] = [];

  for (const slide of hydrated) {
    const page = await browser.newPage();
    await page.setViewport({ width: slide.width, height: slide.height });
    await page.setContent(wrapSlideDocument(slide.css, slide.html), {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    });

    const slideIssues = await validateSlidePage(page, {
      templateId,
      slideKey: slide.slideKey,
    });
    issues.push(...slideIssues);
    await page.close();
  }

  return issues;
};

async function main() {
  if (!existsSync(SAMPLE_DIR)) {
    throw new Error(`Sample image dir not found: ${SAMPLE_DIR}`);
  }

  const requested = arg('template') ?? 'all';
  const templateIds =
    requested === 'all'
      ? listAllTemplateIds(new CarouselTemplateService()).filter((id) => PREVIEW_SAMPLES[id])
      : [requested];

  const service = new CarouselTemplateService();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const allIssues: ValidationIssue[] = [];

  try {
    for (const templateId of templateIds) {
      console.log(`Validating "${templateId}"…`);
      const issues = await validateTemplate(browser, service, templateId);
      allIssues.push(...issues);
      if (issues.length === 0) {
        console.log(`  ✓ ${templateId}: all slides passed\n`);
      } else {
        for (const issue of issues) {
          console.log(`  ✗ [${issue.code}] ${issue.slideKey}: ${issue.message}`);
        }
        console.log('');
      }
    }
  } finally {
    await browser.close();
  }

  if (allIssues.length > 0) {
    console.error(`\n${allIssues.length} validation issue(s) found.`);
    process.exit(1);
  }

  console.log('All template slides passed validation.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
