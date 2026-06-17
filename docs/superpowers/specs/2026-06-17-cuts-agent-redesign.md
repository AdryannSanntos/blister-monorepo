# Cuts Agent Redesign — Spec

**Data:** 2026-06-17  
**Escopo:** Reformulação completa do agente de cortes — backend (pipeline, render progressivo) + frontend (modal, players, UX)

---

## Objetivo

Tornar o fluxo de geração de cortes rápido e surpreendente: o usuário faz upload, vê feedback granular de progresso, e cada corte aparece na UI assim que termina de renderizar — sem esperar todos. Meta: todos os cortes disponíveis em menos de 2 minutos.

---

## Problemas do design atual

1. **`batchTriggerAndWait`** bloqueia o step `render_cuts` até o ÚLTIMO corte terminar. O usuário não vê nada até que todos estejam prontos.
2. **Download completo por task**: cada task Trigger.dev baixa o vídeo inteiro antes de cortar. Com 5 cortes = 5 downloads completos desnecessários.
3. **Sem thumbnails reais**: o player usa o vídeo-fonte + timestamps como fallback.
4. **Processing UI opaca**: apenas spinner sem feedback de etapas.
5. **RAG/contexto desnecessário**: o agente de cortes incluía `retrieve_context` e `withContext` sem necessidade.
6. **Player nativo**: `<video controls>` sem identidade visual do produto.

---

## Arquitetura Backend

### Pipeline reformulado

```
1. resolve_source     — valida arquivo + transcreve via AssemblyAI
2. rank_segments      — LLM identifica timestamps dos cortes
3. dispatch_renders   — dispara todos os jobs FFmpeg em paralelo (non-blocking)
4. await_renders      — pausa interna até todos os callbacks chegarem
5. await_cut_review   — pausa para review se não for auto-accept
6. finalize_cuts      — valida output final
7. cleanup_source     — limpeza opcional
```

O agente **não** usa `withContext`, `includeBrandBrain`, `includeAgentLearning` nem o step `retrieve_context`. O agente de cortes não tem relação com RAG ou brand brain.

---

### Step `dispatch_renders`

- Chama `cutsRenderClip.batchTrigger(payloads)` — non-blocking, retorna imediatamente
- Payload de cada task: `{ runId, cutId, cutIndex, storageKey, startSec, endSec, runFolderId, companyId, personalSpaceId }`
  - Passa `storageKey`, **não** URL presignada (a task gera a própria URL internamente)
- Persiste no output: `{ totalCuts: N, renderedCount: 0, cuts: [...sem cutFileId] }`
- Retorna `CONTINUE` imediatamente

### Step `await_renders`

- `createPauseStep` com `pauseType: 'internal'`
- `until: (ctx) => ctx.renderedCount >= ctx.totalCuts`
- Desbloqueado quando o endpoint de callback incrementar `renderedCount` ao total

---

### Task Trigger.dev `cuts-render-clip` (reformulada)

Sequência de execução:

```
1. Gera presigned URL via storageKey (no início da execução, sem risco de expiração)
2. FFmpeg: -ss startSec -i <presignedUrl> -t duration -c:v libx264 -preset fast ...
   → HTTP Range Requests: só baixa os bytes do segmento, não o vídeo inteiro
3. Extrai thumbnail: FFmpeg -ss midpointSec -i <presignedUrl> -frames:v 1 thumb.jpg
4. Upload do clip .mp4 para S3
5. Upload da thumbnail .jpg para S3
6. registerCutWorkspaceFile (DB)
7. POST /internal/agents/cuts/cut-rendered com { runId, cutId, cutFileId, thumbnailKey }
```

**Otimização de download:** FFmpeg com input seeking (`-ss` antes de `-i`) + URL HTTP usa Range Requests. Para um corte de 60s num vídeo de 1h, baixa ~1/60 do arquivo ao invés do arquivo completo.

---

### Endpoint de callback interno

`POST /internal/agents/cuts/cut-rendered`

- Protegido por header `x-internal-secret` (env `INTERNAL_SECRET`)
- Não requer JWT de usuário — é chamado pela infra Trigger.dev
- Lógica:
  1. Busca o `AgentRun` pelo `runId`
  2. Encontra o cut por `cutId` no `outputPayload.cuts`
  3. Atualiza `cutFileId` e `thumbnailKey` no cut
  4. Incrementa `renderedCount`
  5. Emite SSE `cut_rendered` com dados completos do corte
  6. Se `renderedCount === totalCuts`: emite SSE `all_cuts_rendered` + desbloqueia `await_renders`

---

### SSE Events novos

```ts
'cut_rendered': {
  runId: string
  cutId: string
  cutFileId: string
  thumbnailKey: string
  renderedCount: number
  totalCuts: number
}

'all_cuts_rendered': {
  runId: string
}
```

---

### Contrato de dados do AgentRun durante renders

Campo `outputPayload` enquanto `await_renders` está ativo:

```ts
{
  totalCuts: number
  renderedCount: number
  cuts: Array<{
    id: string
    title: string
    startSec: number
    endSec: number
    viralScore: number
    description: string
    reviewStatus: 'pending' | 'approved' | 'rejected'
    cutFileId?: string       // preenchido por callback
    thumbnailKey?: string    // preenchido por callback
  }>
}
```

---

## Arquitetura Frontend

### Estados do modal

```
source → processing → results
    ↘                     ↗
              error
```

---

### Fase `source`

Sem mudanças estruturais. Upload de arquivo local ou seleção de arquivo existente.

---

### Fase `processing` (redesenhada)

Modal compacto (`max-w-lg`). Lista de etapas com ícone de status:

