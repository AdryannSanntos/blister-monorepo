/**
 * Hydrates and validates DOM shell for EVERY manifest variation (not just preview samples).
 * Uses Playwright-compatible Puppeteer checks: header, footer, progress visibility.
 *
 * Run: npx tsx apps/api/scripts/validate-all-template-variations.ts
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CarouselSlideType } from '@company-os/types';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { CarouselTemplateService } from '../src/agents/carousel/services/carousel-template.service';
import { assembleSlideCss } from '../src/agents/carousel/utils/brand-theme.util';
import { hydrateSlideHtml } from '../src/agents/carousel/utils/slide-template-engine';
import {
  TEMPLATE_SHELL_RULES,
  isCoverVariation,
} from '../src/agents/carousel/utils/template-shell-rules';
import {
  DEFAULT_BRAND,
  IMAGE_POOL,
  buildMinimalSlideContent,
  dataUriFromSampleDir,
  listAllTemplateIds,
  resolveCanvasSize,
  resolveVariationIds,
} from './lib/hydrate-slides';
import { wrapSlideDocument } from './lib/slide-page';

const SAMPLE_DIR = process.env.PREVIEW_SAMPLE_DIR ?? join(__dirname, '_sample-img');

type ValidationIssue = {
  templateId: string;
  slideType: string;
  variationId: string;
  code: string;
  message: string;
};

const validateDomShell = async (
  page: Page,
  input: { templateId: string; slideType: string; variationId: string },
): Promise<ValidationIssue[]> => {
  const issues: ValidationIssue[] = [];
  const context = input;
  const isCover = isCoverVariation(input.templateId, input.slideType, input.variationId);

  const result = await page.evaluate((cover) => {
    const footer = document.querySelector('.slide-footer');
    const footerHidden = footer?.classList.contains('slide-footer--hidden') ?? false;
    const progress = document.querySelector('.progress-track');
    const counter = document.querySelector('.slide-counter');
    const main = document.querySelector('.slide-main');

    const hasDayTop = Boolean(document.querySelector('.day-top'));
    const hasReelTop = Boolean(document.querySelector('.reel-top'));
    const hasSlideHeader = Boolean(document.querySelector('.slide-header'));
    const hasVoltTop = Boolean(document.querySelector('.volt-top'));
    const hasSwipeBar = Boolean(document.querySelector('.swipe-bar'));
    const hasHeader = hasDayTop || hasReelTop || hasSlideHeader || hasVoltTop || hasSwipeBar;

    const progressFill = document.querySelector('.progress-fill');
    const progressWidth = progressFill instanceof HTMLElement ? progressFill.style.width : '';

    return {
      hasHeader,
      hasMain: Boolean(main),
      hasFooter: Boolean(footer),
      hasProgress: Boolean(progress),
      hasCounter: Boolean(counter),
      footerHidden,
      progressWidth,
      overflowY: document.documentElement.scrollHeight > 1352,
      overflowX: document.documentElement.scrollWidth > 1082,
    };
  }, isCover);

  if (!result.hasHeader) {
    issues.push({
      ...context,
      code: 'dom_missing_header',
      message: 'Hydrated DOM missing header block.',
    });
  }
  if (!result.hasMain) {
    issues.push({
      ...context,
      code: 'dom_missing_main',
      message: 'Hydrated DOM missing .slide-main.',
    });
  }
  if (!result.hasFooter) {
    issues.push({
      ...context,
      code: 'dom_missing_footer',
      message: 'Hydrated DOM missing .slide-footer.',
    });
  }
  if (!result.hasProgress) {
    issues.push({
      ...context,
      code: 'dom_missing_progress',
      message: 'Hydrated DOM missing .progress-track.',
    });
  }
  if (!result.hasCounter) {
    issues.push({
      ...context,
      code: 'dom_missing_counter',
      message: 'Hydrated DOM missing .slide-counter.',
    });
  }
  if (isCover && !result.footerHidden) {
    issues.push({
      ...context,
      code: 'dom_cover_footer_visible',
      message: 'Cover slide footer must be hidden.',
    });
  }
  if (!isCover && result.footerHidden) {
    issues.push({
      ...context,
      code: 'dom_internal_footer_hidden',
      message: 'Internal slide footer must be visible.',
    });
  }
  if (!isCover && result.progressWidth === '0%') {
    issues.push({
      ...context,
      code: 'dom_progress_empty',
      message: 'Internal slide progress fill must be > 0%.',
    });
  }
  if (result.overflowY || result.overflowX) {
    issues.push({
      ...context,
      code: 'dom_overflow',
      message: `Hydrated slide overflows canvas (y=${result.overflowY}, x=${result.overflowX}).`,
    });
  }

  return issues;
};

async function main() {
  if (!existsSync(SAMPLE_DIR)) {
    throw new Error(`Sample image dir not found: ${SAMPLE_DIR}`);
  }

  const service = new CarouselTemplateService();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const allIssues: ValidationIssue[] = [];
  let total = 0;

  try {
    for (const templateId of listAllTemplateIds(service).filter((id) => TEMPLATE_SHELL_RULES[id])) {
      const manifest = service.getTemplate(templateId);
      const { width, height } = resolveCanvasSize(service, templateId);
      console.log(`Validating DOM "${templateId}"…`);

      for (const [dirType, entry] of Object.entries(manifest.slides)) {
        const schemaType = (dirType === 'text-image' ? 'text_image' : dirType) as CarouselSlideType;

        for (const variationId of resolveVariationIds(entry)) {
          total += 1;
          const variation = service.getSlideVariation(templateId, schemaType, variationId);
          const imageUrls: Record<string, string> = {
            image_url: dataUriFromSampleDir(SAMPLE_DIR, IMAGE_POOL[total % IMAGE_POOL.length]),
            image_url_2: dataUriFromSampleDir(
              SAMPLE_DIR,
              IMAGE_POOL[(total + 1) % IMAGE_POOL.length],
            ),
          };

          const html = hydrateSlideHtml({
            html: variation.html,
            slide: {
              id: `${dirType}-${variationId}`,
              order: total,
              type: schemaType,
              ...buildMinimalSlideContent(),
            },
            variationId,
            templateId,
            brand: DEFAULT_BRAND,
            totalSlides: 10,
            imageUrls,
          });

          const css = assembleSlideCss({
            baseCss: variation.baseCss,
            slideCss: variation.css,
            brand: DEFAULT_BRAND,
          });

          const page = await browser.newPage();
          await page.setViewport({ width, height });
          await page.setContent(wrapSlideDocument(css, html), {
            waitUntil: 'networkidle0',
            timeout: 30_000,
          });

          const issues = await validateDomShell(page, {
            templateId,
            slideType: dirType,
            variationId,
          });
          allIssues.push(...issues);
          await page.close();
        }
      }

      const templateIssues = allIssues.filter((i) => i.templateId === templateId);
      if (templateIssues.length === 0) {
        console.log(`  ✓ ${templateId}: all variations passed\n`);
      } else {
        for (const issue of templateIssues) {
          console.log(
            `  ✗ [${issue.code}] ${issue.slideType}/${issue.variationId}: ${issue.message}`,
          );
        }
        console.log('');
      }
    }
  } finally {
    await browser.close();
  }

  if (allIssues.length > 0) {
    console.error(`${allIssues.length} DOM issue(s) across ${total} variations.`);
    process.exit(1);
  }

  console.log(`All ${total} template variations passed DOM shell validation.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
