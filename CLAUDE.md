# Blister — Monorepo

## O que é este projeto

Blister é uma ferramenta de **marketing com IA** para MEIs, pequenos negócios e autônomos no Brasil. O usuário descreve o que precisa (*"post sobre lançamento do bolo de cenoura"*) e recebe pacote completo: imagem, legenda e hashtags — com a identidade da marca aplicada.

O moat não é o LLM — é **Memória da Marca** + **RAG** + **auto-melhoramento por agente**.

**Profiles:** `BUSINESS` (owner), `ADMIN` (platform). No org/tenants — 1 company per user in MVP.

**Fase atual:** fundação + empresa/marca/créditos/admin parcial ✅. Próximo: RAG + workflow engine (agentes isolados). Ver [`docs/project/current-state.md`](docs/project/current-state.md).

---

## Estrutura do monorepo

```
apps/
  web/    Next.js 16 + React 19
  api/    NestJS 11 + Prisma + pgvector
packages/
  authz/  Permissões CASL
  types/  Zod compartilhado
  configs/ TypeScript presets
```

---

## Regras invioláveis

### 1. Toda ação tem permissão

Backend: `@RequirePermission(key)`. Frontend: `<PermissionGate>` ou `useAbility()`.

### 2. userId nunca vem do body

`req.currentUser.id` sempre. IDs de recurso de `req.params`.

### 3. Novos endpoints com guard ou @Public explícito

AuthGuard é global.

### 4. Nova permissão → packages/authz primeiro

Declarar chave, map, roles, seed → controller → frontend.

### 5. Prisma é o único cliente de banco

Nunca editar `apps/api/src/generated/prisma` manualmente.

### 6. better-auth só trata auth/sessão

Perfil, marca, campanhas, créditos = domínio da aplicação.

### 7. Roles de sistema imutáveis

`owner`, `admin`, `member` — não renomear nem deletar.

### 8. Dados em tabela por padrão

`<DataTable>` com sort, filtros, seleção, export, floating footer.

### 9. Simplicidade radical

Máx. 2–3 campos para iniciar tarefa. Campanha = nome + objetivo. Geração rápida = 1 frase.

### 10. Animações sempre presentes

`tw-animate-css` em overlays e interativos.

### 11. Espaçamento padronizado

`gap-6` entre seções, `gap-4` dentro de agrupamentos.

### 12. Rotas

`/dashboard/*` autenticado · `/auth/*` público · proxy via `apps/web/src/proxy.ts`

### 13. Agentes plugáveis e isolados

1 pasta = 1 agente. Registry, não switch. Workflow multi-step **dentro de cada agente**. **Sem pipeline automático** entre agentes. Usuário dispara `POST /api/agents/:agentId/run`. Output em `AgentRun.outputPayload`. `learning/feedback-handler.ts` **obrigatório** em todo agente. Ver [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](docs/decisions/2026-06-09-agents-isolated-architecture.md).

### 14. RAG + learning

Retrieval filtered by `companyId`. User feedback indexed in RAG. No cross-tenant.

### 15. Créditos

Agentes só rodam com saldo. Free tier US$ 20 único (config admin). Débito por step LLM.

### 16. Linguagem UI

Zero jargão de IA. Usar verbos operacionais por superfície: **Campanha**, **Cérebro da Marca**, **Criar texto**, **Gerar imagem**, **Planejar conteúdo**, **Aprovar**. Evitar: "peça", "agente", "prompt", "LLM". Post completo = **um agente entre vários**, não entidade central do produto.

### 17. Campanha e revisão

**Campanha** = workspace (contexto + arquivos + runs de agentes) — não dispara agentes em cadeia. **Revisão** (aprovar/negar/editar) na superfície de **cada agente**, via endpoints da `AgentRun` — não módulo global `/pecas`.

### 18. Regras de codificação

**Validação e contratos**
- **Zod sempre** — DTOs backend, formulários frontend, schemas compartilhados em `packages/types`, outputs de IA quando aplicável.
- **Validação em toda fronteira** — body, params, query, respostas externas e payloads de agente antes de persistir ou renderizar.

**Frontend**
- **TanStack Query sempre** para estado de servidor — `useQuery`/`useMutation` via hooks de domínio; nunca fetch direto em page/component.
- **react-hook-form (RHF) sempre** em formulários — com `zodResolver` e `mode: 'onBlur'`.
- **nuqs sempre** para filtros, tabs, paginação e qualquer estado sincronizado com URL.
- **Server Components por padrão** — `"use client"` só quando houver interatividade, hooks ou browser APIs; preferir Server Actions para mutações simples quando couber.
- **Componentes no módulo** — nunca criar componente solto; todo componente de feature vive em `core/modules/<modulo>/components/`. Shared só em `core/shared/`.
- **Zustand** para estado global de UI quando necessário (wizard, seleção persistente, preferências locais) — não substituir React Query para dados de servidor.

**Backend**
- Zod nos DTOs antes do service; validar invariantes de negócio no service.

**Qualidade e UX**
- **Playwright** para validar fluxos críticos, design e UX — experiência do usuário é essencial; novas telas/fluxos devem ter cobertura e2e quando aplicável.

---

## Produto e linguagem

- Nome: **Blister**
- Foco: marketing operacional para pequenos negócios
- Termos: Campanha, Cérebro da Marca, Créditos, labels por agente (criar texto, gerar imagem, planejar…)
- Não expor "agente", "prompt", "LLM", "peça" ao usuário final

---

## Stack resumida

Frontend: Next.js 16, React 19, Tailwind v4, shadcn/ui, TanStack Query/Table, RHF+Zod, nuqs, zustand, Playwright, axios, next-themes

Backend: NestJS 11, Prisma, PostgreSQL+pgvector, better-auth, CASL, Zod, Resend, S3, Satori

---

## Documentação

| Prioridade | Documento |
|------------|-----------|
| 1 | [`docs/prd/blister-master-prd.md`](docs/prd/blister-master-prd.md) |
| 2 | Este `CLAUDE.md` |
| 3 | [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](docs/decisions/2026-06-09-agents-isolated-architecture.md) |
| 4 | [`docs/decisions/2026-06-08-product-pivot-ai-marketing.md`](docs/decisions/2026-06-08-product-pivot-ai-marketing.md) |
| 5 | [`docs/project/`](docs/project/) |
| 6 | [`docs/agents/`](docs/agents/) |

`docs/archive/` = legado — não usar como contrato.

---

## Ordem de execução do produto

1. Auth ✅
2. Empresa + Cérebro da Marca + onboarding ✅
3. Créditos + admin settings ✅ (parcial)
4. RAG platform ← **atual**
5. Workflow engine + execução isolada por agente
6. Agentes MVP (strategist, copywriter, designer, …)
7. Campanhas + workspace
8. Revisão por agente + auto-melhoramento
9. UI por agente + campanha
10. Recarga créditos (Fase 2)
11. Publicação direct post (Fase 3)

**Estado atual:** ver [`docs/project/current-state.md`](docs/project/current-state.md).