```
✓ Transcrevendo vídeo          ← step_completed: resolve_source
○ Gerando cortes...            ← step_completed: rank_segments (em progresso)
○ Renderizando cortes (0/5)    ← atualiza via cut_rendered
```

- `step_completed` com `stepKey: 'resolve_source'` → check na etapa 1
- `step_completed` com `stepKey: 'rank_segments'` → check na etapa 2, mostra contador
- `cut_rendered` → incrementa contador "Renderizando cortes (X/5)"
- **Primeiro `cut_rendered`** → modal expande com animação para tamanho results + transição de fase

---

### Fase `results` (reformulada)

Modal largo (`max-w-[1180px]`, `h-[94vh]`). Dois painéis:

**Painel esquerdo (2/3):**
- Grade 4 colunas de thumb cards
- Cada card: placeholder skeleton animado → quando `cutFileId` disponível, `<video>` pausado no primeiro frame
- Botões inline por card: `[Rejeitar] [Aprovar]` quando `reviewable`
- Metadados do corte selecionado abaixo da grade: título, viral score badge, janela temporal, descrição

**Painel direito (1/3):**
- Player no variant `story` (padrão no modal de geração)
- Botões de aprovar/rejeitar abaixo do player quando `reviewable` e cut selecionado

**Footer:**
- `[Fechar]` sempre
- `[Enviar review]` quando `reviewable` (desabilitado até todos decididos)

**Skeletons progressivos:** os N slots da grade existem desde o início (count vem de `totalCuts` no outputPayload). À medida que `cut_rendered` chega, o skeleton é substituído pelo cut real.

---

### Players

Biblioteca: **vidstack** (`@vidstack/react`) — controles headless, suporte nativo 9:16, customização via CSS vars.

#### Variant `story`

- Sem controles visíveis permanentes
- Click/tap: play/pause
- Barra de progresso fina no topo (`var(--accent)`, 2px height)
- Ícone play/pause centralizado com fade-in/out ao interagir
- Auto-loop quando atinge `endSec`
- Seek reseta para `startSec`

#### Variant `minimal`

- Controles na parte inferior: play/pause, tempo atual / total, scrubber clicável, volume, fullscreen
- Tudo usando CSS vars: `--fg-primary`, `--bg-elevated`, `--accent`, `--line-subtle`
- Hover revela controles, idle 3s os esconde

#### Props do player

```ts
type PlayerVariant = 'story' | 'minimal'

type CutPlayerProps = {
  src: string | null
  variant: PlayerVariant
  cutId: string | null
  startSec?: number     // segment mode: antes do cutFileId
  endSec?: number
  className?: string
}
```

**Segment mode:** quando `cutFileId` não existe ainda, o player usa o vídeo-fonte + `startSec`/`endSec` para simular o corte (seek ao abrir, para no endSec).

---

### Thumb card

```
┌──────────────┐
│  [skeleton]  │  ← antes do cutFileId
│  ou          │
│  [video f0]  │  ← primeiro frame do vídeo renderizado
│              │
│  Corte 1     │
│  [✗]   [✓]  │  ← se reviewable
└──────────────┘
```

- Aspect ratio 9:16
- Selecionado: borda `var(--accent)` 2px
- Aprovado: overlay verde sutil + ícone check
- Rejeitado: overlay vermelho sutil + ícone x
- Hover: escurece levemente

---

### Página de resultados (`cuts-results-page`)

Usa o mesmo `CutsRunModal` via `handleOpenRunDetails`. Exibe direto na fase `results` com `intent: 'view'`. Player no variant `minimal`.

---

## Estrutura de arquivos

### Backend

```
apps/api/src/agents/cuts/
├── agent.ts                          ← remove withContext + retrieve_context step
├── steps/
│   └── cuts-steps.ts                 ← add createDispatchRendersStep,
│                                        add createAwaitRendersStep,
│                                        remove batchTriggerAndWait lógica
├── services/
│   └── render-cut-clips.service.ts   ← simplificado: só batchTrigger
└── schemas/
    └── output.schema.ts              ← thumbnailKey adicionado ao CutOutput

apps/api/src/agents/runtime/
└── internal-events.controller.ts     ← POST /internal/agents/cuts/cut-rendered

trigger/
└── cuts-render-clip.ts               ← gera presigned URL internamente,
                                         HTTP range requests,
                                         extrai thumbnail,
                                         chama callback interno
```

### Frontend

```
apps/web/src/core/modules/agents/
├── components/cuts/
│   ├── cuts-run-modal.tsx            ← expansão animada processing→results
│   ├── cuts-processing-step.tsx      ← etapas visuais com check
│   ├── cuts-review-panel.tsx         ← grade com skeletons progressivos
│   ├── cut-story-thumb.tsx           ← skeleton + video first-frame + review inline
│   ├── cut-story-player.tsx          ← prop variant, delega a story/minimal
│   └── players/
│       ├── story-player.tsx          ← variant story (vidstack)
│       └── minimal-player.tsx        ← variant minimal (vidstack)
├── hooks/
│   ├── use-cuts-run-modal.ts         ← handle cut_rendered SSE
│   └── use-agent-run-stream.ts       ← garante cut_rendered processado
└── utils/
    └── apply-agent-run-event.ts      ← handler cut_rendered + all_cuts_rendered
```

---

## Critérios de sucesso

- Primeiro corte aparece na UI em menos de 60s após upload
- Todos os cortes disponíveis em menos de 2min para vídeos de até 1h
- Cada task Trigger.dev baixa apenas o segmento necessário (Range Requests)
- Zero polling contínuo — tudo event-driven
- Modal expande suavemente quando primeiro corte chega
- Player story e minimal funcionam com CSS vars do Blister
- Thumbnails aparecem quando o vídeo renderizado está disponível
- Página de resultados usa o mesmo modal sem duplicar código
