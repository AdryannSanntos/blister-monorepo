/**
 * Validates ALL carousel template variations for layout safety and anti-AI patterns.
 *
 * Run: npx tsx apps/api/scripts/validate-visual-all.ts --template=all
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { CarouselTemplateService } from '../src/agents/carousel/services/carousel-template.service';
import {
  type AiPatternHit,
  hasBlockingAiPatterns,
  lintCssForAiPatterns,
} from './lib/ai-pattern-lint';
import {
  type HydratedSlide,
  hydrateAllManifestVariations,
  listAllTemplateIds,
} from './lib/hydrate-slides';
import { wrapSlideDocument } from './lib/slide-page';
import {
  type SlideLayoutMetrics,
  collectSlideLayoutMetrics,
  layoutMetricsToIssues,
} from './lib/visual-metrics';

const SAMPLE_DIR = process.env.PREVIEW_SAMPLE_DIR ?? join(__dirname, '_sample-img');
const REPORT_DIR = join(__dirname, '_reports');

type VisualIssue = {
  templateId: string;
  slideType: string;
  variationId: string;
  slideKey: string;
  code: string;
  severity: 'error' | 'warning';
  message: string;
};

type SlideReport = {
  templateId: string;
  slideType: string;
  variationId: string;
  slideKey: string;
  passed: boolean;
  layout: SlideLayoutMetrics;
  aiPatterns: AiPatternHit[];
  issues: VisualIssue[];
};

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=')[1];
};

const validateSlide = async (page: Page, slide: HydratedSlide): Promise<SlideReport> => {
  await page.setViewport({ width: slide.width, height: slide.height });
  await page.setContent(wrapSlideDocument(slide.css, slide.html), {
    waitUntil: 'networkidle0',
    timeout: 30_000,
  });

  const layout = await page.evaluate(collectSlideLayoutMetrics);
  const layoutIssues = layoutMetricsToIssues(layout, {
    templateId: slide.templateId,
    slideKey: slide.slideKey,
  });

  const aiPatterns = lintCssForAiPatterns(slide.css);
  const issues: VisualIssue[] = [
    ...layoutIssues.map((i) => ({
      templateId: slide.templateId,
      slideType: slide.slideType,
      variationId: slide.variationId,
      slideKey: slide.slideKey,
      code: i.code,
      severity: 'error' as const,
      message: i.message,
    })),
    ...aiPatterns
      .filter((p) => p.severity === 'blocking')
      .map((p) => ({
        templateId: slide.templateId,
        slideType: slide.slideType,
        variationId: slide.variationId,
        slideKey: slide.slideKey,
        code: p.code,
        severity: 'error' as const,
        message: p.message,
      })),
    ...aiPatterns
      .filter((p) => p.severity === 'warning')
      .map((p) => ({
        templateId: slide.templateId,
        slideType: slide.slideType,
        variationId: slide.variationId,
        slideKey: slide.slideKey,
        code: p.code,
        severity: 'warning' as const,
        message: p.message,
      })),
  ];

  const passed = layoutIssues.length === 0 && !hasBlockingAiPatterns(aiPatterns);

  return {
    templateId: slide.templateId,
    slideType: slide.slideType,
    variationId: slide.variationId,
    slideKey: slide.slideKey,
    passed,
    layout,
    aiPatterns,
    issues,
  };
};

async function main() {
  const requested = arg('template') ?? 'all';
  const service = new CarouselTemplateService();
  const allSlides = hydrateAllManifestVariations(service, SAMPLE_DIR);
  const templateFilter = requested === 'all' ? null : new Set([requested]);

  const slides = templateFilter
    ? allSlides.filter((s) => templateFilter.has(s.templateId))
    : allSlides;

  if (slides.length === 0) {
    throw new Error(`No slides found for template "${requested}"`);
  }

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const reports: SlideReport[] = [];

  try {
    for (const slide of slides) {
      const page = await browser.newPage();
      const report = await validateSlide(page, slide);
      reports.push(report);
      await page.close();

      const icon = report.passed ? '✓' : '✗';
      const warnCount = report.issues.filter((i) => i.severity === 'warning').length;
      const errCount = report.issues.filter((i) => i.severity === 'error').length;
      console.log(
        `  ${icon} ${slide.templateId}/${slide.slideType}/${slide.variationId}` +
          (errCount || warnCount ? ` (${errCount} errors, ${warnCount} warnings)` : ''),
      );
      for (const issue of report.issues.filter((i) => i.severity === 'error')) {
        console.log(`      ✗ [${issue.code}] ${issue.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    total: reports.length,
    passed: reports.filter((r) => r.passed).length,
    failed: reports.filter((r) => !r.passed).length,
    warnings: reports.reduce(
      (n, r) => n + r.issues.filter((i) => i.severity === 'warning').length,
      0,
    ),
    templates: listAllTemplateIds(service),
    slides: reports,
  };
  writeFileSync(join(REPORT_DIR, 'visual-audit.json'), JSON.stringify(summary, null, 2));

  const errors = reports.flatMap((r) => r.issues.filter((i) => i.severity === 'error'));
  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s) across ${reports.length} slides.`);
    console.error(`Report: ${join(REPORT_DIR, 'visual-audit.json')}`);
    process.exit(1);
  }

  console.log(`\nAll ${reports.length} slides passed visual validation.`);
  console.log(`Report: ${join(REPORT_DIR, 'visual-audit.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
