# Épico: Workspace Settings (substitui Brand Brain)

> **Status:** Alvo Blister OS · **Deprecated:** [`brand-brain.md`](brand-brain.md)  
> Superfície: `/dashboard/settings` · Reference: `#/settings`

---

## Objetivo

Centralizar identidade, voz, metadados do workspace, equipe e créditos — **sem** módulo separado de marca. Tudo que alimenta RAG de identidade vive aqui e dispara reindex ao salvar.

---

## Seções da página

### 1. Contexto da marca

| Campo | Obrigatório onboarding | RAG |
|-------|------------------------|-----|
| Logo | Sim | Sim (asset ref) |
| Tom de voz | Sim | Sim |
| Nome do workspace | Sim | Sim |
| Paleta de cores | Opcional | Sim |
| Tipografia preferida | Opcional | Sim |
| Nicho / descrição | Opcional | Sim |

- Barra de completude (ex.: 14/14)
- CTA: **Revisar contexto** → subform ou drawer
- Ao salvar: `PATCH /api/workspaces/:id/settings` + job RAG

### 2. Créditos

- Saldo atual + link histórico
- CTA: Adicionar créditos (Fase 2 — Stripe)

### 3. Equipe e permissões

- Avatares + contagem
- CTA: Gerenciar → convites, roles (`owner`, `admin`, `creator`, `reviewer`, `viewer`)
- Espaço Pessoal: seção oculta ou "Só você"

### 4. Workspace

- Nome exibido + slug
- CTA: Editar metadados

---

## Regras

- Máx. 2–3 campos no onboarding inicial (nome + voz + logo opcional)
- Atualização dispara reindex `WORKSPACE_SETTINGS`
- Permissões: `workspace.settings.read` / `workspace.settings.update`
- AuditLog em mutações sensíveis

---

## API (Plano 3)

| Método | Path | Permissão |
|--------|------|-----------|
| GET | `/api/workspaces/:id/settings` | `workspace.settings.read` |
| PATCH | `/api/workspaces/:id/settings` | `workspace.settings.update` |
| POST | `/api/workspaces/:id/settings/logo` | presigned + confirm |

DTOs em `packages/types` — `WorkspaceSettingsDto` (Zod).

---

## UI (Plano 2 — offline)

- Cards empilhados (`gap-4`) como no reference
- Edição em memória + `localStorage` persist opcional
- Zero chamadas HTTP

---

## Migração

- `BrandProfile` → mapear para `WorkspaceSettings` na migration Plano 3
- Rotas `/dashboard/brand` removidas no Plano 2
- Permissões `brand.*` → `workspace.settings.*` (authz primeiro)
