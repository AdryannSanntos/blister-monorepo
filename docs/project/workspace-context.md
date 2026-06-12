# Workspace Context — Settings + Files + Integrations

> Substitui o módulo **Cérebro da Marca** como fonte de contexto para RAG e agentes.  
> PRD: [`blister-os-prd.md`](../prd/blister-os-prd.md) · ADR: [`2026-06-12-blister-os-pivot.md`](../decisions/2026-06-12-blister-os-pivot.md)

---

## Princípio

Não existe módulo isolado `/dashboard/brand`. O contexto do workspace é **distribuído** em três superfícies que alimentam o RAG de forma unificada (`ContextPackService` no Plano 3).

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Configurações  │     │     Arquivos    │     │  Integrações    │
│  identidade     │     │  upload+extract │     │  (fase 2+)      │
│  voz, paleta    │     │  pastas, vídeos │     │  YouTube, Drive │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    RAG (filtrado por workspaceId)
                                 ▼
                         AgentRun StepContext
```

---

## Configurações (`/dashboard/settings`)

Absorve o que era Brand Brain + equipe + créditos + metadados do workspace.

| Seção | Campos | RAG source |
|-------|--------|------------|
| Contexto da marca | Logo, voz, paleta, nicho, descrição | `WORKSPACE_SETTINGS` |
| Workspace | Nome, slug, timezone | `WORKSPACE_SETTINGS` |
| Equipe | Membros, roles (5) | Não indexado |
| Créditos | Saldo, histórico link | Não indexado |
| Integrações | Conectores ativos | Por conector |

Spec: [`docs/prd/modules/workspace-settings.md`](../prd/modules/workspace-settings.md)

---

## Arquivos (`/dashboard/files`)

Browser de mídia e documentos — matéria-prima video-first.

| Capacidade | Detalhe |
|------------|---------|
| Pastas | Hierarquia com breadcrumb |
| Upload | Vídeo, áudio, PDF, md, imagens |
| Extract | Transcrição, OCR, caption → `extractedText` |
| Indexação | Extract → `RagDocument` (`FILE_EXTRACT`) |
| Uso | Wizards referenciam arquivo como fonte |

Spec: [`docs/prd/modules/files.md`](../prd/modules/files.md)

---

## Integrações (roadmap)

| Conector | Dados indexados |
|----------|-----------------|
| YouTube | Metadados + transcrições públicas |
| Google Drive | Docs selecionados |
| Notion | Páginas vinculadas |

Não bloqueiam MVP — Settings exibe placeholder "Em breve" no Plano 2.

---

## Escopo por workspace

| Workspace | `workspaceId` | RBAC |
|-----------|---------------|------|
| Espaço Pessoal | `personalSpaceId` | Dono apenas |
| Empresa | `companyId` | 5 roles |

Retrieval **nunca** cruza workspaces. Services validam membership antes de RAG ou run.

---

## Migração do legado

| Legado | OS |
|--------|-----|
| `BrandProfile` | `WorkspaceSettings` (Plano 3) |
| `RagSourceType.BRAND_BRAIN` | `WORKSPACE_SETTINGS` |
| `CampaignFile` | `File` + extract unificado |
| `/dashboard/brand` | `/dashboard/settings` |

Código legado permanece até Plano 3 — docs já apontam para o alvo.

---

## UI copy

- Usar **"Contexto da marca"** ou **"Contexto do workspace"** — nunca "Cérebro da Marca"
- Card em Settings: progresso de completude (ex.: 14/14 campos)
- Empty state Arquivos: CTA "Enviar vídeo" / "Criar pasta"
