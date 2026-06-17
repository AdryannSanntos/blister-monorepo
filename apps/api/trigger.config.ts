import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_kqouuhakfzriyzongafh",
  maxDuration: 600,
  dirs: ["./trigger"],
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
    ],
    extensions: [
      ffmpeg({ version: "7" }),
      prismaExtension({
        mode: "engine-only",
        version: "6.19.3",
      }),
    ],
  },
});
