#!/usr/bin/env node
/**
 * Cross-platform AI boundary checks (mirrors scripts/check-ai-boundaries.sh).
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const runGrepContent = (pattern, target, extraArgs = "") => {
  try {
    const cmd = `rg -n ${extraArgs} "${pattern}" ${target}`.trim();
    return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
};

const violations = [];

const check = (label, lines) => {
  if (lines.length > 0) {
    violations.push({ label, lines });
  }
};

check(
  "IA logic found outside integrations/",
  runGrepContent(
    "(from '.*ai-runtime|new OpenRouterAdapter|new GeminiAdapter|new AssemblyAI)",
    "apps/api/src",
    '--glob "*.ts"',
  ).filter((line) => !line.includes(`${path.sep}integrations${path.sep}`)),
);

check(
  "AiProviderCredential still referenced",
  runGrepContent("AiProviderCredential", "apps/ packages/", '--glob "*.ts"'),
);

check(
  "ia/ imports agents/",
  runGrepContent("from '(\\.\\./)+agents", "packages/agent-ia-sdk/src/ia/", '--glob "*.ts"'),
);

check(
  "ia/rag/ imports sibling capability (use interfaces only)",
  runGrepContent(
    "from '(\\.\\./)+text|from '(\\.\\./)+transcription|from '(\\.\\./)+image|from '(\\.\\./)+embedding",
    "packages/agent-ia-sdk/src/ia/rag/",
    '--glob "*.ts"',
  ).filter(
    (line) =>
      !line.includes("embedding-provider") && !line.includes("text-provider"),
  ),
);

check(
  "agents/ instantiates concrete adapters",
  runGrepContent(
    "new OpenRouterTextAdapter|new GeminiTextAdapter|new AssemblyAiSttAdapter|new OpenRouterEmbeddingAdapter",
    "packages/agent-ia-sdk/src/agents/",
    '--glob "*.ts"',
  ),
);

check(
  "env API key read outside load-provider-secrets.ts",
  runGrepContent(
    "process\\.env\\.(OPENROUTER|GEMINI|ASSEMBLYAI)_API_KEY",
    "apps/api/src",
    '--glob "*.ts"',
  ).filter((line) => !line.includes("load-provider-secrets.ts")),
);

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`VIOLATION: ${v.label}`);
    for (const line of v.lines) {
      console.error(`  ${line}`);
    }
  }
  console.error(`FAILED: ${violations.length} AI boundary violation(s)`);
  process.exit(1);
}

console.log("OK: AI boundaries clean");
