import { Injectable } from '@nestjs/common';
import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';

export type CarouselRenderInput = {
  html: string;
  css: string;
  baseCss?: string;
  width: number;
  height: number;
};

const RENDER_TIMEOUT_MS = 30_000;

@Injectable()
export class CarouselRenderService {
  private browserPromise: Promise<Browser> | null = null;

  private launchBrowser(): Promise<Browser> {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    return puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }

  private getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = this.launchBrowser();
    }
    return this.browserPromise;
  }

  async renderSlideToPng(input: CarouselRenderInput): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: input.width, height: input.height });
      const documentHtml = `<!DOCTYPE html><html><head><style>
${input.baseCss ?? ''}
${input.css}
</style></head><body>${input.html}</body></html>`;

      await page.setContent(documentHtml, {
        waitUntil: 'load',
        timeout: RENDER_TIMEOUT_MS,
      });

      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: input.width, height: input.height },
      });

      return Buffer.from(screenshot);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }
}
