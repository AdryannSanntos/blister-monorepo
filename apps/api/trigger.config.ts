import { defineConfig } from "@trigger.dev/sdk";
import {
  additionalFiles,
  ffmpeg,
} from "@trigger.dev/build/extensions/core";
import { puppeteer as puppeteerExtension } from "@trigger.dev/build/extensions/puppeteer";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_kqouuhakfzriyzongafh",
  maxDuration: 600,
  dirs: ["./trigger"],
  // Match production: cwd is the Trigger build dir where additionalFiles land.
  legacyDevProcessCwdBehaviour: false,
  build: {
    external: [
      "@nestjs/common",
      "@nestjs/core",
      "@nestjs/microservices",
      "@nestjs/websockets",
      "@nestjs/platform-express",
      "class-validator",
      "class-transformer",
      "cache-manager",
      // pdf-parse pulls in pdfjs-dist (needs DOM globals) and the native
      // @napi-rs/canvas binary. Bundling it breaks the canvas polyfill, so
      // pdfjs throws "DOMMatrix is not defined" at import. Keep pdf-parse
      // external so it loads from node_modules at runtime and resolves its
      // own nested pdfjs-dist + @napi-rs/canvas (with the polyfill intact).
      "pdf-parse",
      // Bundled ffmpeg-static paths break in Trigger workers; use the ffmpeg extension.
      "ffmpeg-static",
      // Remotion ships native (Chromium) binaries and bundles compositions at
      // runtime from source — keep its packages external so they load from
      // node_modules with their native parts intact.
      "@remotion/renderer",
      "@remotion/bundler",
      "remotion",
      "react",
      "react-dom",
      "puppeteer",
    ],
    extensions: [
      ffmpeg({ version: "7" }),
      puppeteerExtension(),
      prismaExtension({
        mode: "engine-only",
        version: "6.19.3",
      }),
      // Ship the Remotion composition sources so render-text-overlay can bundle
      // them at runtime in the worker (they are not part of the esbuild graph).
      additionalFiles({ files: ["./src/video/**"] }),
      // Carousel HTML/CSS templates are read from disk at runtime (not bundled).
      additionalFiles({ files: ["./src/agents/carousel/templates/**"] }),
    ],
  },
});
