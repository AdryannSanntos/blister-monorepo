# Agents Docs and Rules Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar documentacao e regras internas do projeto com o contrato final do modulo de agentes V1 definido com o produto.

**Architecture:** Atualizacao orientada por fonte de verdade: primeiro PRD/decisions, depois spec e planos de execucao, por fim guias de skill/checklist de revisao para garantir consistencia em todas as novas entregas.

**Tech Stack:** Markdown docs, regras de projeto (`CLAUDE.md`), skills internas (`docs/skills/*`).

---

## File Structure

### Files to modify

- `docs/prd/workana-ai-master.md`
- `docs/decisions/mvp-features.md`
- `docs/decisions/execution-order.md`
- `docs/superpowers/specs/2026-05-21-agents-platform-design.md`
- `docs/superpowers/plans/2026-05-21-agents-platform-foundation.md`
- `docs/superpowers/plans/2026-05-21-agents-product-builder.md`
- `docs/skills/project-engineering-skill.md`
- `docs/skills/frontend-skill.md`
- `docs/skills/backend-skill.md`
- `docs/skills/code-review-skill.md`

### Files to create

- `docs/decisions/2026-05-22-agents-v1-contract.md`

---

### Task 1: Registrar decisao oficial do contrato V1 de agentes

**Files:**
- Create: `docs/decisions/2026-05-22-agents-v1-contract.md`

- [ ] **Step 1: Criar documento de decisao com escopo e exclusoes**

```md
## Decisao
Adotar agentes custom-only no V1, com chat geral via agente de contexto interno.

## Inclui
- chat estilo ChatGPT com branch por edicao
- workflow por agente
- execucao com fila FIFO e retry 1x

## Nao inclui
- agentes default expostos no catalogo
- notificacao por email
```

- [ ] **Step 2: Registrar regras de seguranca e permissao**

```md
- visibilidade: autor + owner/admin
- userId nunca vem do body
- contexto permission-aware
- segredos sempre excluidos do retrieval
```

- [ ] **Step 3: Commit**

```bash
git add docs/decisions/2026-05-22-agents-v1-contract.md
git commit -m "docs: add final agents v1 contract decision"
```

### Task 2: Atualizar PRD e MVP features para o novo contrato

**Files:**
- Modify: `docs/prd/workana-ai-master.md`
- Modify: `docs/decisions/mvp-features.md`

- [ ] **Step 1: Atualizar secao de Agentes no documento mestre**

```md
Agentes no V1:
- apenas customizados por empresa
- tela unica full-focus por agente
- chat com branch por edicao e regenerate
```

- [ ] **Step 2: Atualizar secao de Chat no MVP features**

```md
Chat geral:
- sempre via agente de contexto interno
- delegacao para agente especializado com resposta no chat principal
```

- [ ] **Step 3: Atualizar secao de Historico de execucoes**

```md
- limite de 3 execucoes simultaneas por empresa
- excedente entra em fila FIFO
- retry automatico de 1 tentativa na mesma execucao
```

- [ ] **Step 4: Commit**

```bash
git add docs/prd/workana-ai-master.md docs/decisions/mvp-features.md
git commit -m "docs: align prd and mvp features with agents v1"
```

### Task 3: Atualizar spec principal de agentes

**Files:**
- Modify: `docs/superpowers/specs/2026-05-21-agents-platform-design.md`

- [ ] **Step 1: Atualizar secoes de produto com decisoes finais**

```md
- workflow por agente
- chat geral full-focus separado da dashboard
- aba execucoes somente no chat do agente
```

- [ ] **Step 2: Atualizar secoes de contexto/rag/permissoes**

```md
Pipeline de contexto:
1) conversa atual
2) memoria relevante do mesmo agente
3) retrieval estruturado
4) rag pgvector + rerank
```

- [ ] **Step 3: Atualizar secoes de output e html->png**

```md
HTML->PNG exige:
- preview no formato final
- edicao de html
- confirmacao explicita do usuario antes de exportar
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-21-agents-platform-design.md
git commit -m "docs: update agents platform spec with finalized v1 rules"
```

### Task 4: Ajustar planos antigos para nao conflitar

**Files:**
- Modify: `docs/superpowers/plans/2026-05-21-agents-platform-foundation.md`
- Modify: `docs/superpowers/plans/2026-05-21-agents-product-builder.md`

- [ ] **Step 1: Inserir nota de superseded parcial**

```md
> Update 2026-05-22: este plano deve ser executado em conjunto com os planos
> 2026-05-22-agents-context-execution-core.md e
> 2026-05-22-agents-full-focus-chat-workflow.md em caso de conflito.
```

- [ ] **Step 2: Ajustar linguagem de agentes default vs custom-only**

```md
No V1 atual, o catalogo visivel da empresa e custom-only.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-21-agents-platform-foundation.md docs/superpowers/plans/2026-05-21-agents-product-builder.md
git commit -m "docs: reconcile previous agents plans with 2026-05-22 decisions"
```

### Task 5: Atualizar skills internas de engenharia/review

**Files:**
- Modify: `docs/skills/project-engineering-skill.md`
- Modify: `docs/skills/frontend-skill.md`
- Modify: `docs/skills/backend-skill.md`
- Modify: `docs/skills/code-review-skill.md`

- [ ] **Step 1: Adicionar checklist de agentes no skill de engenharia**

```md
- workflow e versionamento por agente
- chat edit->branch obrigatorio
- context retrieval em camadas
```

- [ ] **Step 2: Adicionar regras de full-focus no skill frontend**

```md
- chat geral/workflow/agent workspace usam shared full-focus layout
- nao usar dashboard shell nessas rotas
```

- [ ] **Step 3: Adicionar regras de seguranca no skill backend**

```md
- retrieval permission-aware
- segredos excluidos do contexto
- timeline por tentativa no mesmo run
```

- [ ] **Step 4: Adicionar checks no skill de review**

```md
blocking checks:
- input sem bloqueio durante execucao ativa
- acao sensivel sem PermissionGate
- contexto recuperando credenciais/segredos
```

- [ ] **Step 5: Commit**

```bash
git add docs/skills/project-engineering-skill.md docs/skills/frontend-skill.md docs/skills/backend-skill.md docs/skills/code-review-skill.md
git commit -m "docs(skills): add agents v1 architecture and review guards"
```

---

## Final Verification

- [ ] Run: `pnpm --filter @company-os/web lint` (garantir sem referencias quebradas em docs importadas por tooling)
- [ ] Run: `pnpm --filter @company-os/api lint` (sanidade geral do workspace)
- [ ] Revisar links entre docs em `docs/README.md`

Expected: documentacao consistente, sem contradicoes de escopo entre PRD/spec/plans/skills.
