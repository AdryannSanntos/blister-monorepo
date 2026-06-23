# ADR — Consolidação `@company-os/agent-ia-sdk`

**Data:** 2026-06-22  
**Status:** Aceito  
**Plano:** [`docs/plans/blister-os/agent-ia-sdk.md`](../plans/blister-os/agent-ia-sdk.md)

## Contexto

A lógica de IA (texto, transcrição, embedding, RAG) e o framework de agentes (`cuts`) estavam espalhados entre `apps/api/src/ai-runtime/`, `apps/api/src/rag/` e `packages/agent-sdk`. Isso dificultava testes, boundaries e evolução do catálogo de modelos.

## Decisão

1. **Um package:** `@company-os/agent-ia-sdk` com dois módulos internos:
   - `ia/` — capacidades por interface (`text`, `transcription`, `image`, `embedding`, `rag`)
   - `agents/` — kernel de workflow (migrado de `agent-sdk`)
2. **`apps/api` = shell HTTP** — controllers, guards, DTOs e adapters em `integrations/agent-ia-sdk/`.
3. **Credenciais só em env** — `load-provider-secrets.ts`; `AiProviderCredential` removida do schema.
4. **Settings RAG de plataforma** — `RagPlatformSettings` + `GET/PATCH /platform/settings/rag`; admin UI na aba **IA do sistema**.
5. **`@company-os/agent-sdk` deprecated** — re-export fino para `@company-os/agent-ia-sdk/agents`; removido de `apps/api` deps.

## Consequências

| Área | Antes | Depois |
|------|-------|--------|
| RAG runtime | `apps/api/src/rag/` | `agent-ia-sdk/ia/rag/` |
| LLM/STT | `apps/api/src/ai-runtime/` | `agent-ia-sdk/ia/{text,transcription,...}` |
| Agent kernel | `packages/agent-sdk` | `agent-ia-sdk/agents/` |
| Admin credenciais DB | `AiProviderCredential` | Env keys only |
| Enforcement | — | `scripts/check-ai-boundaries.sh` |

## Trade-offs

- **Prós:** boundaries claros, um lugar para IA+agentes, seed/catálogo alinhados com capabilities.
- **Contras:** migração grande; docs legados ainda citam `agent-sdk` até atualização gradual.
- **Risco mitigado:** grep CI em `check-ai-boundaries.sh`; modelo sem env key → `ProviderNotConfiguredError`.

## Desvios do plano original

- IDs de modelo: **cuid**, não uuid — schemas usam `z.string().min(1)`.
- Campo RAG: **`rerankEnabled`** (coluna Prisma), não `rerank`.
- Guard PATCH RAG: **`@RequirePlatformRole('platform_admin')`**, não `@RequirePermission`.
- Ícone aba admin: **Sparkles** (AI Catalog já usa Cpu).
- Hook RAG UI: reutiliza cache `["platform","settings"]` em vez de query separada `rag-settings`.
