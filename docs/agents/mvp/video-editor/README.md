# Agente MVP: Edição de vídeo

**ID:** `video_editor`  
**Tier:** Default (signup)  
**SDK:** `packages/agent-sdk/src/agents/video_editor/`  
**UI label:** Edição de vídeo *(nav pode usar "Editor de Vídeo")*  
**Rota:** `/dashboard/agents/video-editor` · Reference: `#/editor`  
**Permissão run:** `generation.create`

> Doc canônica OS: [`../../video-editor/README.md`](../../video-editor/README.md) — este arquivo detalha o comportamento **MVP** esperado.

---

## Responsabilidade

Receber **vídeo bruto** + **Edit Style** da Biblioteca → devolver **vídeo editado** (ritmo, legendas, transições, cortes de silêncio conforme preset) pronto para download ou pasta Gerados.

---

## Estado atual vs alvo

| Aspecto | Hoje | Alvo MVP |
|---------|------|----------|
| UI Plano 2 | `VideoEditorGeneration` — stepper 4 passos, resultado mock string | Mesmo stepper; vídeo real no Plano 3 |
| Sidebar | Item `video_editor` marcado `soon: true` | Habilitar navegação |
| SDK | Não implementado | Workflow abaixo |
| Biblioteca | "Usar no Editor" preenche `editorStyleId` no Zustand | Manter + deep link `?styleId=` |
| API | Catálogo vazio | Registrado com `estimatedCreditCost` |

---

## Entrada do usuário (wizard — 4 passos)

| Passo | Campo | Obrigatório |
|-------|-------|-------------|
| 1. Upload | `sourceFileId` ou arquivo local | Sim |
| 2. Edit Style | `editStyleId` (owned) | Sim |
| 3. Ajustes | `options` (opcional, máx. 2 toggles) | Não |
| 4. Geração | confirmação | — |

### `options` sugeridas (MVP — manter mínimo)

| Opção | Default | Descrição |
|-------|---------|-----------|
| `burnCaptions` | true | Legendas queimadas conforme estilo |
| `removeSilence` | conforme estilo | Remover silêncios longos |

Não adicionar mais de 2 controles no MVP (regra CLAUDE.md §10).

---

## Workflow (SDK)

```
retrieve_context
ingest_video
    → metadados + duração + áudio
apply_edit_style
    → resolve preset (LUT, ritmo, fonte legenda)
generate_edit (LLM + render pipeline)
    → EDL ou comando FFmpeg / serviço render
validate_output
upload_output
    → S3 + URL assinada
format_output
```

### Steps detalhados

| Step key | Tipo | Crédito |
|----------|------|---------|
| `retrieve_context` | `retrieve_context` | — |
| `ingest_video` | tool | — |
| `apply_edit_style` | transform | — |
| `generate_edit` | `generate_*` + render | Sim (maior custo) |
| `validate_output` | validation | — |
| `upload_output` | storage | — |

**Execução:** runs longas via Trigger.dev; UI mostra progresso por SSE.

---

## Output schema (Zod)

```typescript
{
  outputVideoUrl: string;
  durationSec: number;
  editStyleId: string;
  sourceFileId: string;
  chapters?: {
    label: string;
    atSec: number;
  }[];
  captionsSrtUrl?: string;
}
```

---

## Contexto e RAG

| Fonte | Uso |
|-------|-----|
| `WORKSPACE_SETTINGS` | Tom de legendas, palavras proibidas, ritmo preferido |
| `FILE_EXTRACT` | Transcrição para legendas automáticas |
| `AGENT_LEARNING` | Estilos aprovados/rejeitados, preferência legenda vs limpa |

---

## Learning (`learning/feedback-handler.ts`)

- Vídeo **aprovado** → associa `editStyleId` + opções usadas
- **Rejeitado** → motivo (ritmo lento, legenda grande, etc.)
- Edição manual de legendas (se UI permitir) → exemplos para próximo run

---

## UI (implementação atual + alvo)

### Componente: `VideoEditorGeneration`

**Stepper (`BlisterStepper`):**

1. **Upload** — `FileDropzone`
2. **Edit Style** — grid `MarketplaceStyleThumb` (owned `edit-style`)
3. **Ajustes** — toggles `burnCaptions`, `removeSilence`
4. **Geração** — progresso + player preview + download

**Integração Biblioteca:**

- `useBlisterOsStore.editorStyleId` pré-seleciona estilo vindo da Library
- Deep link: `/dashboard/agents/video-editor?styleId=es-cinematic`

**Hoje:** passo 4 mostra string mock `resultMock`; sidebar bloqueia com `soon: true`.

**Alvo:** remover `soon`; player `<video>` com URL do output.

### i18n

- Título: **Edição de vídeo** / **Editor de Vídeo**
- CTA final: **Gerar edição**
- `data-testid`: `video-editor-page`

---

## Créditos

| Step | Custo relativo |
|------|----------------|
| `generate_edit` | ~1.5–4.0 conforme duração do vídeo |

`estimatedCreditCost` no catálogo: **~2.4** (vídeo ~5 min, estilo padrão).

Débito progressivo se render multi-step; usuário vê estimativa antes de confirmar passo 4.

---

## Revisão pós-run

- Aprovar vídeo final → learning positivo com `editStyleId`
- Rejeitar → motivo estruturado (select: ritmo / legendas / transições / outro)
- Editar: no MVP, re-run com mesmos inputs + nota no brief (sem editor timeline)

---

## Dependências

| Dependência | Motivo |
|-------------|--------|
| Edit Style owned | Preset visual e de ritmo |
| Files + STT | Legendas alinhadas à fala |
| S3 | Input bruto + output editado |
| FFmpeg ou worker render | Pipeline de vídeo |
| Trigger.dev | Runs > 30s |

---

## O que este agente NÃO faz

- Cortes virais múltiplos de um longo (ver `cuts`)
- Motion graphics complexos fora do preset do Edit Style
- Color grading manual por timeline
- Publicação direta em redes

---

## Checklist de implementação

- [x] UI stepper Plano 2 (fixture)
- [ ] Remover `soon: true` na sidebar quando estável
- [ ] SDK `agents/video_editor/`
- [ ] Pipeline render + upload S3
- [ ] SSE progresso no passo 4
- [ ] Registrar no `agent-catalog.ts`
- [ ] Smoke E2E com wizard completo
