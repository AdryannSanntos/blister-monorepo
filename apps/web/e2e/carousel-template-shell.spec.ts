import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const repoRoot = resolve(__dirname, "../../..");
const publicTemplatesRoot = join(repoRoot, "apps/web/public/templates");

const TEMPLATE_VARIATION_COUNTS: Record<
  string,
  { count: number; height: number }
> = {
  "content-machine": { count: 14, height: 1350 },
  daylight: { count: 10, height: 1350 },
  "editorial-performance": { count: 11, height: 1350 },
  "minimal-clean": { count: 9, height: 1080 },
  reel: { count: 11, height: 1350 },
  spotlight: { count: 10, height: 1350 },
  voltage: { count: 10, height: 1350 },
};

const readPngDimensions = (filePath: string) => {
  const buffer = readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

test.describe("Carousel template shell — static HTML", () => {
  test("all manifest variations follow shell contract", () => {
    const output = execSync(
      "npx tsx apps/api/scripts/validate-template-shell.ts",
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    expect(output).toContain("All template shells passed validation.");
  });
});

test.describe("Carousel template shell — hydrated DOM (all variations)", () => {
  test("every manifest variation passes DOM shell validation", () => {
    const output = execSync(
      "npx tsx apps/api/scripts/validate-all-template-variations.ts",
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    expect(output).toMatch(
      /All \d+ template variations passed DOM shell validation\./,
    );
  });
});

test.describe("Carousel template previews — all PNGs", () => {
  for (const [templateId, meta] of Object.entries(TEMPLATE_VARIATION_COUNTS)) {
    test(`${templateId} has ${meta.count} preview PNGs at 1080x${meta.height}`, () => {
      const dir = join(publicTemplatesRoot, templateId);
      expect(existsSync(dir), `missing preview dir: ${dir}`).toBe(true);

      const pngs = readdirSync(dir).filter((file) => file.endsWith(".png"));
      expect(pngs).toContain("cover.png");
      expect(pngs.length).toBeGreaterThanOrEqual(meta.count);

      for (const png of pngs) {
        const dimensions = readPngDimensions(join(dir, png));
        expect(dimensions.width, `${png} width`).toBe(1080);
        expect(dimensions.height, `${png} height`).toBe(meta.height);
      }
    });
  }
});

test.describe("Carousel template shell — Playwright DOM per preview sample", () => {
  const samples: Record<string, string[]> = {
    daylight: [
      "start-v1",
      "text-statement",
      "text-list",
      "text-quote",
      "text-stat",
      "text-cta",
      "text-image-single-bottom",
      "text-image-grid-bottom",
      "text-image-single-top",
      "image-full",
    ],
    reel: [
      "start-v1",
      "anchor-bottom",
      "anchor-mid",
      "feature-bottom",
      "quote-image",
      "panel-quote",
      "panel-list",
      "stat",
      "cta",
      "dark-close",
      "cinematic",
    ],
    spotlight: [
      "start-v1",
      "card-top",
      "card-bottom",
      "card-list",
      "pull-quote",
      "stat",
      "question",
      "statement",
      "cta",
      "image-full",
    ],
    voltage: [
      "start-v1",
      "duo-top",
      "single",
      "single-bottom",
      "statement",
      "stat",
      "quote",
      "list",
      "cta",
      "image-full",
    ],
  };

  for (const [templateId, keys] of Object.entries(samples)) {
    for (const key of keys) {
      test(`${templateId}/${key} PNG loads in browser at full canvas size`, async ({
        page,
      }) => {
        const pngPath = join(publicTemplatesRoot, templateId, `${key}.png`);
        test.skip(!existsSync(pngPath), "Run carousel:previews first");

        const dataUri = `data:image/png;base64,${readFileSync(pngPath).toString("base64")}`;
        await page.setContent(
          `<!DOCTYPE html><html><body style="margin:0;background:#111"><img id="slide" src="${dataUri}" alt="" /></body></html>`,
          { waitUntil: "load" },
        );

        await page.waitForFunction(() => {
          const img = document.querySelector("#slide");
          return img instanceof HTMLImageElement && img.naturalWidth > 0;
        });

        const dimensions = await page.evaluate(() => {
          const img = document.querySelector("#slide");
          return {
            width: img instanceof HTMLImageElement ? img.naturalWidth : 0,
            height: img instanceof HTMLImageElement ? img.naturalHeight : 0,
          };
        });

        expect(dimensions.width).toBe(1080);
        expect(dimensions.height).toBe(1350);
      });
    }
  }
});
