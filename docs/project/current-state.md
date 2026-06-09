# Estado Atual do Código — Blister

> Snapshot em 2026-06-09. Reflete decisões em [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md).

---

## Implementado

| Camada | Status |
|--------|--------|
| **Auth** | better-auth: login, signup, verify, reset, Google OAuth |
| **RBAC** | CASL — `owner/admin/member`, permissões Blister IA |
| **Company + Brand** | Multi-empresa, onboarding, Cérebro da Marca, assets visuais |
| **Storage** | S3 presigned + upload via API |
| **Credits** | Saldo, histórico, debit/credit/adjust |
| **AI Catalog** | Providers, models, policies, pipeline **catálogo**, platform settings |
| **Platform admin** | UI em `/workspaces/admin` |
| **Frontend** | Auth, dashboard, onboarding, brand, workspaces, credit badge |
| **Schema Prisma** | Domínio IA completo (RAG, AgentRun, Campaign, ContentPiece legado…) |

## Em implementação (Sprints 3–4)

- Módulo `rag/` + Trigger.dev indexação
- Módulo `ai-runtime/`
- Módulo `agents/runtime/` — execução **isolada** por `agentId`
- **Sem** `PipelineOrchestrator`

## Não implementado

- Campanhas CRUD + workspace UI
- Agentes MVP reais (strategist, copywriter, designer)
- Revisão por run (approve/reject/edit)
- Feedback → `AGENT_LEARNING`
- UI por agente (substituir links legados `/dashboard/pecas`, `/dashboard/criar`)

## Arquitetura de produto (vigente)

- Agentes **isolados** — `POST /api/agents/:agentId/run`
- Campanha = workspace — não dispara pipeline
- Output em `AgentRun.outputPayload` — **não** hub `ContentPiece`
- Revisão **dentro de cada agente**

## Desalinhamentos a corrigir na implementação

| Item | Legado | Alvo |
|------|--------|------|
| Sidebar `/dashboard/pecas`, `/dashboard/criar` | Rotas sem página | UI por agente / campanha |
| `piece.*` permissões | authz | Revisão por run / agente |
| `ContentPiece` no schema | Modelo PRD antigo | Legado; novos fluxos usam AgentRun |
| `docs/ROADMAP.md` Sprint 4 | Pipeline orchestrator | Ver nota 2026-06-09 no roadmap |
| ROADMAP estado "7 módulos" | Desatualizado | Ver tabela acima |

## Próximo passo

Sprints 3–4: RAG + workflow engine. Ver [`docs/ROADMAP.md`](../ROADMAP.md) e plano `.cursor/plans/`.
