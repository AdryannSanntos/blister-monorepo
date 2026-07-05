import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const TEMPLATE_PREVIEW_COUNTS: Record<string, number> = {
  daylight: 10,
  reel: 11,
  spotlight: 10,
  voltage: 10,
};

const publicTemplatesRoot = join(process.cwd(), "public/templates");

const readPngDimensions = (filePath: string) => {
  const buffer = readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

test.describe("Carousel template preview PNGs", () => {
  for (const [templateId, minSlides] of Object.entries(TEMPLATE_PREVIEW_COUNTS)) {
    test(`${templateId} has cover and ${minSlides} slide previews`, () => {
      const dir = join(publicTemplatesRoot, templateId);
      expect(existsSync(dir), `missing preview dir: ${dir}`).toBe(true);

      const pngs = readdirSync(dir).filter((file) => file.endsWith(".png"));
      expect(pngs).toContain("cover.png");
      expect(pngs.length).toBeGreaterThanOrEqual(minSlides);
    });
  }
});

test.describe("Carousel template preview dimensions", () => {
  test("daylight start preview is 1080x1350", () => {
    const pngPath = join(publicTemplatesRoot, "daylight/start-v1.png");
    expect(existsSync(pngPath), "Run carousel:previews first").toBe(true);

    const dimensions = readPngDimensions(pngPath);
    expect(dimensions.width).toBe(1080);
    expect(dimensions.height).toBe(1350);
  });

  for (const templateId of Object.keys(TEMPLATE_PREVIEW_COUNTS)) {
    test(`${templateId} cover preview is valid PNG`, () => {
      const coverPath = join(publicTemplatesRoot, templateId, "cover.png");
      expect(existsSync(coverPath), "Run carousel:previews first").toBe(true);

      const buffer = readFileSync(coverPath);
      expect(buffer.length).toBeGreaterThan(10_000);
      expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    });
  }
});

test.describe("Carousel template preview visuals", () => {
  for (const templateId of Object.keys(TEMPLATE_PREVIEW_COUNTS)) {
    test(`${templateId} cover loads in browser`, async ({ page }) => {
      const coverPath = join(publicTemplatesRoot, templateId, "cover.png");
      test.skip(!existsSync(coverPath), "Run carousel:previews first");

      const dataUri = `data:image/png;base64,${readFileSync(coverPath).toString("base64")}`;
      await page.setContent(
        `<!DOCTYPE html><html><body style="margin:0"><img id="cover" src="${dataUri}" alt="" /></body></html>`,
        { waitUntil: "load" },
      );

      await page.waitForFunction(() => {
        const img = document.querySelector("#cover");
        return img instanceof HTMLImageElement && img.naturalWidth > 0;
      });

      const dimensions = await page.evaluate(() => {
        const img = document.querySelector("#cover");
        return {
          width: img instanceof HTMLImageElement ? img.naturalWidth : 0,
          height: img instanceof HTMLImageElement ? img.naturalHeight : 0,
        };
      });

      expect(dimensions.width).toBe(1080);
      expect(dimensions.height).toBe(1350);
    });
  }
});
