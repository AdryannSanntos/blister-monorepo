import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_kqouuhakfzriyzongafh",
  maxDuration: 300,
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
    ],
  },
});
