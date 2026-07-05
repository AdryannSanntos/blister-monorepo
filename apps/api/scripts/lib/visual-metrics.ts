/**
 * Browser-evaluated layout metrics for hydrated carousel slides.
 * Used by validate-visual-all.ts and serve-template-gallery.ts.
 */

export const MIN_ELEMENT_GAP_PX = 12;
export const MIN_FOOTER_GAP_PX = 12;
export const MIN_CONTRAST_RATIO = 3;

export type SlideLayoutMetrics = {
  overflowY: boolean;
  overflowX: boolean;
  footerGap: number;
  hasVisibleFooter: boolean;
  siblingGaps: Array<{ from: string; to: string; gap: number }>;
  minSiblingGap: number;
  accentPaddingRatio: number;
  contrastRatio: number;
};

export type LayoutIssue = {
  code: string;
  message: string;
};

/** Injected into page.evaluate — must be self-contained. */
export const collectSlideLayoutMetrics = (): SlideLayoutMetrics => {
  const slide = document.querySelector('.slide');
  const footer = document.querySelector('.slide-footer:not(.slide-footer--hidden)');
  const progress = document.querySelector('.progress-track');
  const slideRect = slide?.getBoundingClientRect();
  const canvasH = slideRect?.height ?? 1350;
  const canvasW = slideRect?.width ?? 1080;
  const overflowY = document.documentElement.scrollHeight > canvasH + 2;
  const overflowX = document.documentElement.scrollWidth > canvasW + 2;

  let footerGap = 9999;
  if (footer && progress) {
    const main = document.querySelector('.slide-main');
    let contentBottom = 0;
    if (main) {
      for (const child of Array.from(main.children)) {
        const el = child as HTMLElement;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.height < 1) continue;
        if (rect.bottom > contentBottom) contentBottom = rect.bottom;
      }
    }
    footerGap = progress.getBoundingClientRect().top - contentBottom;
  }

  const siblingGaps: Array<{ from: string; to: string; gap: number }> = [];
  const gapContainers = document.querySelectorAll(
    '.slide-main, .slide-main > *, [class*="list"], [class*="grid"]',
  );

  for (const container of Array.from(gapContainers)) {
    const children = Array.from(container.children).filter((child) => {
      const el = child as HTMLElement;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.height >= 1 && rect.width >= 1;
    }) as HTMLElement[];

    for (let i = 0; i < children.length - 1; i++) {
      const a = children[i].getBoundingClientRect();
      const b = children[i + 1].getBoundingClientRect();
      const gap = b.top - a.bottom;
      if (gap < 0) continue;
      siblingGaps.push({
        from: children[i].className || children[i].tagName,
        to: children[i + 1].className || children[i + 1].tagName,
        gap: Math.round(gap * 10) / 10,
      });
    }
  }

  const minSiblingGap = siblingGaps.length > 0 ? Math.min(...siblingGaps.map((g) => g.gap)) : 9999;

  const accent = document.querySelector('.accent');
  const accentStyle = accent ? window.getComputedStyle(accent) : null;
  const accentPaddingX = accentStyle
    ? Number.parseFloat(accentStyle.paddingLeft) + Number.parseFloat(accentStyle.paddingRight)
    : 0;
  const accentFontSize = accentStyle ? Number.parseFloat(accentStyle.fontSize) : 0;

  let contrastRatio = 99;
  const title = document.querySelector(
    '.day-title, .reel-title, .impact-title, .card-title, .volt-title, .display-title, .slide-title, h1, h2',
  );
  if (title) {
    const fgMatch = window.getComputedStyle(title).color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const bgEl =
      title.closest('.card, .reel-panel, .accent-card, .day-card') ??
      document.querySelector('.slide');
    const bgMatch = bgEl
      ? window.getComputedStyle(bgEl).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      : null;
    if (fgMatch && bgMatch) {
      const channels = [
        [Number(fgMatch[1]), Number(bgMatch[1])],
        [Number(fgMatch[2]), Number(bgMatch[2])],
        [Number(fgMatch[3]), Number(bgMatch[3])],
      ];
      const weights = [0.2126, 0.7152, 0.0722];
      let l1 = 0;
      let l2 = 0;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          const s = channels[i][j] / 255;
          const linear = s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          if (j === 0) l1 += linear * weights[i];
          else l2 += linear * weights[i];
        }
      }
      contrastRatio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
  }

  return {
    overflowY,
    overflowX,
    footerGap,
    hasVisibleFooter: Boolean(footer),
    siblingGaps,
    minSiblingGap,
    accentPaddingRatio: accentFontSize > 0 ? accentPaddingX / accentFontSize : 0,
    contrastRatio,
  };
};

export const layoutMetricsToIssues = (
  metrics: SlideLayoutMetrics,
  ctx: { templateId: string; slideKey: string },
): LayoutIssue[] => {
  const issues: LayoutIssue[] = [];
  const prefix = `${ctx.templateId}/${ctx.slideKey}`;

  if (metrics.overflowY || metrics.overflowX) {
    issues.push({
      code: 'overflow',
      message: `${prefix}: slide overflows canvas (y=${metrics.overflowY}, x=${metrics.overflowX})`,
    });
  }

  if (metrics.hasVisibleFooter && metrics.footerGap < MIN_FOOTER_GAP_PX) {
    issues.push({
      code: 'footer_gap',
      message: `${prefix}: content too close to progress (${Math.round(metrics.footerGap)}px < ${MIN_FOOTER_GAP_PX}px)`,
    });
  }

  const tightGaps = metrics.siblingGaps.filter((g) => g.gap < MIN_ELEMENT_GAP_PX);
  if (tightGaps.length > 0) {
    const worst = tightGaps.reduce((a, b) => (a.gap < b.gap ? a : b));
    issues.push({
      code: 'sibling_gap',
      message: `${prefix}: elements too close (${worst.from} → ${worst.to}: ${worst.gap}px < ${MIN_ELEMENT_GAP_PX}px)`,
    });
  }

  if (metrics.accentPaddingRatio > 0.5) {
    issues.push({
      code: 'accent_padding',
      message: `${prefix}: highlight box padding too large (ratio ${metrics.accentPaddingRatio.toFixed(2)})`,
    });
  }

  if (metrics.contrastRatio < MIN_CONTRAST_RATIO) {
    issues.push({
      code: 'contrast',
      message: `${prefix}: title contrast too low (${metrics.contrastRatio.toFixed(2)}:1)`,
    });
  }

  return issues;
};
