/** Resets document chrome so slide canvas metrics are accurate in Puppeteer. */
export const SLIDE_PAGE_RESET_CSS =
  'html,body{margin:0;padding:0;overflow:hidden;background:transparent;}';

export const wrapSlideDocument = (css: string, html: string): string =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${SLIDE_PAGE_RESET_CSS}${css}</style></head><body>${html}</body></html>`;
