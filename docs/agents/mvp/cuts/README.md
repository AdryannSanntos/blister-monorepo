# Agente MVP: Corte para seus vídeos

**ID:** `cuts`  
**Tier:** Default (signup)  
**SDK:** `packages/agent-sdk/src/agents/cuts/`  
**UI label:** Cortes *(ou "Corte para seus vídeos" na home)*  
**Rota:** `/dashboard/agents/cuts` · Reference: `#/cortes`  
**Permissão run:** `generation.create`

> Doc canônica OS: [`../../cuts/README.md`](../../cuts/README.md) — este arquivo detalha o comportamento **MVP** esperado.

---

## Responsabilidade

Transformar **vídeos longos** (live, podcast, aula, depoimento) em **cortes curtos** priorizados por potencial de retenção, com preview e metadados para publicação — aplicando um **Edit Style** da Biblioteca.

---

## Estado atual vs alvo

| Aspecto | Hoje | Alvo MVP |
|---------|------|----------|
| UI Plano 2 | `CutsGeneration` — upload mock, 3 cortes fake, estilos owned | Mesmo fluxo, dados reais no Plano 3 |
| SDK | Pasta `agents/cuts/` **não implementada** | Workflow completo abaixo |
| API | `buildRegisteredAgents()` vazio | `cuts` registrado |
| Extract | — | Transcrição do vídeo fonte via Files + STT |
| Render | — | Clips reais ou proxy preview (MVP pode entregar timestamps + título antes do render físico) |

---

## Entrada do usuário (máx. 3 campos)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `sourceFileId` | string | Sim* | Vídeo em Arquivos (*ou upload no wizard → cria file) |
| `editStyleId` | string | Sim | Edit Style owned (ritmo, legendas, transições) |
| `maxCuts` | number (1–10) | Não | Default: 5 |

**Wizard proto:** passo 1 = fonte, passo 2 = estilo, passo 3 = resultados.

---

## Workflow (SDK)

```
retrieve_context
analyze_source
    → transcrição + segmentação + detecção de picos
rank_segments (LLM + heurísticas retenção)
apply_edit_style
    → preset da biblioteca (legendas, jump cuts, etc.)
render_cuts
    → clip por segmento ou manifest para render async
validate_output
format_output
```

### Steps detalhados

| Step key | Tipo | Crédito |
|----------|------|---------|
| `retrieve_context` | `retrieve_context` | — |
| `analyze_source` | tool (STT + segment) | Sim (STT) |
| `rank_segments` | `generate_*` (LLM) | Sim |
| `apply_edit_style` | transform | — |
| `render_cuts` | `generate_*` / async job | Sim (por corte) |
| `validate_output` | validation | — |

**MVP incremental:** Fase A entrega `startSec`/`endSec` + títulos + scores; Fase B adiciona `previewUrl` renderizado.

---

## Output schema (Zod)

```typescript
{
  sourceFileId: string;
  editStyleId: string;
  cuts: {
    id: string;
    title: string;
    hook: string;
    startSec: number;
    endSec: number;
    retentionScore: number;   // 0–100
    previewUrl?: string;
    suggestedCaption?: string;
  }[];
}
```

---

## Contexto e RAG

| Fonte | Uso |
|-------|-----|
| `WORKSPACE_SETTINGS` | Nicho, tom de ganchos, CTAs |
| `FILE_EXTRACT` | Transcrição do vídeo fonte |
| `AGENT_LEARNING` | Duração de corte preferida, ganchos aprovados/rejeitados |

---

## Learning (`learning/feedback-handler.ts`)

- Cortes **aprovados** → padrões de gancho e duração
- Cortes **rejeitados** → temas/trechos a evitar
- Ajuste de `title`/`hook` pelo usuário → exemplos positivos

---

## UI (implementação atual + alvo)

### Componente: `CutsGeneration` (`apps/web/.../cuts-generation.tsx`)

**Hoje (Plano 2):**

1. `FileDropzone` — seleciona arquivo local (nome apenas)
2. Chips de Edit Styles owned
3. Botão gerar → delay simulado → lista de 3 cortes mock
4. Registra run no Zustand + link para histórico

**Alvo Plano 3:**

1. Seletor de arquivo de **Arquivos** (ou upload com extract)
2. Estilos da Biblioteca com preview `MarketplaceStyleThumb`
3. Lista ordenada por `retentionScore` com player de preview
4. Ações: Aprovar corte / Descartar / Editar título / Exportar

### i18n

- Nav: **Cortes** ou **Gerador de Cortes** (alinhar com PRD — preferir **Cortes** no MVP)
- CTA: **Gerar cortes**
- `data-testid`: `cuts-page` (smoke Playwright existente)

---

## Créditos

| Step | Custo relativo |
|------|----------------|
| `analyze_source` (STT) | ~0.5–2.0 conforme duração do vídeo |
| `rank_segments` | ~0.4 |
| `render_cuts` | ~0.3 × número de cortes |

`estimatedCreditCost` no catálogo: **~1.8** (vídeo médio, 5 cortes).

---

## Revisão pós-run

- Aprovar corte individual ou run inteira (definir no UI — preferir **por corte** no MVP)
- Feedback por corte alimenta learning com `cutId` no payload de review

---

## Dependências

| Dependência | Motivo |
|-------------|--------|
| Files + extract STT | Base semântica para rank |
| Edit Style owned | Look dos cortes |
| Storage S3 | Previews e exports |
| Trigger.dev (opcional) | Render async de clips longos |

---

## O que este agente NÃO faz

- Edição completa do vídeo longo (ver `video_editor`)
- Publicar cortes em redes sociais
- Encadear com `reels_script` automaticamente
- Cortar sem arquivo fonte (sem upload/seleção)

---

## Checklist de implementação

- [x] UI wizard Plano 2 (fixture)
- [ ] SDK `agents/cuts/` + prompts retenção
- [ ] Integração Files + STT
- [ ] Render preview (Fase B)
- [ ] Registrar no `agent-catalog.ts`
- [ ] Smoke E2E passando com API mock/real
