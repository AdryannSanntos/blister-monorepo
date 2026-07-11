# Agente: Gerador de Cortes

**ID:** `cuts`  
**Tier:** Default (signup)  
**Código:** `apps/api/src/agents/cuts/` (lógica de negócio)  
**IA:** `@company-os/agent-ia-sdk` (`ia.transcription`, `ia.text`)  
**UI label:** Gerador de Cortes  
**Rota:** `/dashboard/agents/cuts`

## Responsabilidade

Transformar vídeos longos (live, podcast, aula) em cortes curtos priorizados por potencial de retenção.

## Workflow (v3.0.0)

1. `resolve_source` — resolve arquivo + transcrição AssemblyAI (vídeo) ou `extractedText` (áudio)
2. `rank_segments` — LLM ranqueia cortes (modelo via `AgentModelPolicy` / override por step no admin)
3. `dispatch_renders` — dispara jobs Trigger.dev (`cuts-render-clip`)
4. `await_renders` — pause até todos os cortes renderizados
5. `await_cut_review` — pause para aprovar/rejeitar (skip se `autoAcceptResults`)
6. `finalize_cuts` — valida output
7. `cleanup_source` — remove fonte se `deleteSourceAfterRun`

## Execução

Todo o pipeline roda **100% em background via Trigger.dev**:

| Etapa | Task |
|-------|------|
| Workflow principal | `agent-run-execute` |
| Render por corte | `cuts-render-clip` |
| Callback de render | `POST /api/internal/agent-runs/cuts/cut-rendered/:runId` |

**Env:** `AGENT_EXECUTION_MODE=trigger` (único modo suportado)

**Dev local:** na raiz do monorepo, `pnpm dev` sobe web + API + Trigger.dev worker. Só API: `pnpm dev:api`.

```bash
pnpm dev
```

Variáveis:

- `APP_URL` — worker → API (SSE/eventos)
- `API_BASE_URL` — callbacks de render
- `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_ID`
- `ASSEMBLYAI_API_KEY` + `OPENROUTER_API_KEY` ou `GEMINI_API_KEY`

## Input (run options)

Além de `settings` (workspace), cada run aceita `options` opcionais:

- `videoGenre` — orienta tom/hooks no LLM
- `processingTimeframe` — `{ startSec, endSec }` limita segmentos considerados
- `settings.modelTier` — apenas `basic` ativo (`auto`/`pro` normalizados para `basic`)

## Output

Ver `apps/api/src/agents/cuts/schemas/output.schema.ts` e `CutOutput` em `@company-os/types`.

## Learning

`apps/api/src/agents/cuts/learning/feedback-handler.ts` — feedback indexado em RAG.

## Frontend

- **Gerar:** modal de fonte → modal de status → overview
- **Acompanhar:** `/dashboard/agents/cuts/runs/:runId`
