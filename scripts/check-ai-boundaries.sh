#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

violations=0

fail() {
  echo "VIOLATION: $1"
  violations=$((violations + 1))
}

# Zero direct IA imports outside the integration module
if grep -rE "(from '.*ai-runtime|new OpenRouterAdapter|new GeminiAdapter|new AssemblyAI)" \
  apps/api/src --include="*.ts" \
  --exclude-dir=integrations 2>/dev/null; then
  fail "IA logic found outside integrations/"
fi

# Zero AiProviderCredential references
if grep -rE "AiProviderCredential" apps/ packages/ --include="*.ts" 2>/dev/null; then
  fail "AiProviderCredential still referenced"
fi

# ia/ must not import agents/
if grep -rE "from '(\.\./)+agents" \
  packages/agent-ia-sdk/src/ia/ --include="*.ts" 2>/dev/null; then
  fail "ia/ imports agents/"
fi

# ia/rag/ must not import sibling capabilities (except via provider interfaces)
if grep -rE "from '(\.\./)+text|from '(\.\./)+transcription|from '(\.\./)+image|from '(\.\./)+embedding" \
  packages/agent-ia-sdk/src/ia/rag/ --include="*.ts" 2>/dev/null \
  | grep -v "embedding-provider\|text-provider"; then
  fail "ia/rag/ imports sibling capability (use interfaces only)"
fi

# agents/ must not instantiate concrete adapters
if grep -rE "new OpenRouterTextAdapter|new GeminiTextAdapter|new AssemblyAiSttAdapter|new OpenRouterEmbeddingAdapter" \
  packages/agent-ia-sdk/src/agents/ --include="*.ts" 2>/dev/null; then
  fail "agents/ instantiates concrete adapters"
fi

# IA API keys only in load-provider-secrets.ts
if grep -rE "process\.env\.(OPENROUTER|GEMINI|ASSEMBLYAI)_API_KEY" \
  apps/api/src --include="*.ts" \
  --exclude="load-provider-secrets.ts" 2>/dev/null; then
  fail "env API key read outside load-provider-secrets.ts"
fi

if [ "$violations" -gt 0 ]; then
  echo "FAILED: $violations AI boundary violation(s)"
  exit 1
fi

echo "OK: AI boundaries clean"
