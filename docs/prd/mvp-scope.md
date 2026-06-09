# Escopo MVP — Blister

> O que entra e o que fica de fora da Fase 1.  
> **Atualizado:** 2026-06-09 — agentes isolados, sem pipeline/peça central.

---

## Dentro do MVP

### Fundação
- [x] Auth, RBAC, dashboard shell
- [x] Company + Cérebro da Marca + onboarding
- [x] Storage S3
- [x] Créditos + admin AI catalog (parcial)
- [ ] Permissões `post.*` / revisão por run (migrar de `piece.*`)

### Campanhas
- [ ] CRUD campanha (nome + objetivo)
- [ ] Contexto textual + arquivos
- [ ] Workspace `/dashboard/campanhas/[id]` com abas por agente
- [ ] Runs com `campaignId` — **sem** pipeline automático

### Agentes
- [ ] Workflow engine (pause/resume/fail) **por agente**
- [ ] Registry plugável
- [ ] Catálogo MVP: strategist, copywriter, designer (+ `post` futuro)
- [ ] `POST /api/agents/:agentId/run`
- [ ] Revisão na run (approve/reject/edit)
- [ ] HTML→PNG via **Satori** (agente designer)
- [ ] Trigger.dev para execução async

### RAG
- [ ] pgvector + Prisma
- [ ] Ingestão: marca, campanha, arquivos, `AGENT_LEARNING`
- [ ] Retrieval: estruturado → vetorial → rerank
- [ ] Trigger.dev para `RagIndexJob`

### Auto-melhoramento
- [ ] Feedback por `AgentRun` (não por peça central)
- [ ] `feedback-handler` obrigatório por agente
- [ ] Indexação `AGENT_LEARNING` por `agentId`

### Créditos
- [x] CreditBalance + CreditLedger
- [x] US$ 20 free tier
- [x] Bloqueio sem saldo
- [ ] Débito por step `generate_*`

### Admin
- [x] Platform settings, AI catalog (parcial)
- [ ] Catálogo de agentes (habilitar/ordem UI)
- [ ] RAG settings + reindex

### UI
- [ ] Superfície por agente (não hub `/pecas`)
- [ ] Workspace campanha
- [ ] Saldo créditos no header
- [ ] Formulário de pause (run PAUSED)

---

## Fora do MVP

| Item | Fase |
|------|------|
| Pipeline automático entre agentes | Descartado |
| Hub central peça/post + `/api/pecas` | Descartado |
| Recarga self-service (Stripe) | 2 |
| Stories / carrossel | 2 |
| Publicação direct Instagram/TikTok | 3 |
| Equipe multi-usuário | 3 |
| Fine-tuning modelos | Não previsto |

---

## Ordem de implementação sugerida

1. ~~Empresa + Marca + storage~~ ✅
2. ~~Créditos + admin settings~~ ✅ (parcial)
3. **RAG platform** ← atual
4. **Workflow engine + agent run isolado**
5. Agentes MVP (strategist, copywriter, designer)
6. Campanhas + arquivos + workspace
7. Feedback + learning na run
8. UI por agente + campanha

---

## Critérios de aceite MVP

- Onboarding em ≤ 3 campos
- Usuário roda **um agente** e recebe output em < 2 min
- Revisão (aprovar/negar) **no agente** melhora próxima run (learning indexado)
- Saldo zera → bloqueio claro
- Admin altera free tier sem deploy
- **Nenhum** fluxo dispara múltiplos agentes em sequência
