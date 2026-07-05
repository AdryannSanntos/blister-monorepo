/**
 * Local gallery server for Playwright MCP assisted visual inspection.
 *
 * Run: npx tsx apps/api/scripts/serve-template-gallery.ts
 * Open: http://localhost:4173/gallery?template=reel&slideType=text&variationId=panel-quote
 */
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { URL } from 'node:url';
import { CarouselTemplateService } from '../src/agents/carousel/services/carousel-template.service';
import { hydrateAllManifestVariations, listAllTemplateIds } from './lib/hydrate-slides';

const PORT = Number(process.env.GALLERY_PORT ?? 4173);
const SAMPLE_DIR = process.env.PREVIEW_SAMPLE_DIR ?? `${__dirname}/_sample-img`;

const service = new CarouselTemplateService();
const slides = hydrateAllManifestVariations(service, SAMPLE_DIR);

const slideIndex = new Map(
  slides.map((s) => [`${s.templateId}|${s.slideType}|${s.variationId}`, s]),
);

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const renderGalleryIndex = (): string => {
  const templateIds = listAllTemplateIds(service);
  const links = templateIds
    .map((templateId) => {
      const items = slides
        .filter((s) => s.templateId === templateId)
        .map(
          (s) =>
            `<li><a href="/gallery?template=${encodeURIComponent(s.templateId)}&slideType=${encodeURIComponent(s.slideType)}&variationId=${encodeURIComponent(s.variationId)}">${escapeHtml(s.slideType)}/${escapeHtml(s.variationId)}</a></li>`,
        )
        .join('');
      return `<section><h2>${escapeHtml(templateId)}</h2><ul>${items}</ul></section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Carousel Template Gallery</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #111; color: #eee; }
    a { color: #a78bfa; }
    section { margin-bottom: 2rem; }
    ul { columns: 2; gap: 2rem; }
  </style>
</head>
<body>
  <h1>Carousel Template Gallery (${slides.length} slides)</h1>
  ${links}
</body>
</html>`;
};

const renderSlidePage = (key: string): string | null => {
  const slide = slideIndex.get(key);
  if (!slide) return null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(slide.templateId)} — ${escapeHtml(slide.slideType)}/${escapeHtml(slide.variationId)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      padding: 24px;
      background: #1a1a1a;
      font-family: system-ui, sans-serif;
      color: #eee;
    }
    header { text-align: center; }
    .frame {
      width: ${slide.width}px;
      height: ${slide.height}px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,.5);
      flex-shrink: 0;
    }
    .frame-inner { width: ${slide.width}px; height: ${slide.height}px; }
    nav a { color: #a78bfa; margin: 0 8px; }
    ${slide.css}
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(slide.templateId)} / ${escapeHtml(slide.slideType)} / ${escapeHtml(slide.variationId)}</h1>
    <nav><a href="/gallery">← Gallery</a></nav>
  </header>
  <div class="frame" data-testid="slide-frame">
    <div class="frame-inner">${slide.html}</div>
  </div>
</body>
</html>`;
};

const handleRequest = (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/' || url.pathname === '/gallery') {
    const template = url.searchParams.get('template');
    const slideType = url.searchParams.get('slideType');
    const variationId = url.searchParams.get('variationId');

    if (template && slideType && variationId) {
      const html = renderSlidePage(`${template}|${slideType}|${variationId}`);
      if (!html) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Slide not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderGalleryIndex());
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
};

createServer(handleRequest).listen(PORT, () => {
  console.log(`Carousel gallery: http://localhost:${PORT}/gallery`);
  console.log(
    `${slides.length} slides indexed across ${listAllTemplateIds(service).length} templates`,
  );
});
