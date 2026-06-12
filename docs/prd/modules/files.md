# Épico: Arquivos (Files)

> Superfície: `/dashboard/files` · Reference: `#/uploads` (evolui para file browser)  
> PRD: [`blister-os-prd.md`](../blister-os-prd.md)

---

## Objetivo

Gerenciar matéria-prima de conteúdo — vídeos brutos, áudio, PDFs, markdown — com **pastas**, preview e **extract** assíncrono que alimenta RAG e wizards (Editor, Cortes, Pesquisar).

---

## Capacidades MVP

| Feature | Detalhe |
|---------|---------|
| File browser | Grid + list toggle, breadcrumb de pastas |
| Upload | Drag-and-drop + botão; vídeo prioritário |
| Metadados | Nome, duração, tamanho, data, projeto ligado |
| Pastas | Criar, renomear, mover (Plano 3 persist) |
| Extract | Transcrição (vídeo/áudio), OCR (PDF), texto (md) |
| Status extract | `pending` → `processing` → `ready` / `failed` |
| Ações | Abrir no Editor, usar em Cortes, ver extract |

---

## Tipos suportados

| MIME | Extract |
|------|---------|
| `video/*` | Transcrição + duração |
| `audio/*` | Transcrição |
| `application/pdf` | Texto (pdf-parse) |
| `text/markdown`, `text/plain` | Direto |
| `image/*` | Caption vision (opcional MVP) |

---

## RAG

- Após extract: `RagDocument` sourceType `FILE_EXTRACT`
- Chunking padrão platform settings
- Filtro: `workspaceId` + `fileId`
- Agentes `retrieve_context` incluem chunks de arquivos do projeto ativo

---

## API (Plano 3)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/files` | Lista com `folderId`, paginação |
| POST | `/api/files/folders` | Criar pasta |
| POST | `/api/files/presigned-upload` | Upload S3 |
| POST | `/api/files/:id/confirm` | Confirma + enqueue extract |
| GET | `/api/files/:id/extract` | Texto extraído |
| DELETE | `/api/files/:id` | Soft delete |

Permissões: `file.create`, `file.read`, `file.delete`.

---

## UI (Plano 2 — offline)

Fixture `FILES` + `FOLDERS` em TS; estado Zustand ou localStorage.

Componentes alvo:

- `FileBrowser` — breadcrumb + toolbar (grid/list, nova pasta, upload)
- `FileRow` / `FileCard` — ícone por tipo, badges de status
- Empty state: "Sua matéria-prima aparece aqui"

---

## Relação com Projetos

- Arquivo pode linkar a `projectId` (opcional)
- Badge "usado em: {projeto}" como no proto `UPLOADS`
- Projeto workspace lista arquivos associados

---

## Rotas

| Legado | OS |
|--------|-----|
| `#/uploads` | `#/files` (alias uploads mantido no proto temporariamente) |
| — | `/dashboard/files` |
