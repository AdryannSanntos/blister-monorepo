import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_kqouuhakfzriyzongafh",
  maxDuration: 300,
  dirs: ["./trigger"],
});
