# Agente Carrossel — Design Spec

**Data:** 2026-06-28  
**Status:** Aprovado  
**Agent ID:** `carousel`

---

## Visão geral

O agente **Carrossel** permite que creators gerem carrosséis prontos para publicação a partir de um tema. O usuário fornece o tema e configurações básicas; o agente conduz um fluxo guiado de 3 etapas de revisão (escolha de ideia → aprovação de conteúdo → aprovação de design) e entrega slides finalizados como HTML/CSS + PNGs exportáveis.

Todo carrossel **obrigatoriamente** utiliza um template adquirido no marketplace. Sem templates resgatados, o agente exibe empty state com CTA para o marketplace.

---

## Nomenclatura e posicionamento

| Atributo | Valor |
|---|---|
| Nome exibido | Carrossel |
| Agent ID | `carousel` |
| Rota principal | `/dashboard/agents/carousel` |
| Rota de settings | `/dashboard/agents/carousel/settings` |
| Sidebar | Junto ao agente de Cortes |
| Marketplace item type | `carousel_template` |

---

## Sistema de templates

### Princípios

- Templates são **arquivos estáticos no repositório** (`apps/api/src/agents/carousel/templates/<template-id>/`)
- Cada template tem no mínimo 10 variações de layout distribuídas entre os tipos de slide
- O único tipo fixo é o **Slide Start** (sempre o primeiro slide, variação única `v1`)
- Todos os demais tipos são escolhidos dinamicamente pela IA durante o `generate_design_plan`

### Tipos de slide

| Tipo | Const | Descrição |
|---|---|---|
| Start | `start` | Primeiro slide sempre. Foco em atenção e curiosidade. |
| Texto | `text` | Apenas conteúdo textual. Múltiplas variações. |
| Texto + Imagem | `text_image` | Texto combinado com imagem. Múltiplas variações. |
| Imagem | `image` | Foco visual em imagem. Múltiplas variações. |

### Estrutura de diretórios

```
apps/api/src/agents/carousel/templates/
└── <template-id>/
    ├── manifest.json
    ├── instructions.md
    └── slides/
        ├── start/
        │   └── v1/
        │       ├── slide.html
        │       └── slide.css
        ├── text/
        │   ├── v1/
        │   ├── v2/
        │   └── v3/
        ├── text-image/
        │   ├── v1/
        │   ├── v2/
        │   └── v3/
        └── image/
            ├── v1/
            └── v2/
```

### `manifest.json`

```json
{
  "id": "minimal-clean",
  "name": "Minimal Clean",
  "description": "Layout minimalista com tipografia bold",
  "dimensions": {
    "instagram": { "width": 1080, "height": 1080 }
  },
  "slides": {
    "start":      ["v1"],
    "text":       ["v1", "v2", "v3"],
    "text-image": ["v1", "v2", "v3"],
    "image":      ["v1", "v2"]
  }
}
```

### `instructions.md`

Documento de instruções para a IA contendo:
- Identidade visual: cores, tipografia, espaçamentos, tom
- Regras de uso de cada tipo de slide
- Critérios para escolha de cada variação (quantidade de texto, presença de imagem, fluxo visual)
- Variáveis injetáveis nos templates: `{{title}}`, `{{body}}`, `{{call_to_action}}`, `{{image_url}}`

### `CarouselTemplateService`

Lê os arquivos em `templates/` na inicialização do módulo e mantém cache em memória:

- `listTemplates(): TemplateManifest[]`
- `getTemplate(id): { manifest, instructions }`
- `getSlideVariation(templateId, type, variationId): { html, css }`
- `getAvailableVariations(templateId): Record<SlideType, string[]>`

### Vínculo Marketplace → Template

O item do marketplace referencia o `templateId`. Ao resgatar, cria um `LibraryItem` com `{ workspaceId, templateId }`. O agente consulta os `LibraryItem` do workspace antes de listar templates disponíveis no modal de configuração.

---

## Schemas de tipos (`packages/types/src/agents/carousel.ts`)

```typescript
type CarouselSocialNetwork = 'instagram' | 'facebook' | 'tiktok'
type CarouselSlideType = 'start' | 'text' | 'text_image' | 'image'

interface CarouselAgentSettings {
  slidesCount: number           // min: 3, max: 15, default: 5
  defaultTemplateId?: string
  defaultSocialNetworks: CarouselSocialNetwork[]
  aiGeneratedImages: boolean    // sempre false — reservado para fase futura
}

interface CarouselRunInput {
  theme: string
  templateId: string
  socialNetworks: CarouselSocialNetwork[]
  slidesCount: number
}

interface CarouselIdeaOption {
  id: string
  title: string
  description: string
}

interface CarouselSlideContent {
  id: string
  order: number
  type: CarouselSlideType
  title?: string
  body?: string
  callToAction?: string
}

interface CarouselSlideDesign {
  id: string
  order: number
  type: CarouselSlideType
  variationId: string           // ex: "v2"
  needsImage: boolean
  imageSlot?: string            // label descritivo — ex: "foto do produto"
  imageFileId?: string          // preenchido após upload do usuário
  layoutNotes: string           // instruções da IA para o step de geração
}

interface CarouselDesignPlan {
  templateId: string
  slides: CarouselSlideDesign[]
}

interface CarouselOutputSlide {
  id: string
  order: number
  type: CarouselSlideType
  htmlContent: string
  cssContent: string
  pngFileId?: string
}

interface CarouselOutput {
  socialNetwork: CarouselSocialNetwork
  templateId: string
  slides: CarouselOutputSlide[]
}
```

Todos os schemas terão equivalente Zod para validação em DTOs (backend) e formulários (frontend).

---

## Dimensões por rede social

| Rede | Dimensões | Status |
|---|---|---|
| Instagram | 1080×1080 (square) | Habilitado |
| Facebook | 1200×1200 | Desabilitado (em breve) |
| TikTok | 1080×1920 (9:16) | Desabilitado (em breve) |

---

## Pipeline de steps do agente (backend)

```
generate_ideas
    ↓
await_idea_selection       ← PAUSE
    ↓
generate_content
    ↓
await_content_approval     ← PAUSE
    ↓ (rejected → volta para generate_content)
generate_design_plan
    ↓
await_design_approval      ← PAUSE
    ↓ (rejected → volta para generate_design_plan)
generate_slides
    ↓
render_slides
    ↓
finalize_carousel
```

### Detalhamento de cada step

#### `generate_ideas`
- **Input:** `CarouselRunInput` (tema, template, redes sociais, quantidade de slides)
- **Processo:** LLM recebe o tema e contexto do template. Gera 5–10 ideias de post.
- **Output:** `CarouselIdeaOption[]` — cada ideia com `id`, `title`, `description`
- **Prompt:** `prompts/ideas.prompt.ts`

#### `await_idea_selection` *(PAUSE)*
- **Form:** `{ selectedIdeaId: string }`
- **Bloqueia** até o usuário responder via `POST /agent-runs/:runId/blocks/:blockId/answer`
- Sem rejeição — usuário simplesmente escolhe uma das opções

#### `generate_content`
- **Input:** ideia escolhida + `instructions.md` do template
- **Processo:** LLM gera o conteúdo de cada slide: tipos, textos, call to action
- **Output:** `CarouselSlideContent[]`
- **Prompt:** `prompts/content.prompt.ts`

#### `await_content_approval` *(PAUSE)*
- **Form:** `{ approved: boolean, slides?: CarouselSlideContent[] }`
- `approved: false` → routing de volta para `generate_content` (regeneração completa)
- `approved: true` com edições → usa o array editado pelo usuário

#### `generate_design_plan`
- **Input:** `CarouselSlideContent[]` + `instructions.md` + variações disponíveis do template
- **Processo:** Para cada slide, a IA escolhe `type`, `variationId`, define `needsImage`, escreve `layoutNotes`
- **Output:** `CarouselDesignPlan`
- **Prompt:** `prompts/design-plan.prompt.ts`
- O Slide Start sempre usa `{ type: 'start', variationId: 'v1' }`

#### `await_design_approval` *(PAUSE)*
- **Form:** `{ approved: boolean, plan?: CarouselDesignPlan, imageUploads?: { slideId: string, fileId: string }[] }`
- Upload de imagens obrigatório para todos os `needsImage: true` antes de aprovar
- `approved: false` → routing de volta para `generate_design_plan`
- `approved: true` → `imageFileId` de cada `CarouselSlideDesign` é preenchido antes de avançar

#### `generate_slides`
- **Input:** `CarouselDesignPlan` + html/css de referência de cada variação via `CarouselTemplateService`
- **Processo:** Para cada slide, LLM usa o html/css de referência + conteúdo + `layoutNotes` + imagem (se houver) e gera o HTML/CSS final injetando as variáveis
- **Output:** `CarouselOutputSlide[]` com `htmlContent` e `cssContent`
- **Prompt:** `prompts/slides.prompt.ts`

#### `render_slides`
- **Processo:** Para cada slide, Puppeteer renderiza o HTML+CSS na dimensão correta (ex: 1080×1080) e exporta PNG → upload S3
- Atualiza `pngFileId` em cada `CarouselOutputSlide`
- **Serviço:** `CarouselRenderService`

#### `finalize_carousel`
- Consolida tudo em `AgentRun.outputPayload: CarouselOutput`
- Emite SSE `run_completed`

---

## Fluxo de UI (frontend)

### Visão geral do fluxo

```
Overview page
    → [Clica "Novo Carrossel"]
    → Modal de configuração (CarouselSourceStep)
    → [Confirma]
    → Status modal (success/error)
    → [Clica "Ver Execução"]
    → Página de detalhe da execução (wizard vertical)
        → Fase 1: Escolha de ideia
        → Fase 2: Aprovação de conteúdo
        → Fase 3: Aprovação de plano de design + upload de imagens
        → Fase 4: Preview e exportação
```

---

### Overview page (`carousel-overview-page.tsx`)

Segue exatamente o padrão da `agent-overview-page.tsx` do cortes:
- Stats no topo (total de runs, concluídos, créditos usados)
- Botão "Novo Carrossel" → abre `CarouselRunModal`
- Grid de `CarouselRunCard`
- **Empty state sem templates:** ícone + mensagem "Você ainda não tem templates de carrossel" + botão "Ver templates no Marketplace" → `/dashboard/marketplace`
- **Empty state sem runs:** ícone + mensagem + botão "Criar primeiro carrossel"

---

### Modal de configuração (`carousel-run-modal.tsx`)

Segue o padrão do `cuts-run-modal.tsx`. Campos em `CarouselSourceStep`:

| Campo | Componente | Detalhe |
|---|---|---|
| Tema | `Textarea` | Obrigatório. Placeholder descritivo. |
| Template | `Select` | Apenas templates do workspace. Exibe preview thumbnail + nome. |
| Rede social | Toggle group de ícones | Instagram ativo; Facebook/TikTok com badge "Em breve" e cursor desabilitado. |
| Quantidade de slides | `Slider` (3–15) | Valor padrão vindo das settings do agente. |

- Validação com RHF + zodResolver, `mode: 'onBlur'`
- Se nenhum template disponível → alerta inline com link para o marketplace, botão de confirmação desabilitado
- Fechar bloqueado durante submissão (sem escape/click fora)

---

### Status modal (`carousel-run-status-modal.tsx`)

Reutiliza `StatusModal` exatamente como o cortes:
- **Success:** título "Carrossel em processamento", desc, botão "Ver execução" → `/dashboard/agents/carousel/runs/:runId`
- **Error:** título "Erro ao iniciar", desc com mensagem, botão "Tentar novamente" → reabre `CarouselRunModal`

---

### Página de detalhe da execução (`carousel-run-detail-page.tsx`)

#### Princípios de UX
- Wizard vertical: fases se revelam conforme o agente avança
- Cada fase tem estado visual claro: processando / aguardando ação / concluído / erro
- O usuário nunca fica sem saber o que fazer — fases pendentes mostram feedback de espera, fases que precisam de ação ficam em destaque com borda accent e CTA visível
- Fases concluídas colapsam automaticamente mas permitem expansão para revisão
- Animações de transição entre estados usando `tw-animate-css`

#### Estados visuais das fases

| Estado | Visual |
|---|---|
| `processing` | Card com skeleton + spinner + texto "Processando..." |
| `awaiting_action` | Card com borda `--primary` em destaque + badge "Aguardando você" + CTA em evidência |
| `completed` | Card colapsado com badge "Concluído" + resumo de 1 linha + botão expandir |
| `error` | Card com borda `--danger` + mensagem de erro + botão "Tentar novamente" |

---

#### Fase 1 — Escolha de ideia (`carousel-ideas-step.tsx`)

**Estado `awaiting_action`:**
- Título "Escolha uma ideia para o seu carrossel"
- Grid de cards (2 colunas em desktop, 1 em mobile)
- Cada card: título em destaque + descrição + borda hover + cursor pointer
- Clique em um card → seleciona visualmente (borda accent + check icon) + confirma imediatamente (sem botão extra)
- Feedback de loading após seleção enquanto o agente avança

**Estado `completed`:**
- Colapsado: "Ideia escolhida: [título da ideia]"

---

#### Fase 2 — Aprovação de conteúdo (`carousel-content-step.tsx`)

**Estado `awaiting_action`:**
- Título "Revise o conteúdo dos slides"
- Subtítulo com instrução curta sobre edição
- Lista vertical de cards de slide, cada um com:
  - Header: número do slide + badge do tipo (ex: "Texto", "Texto + Imagem")
  - Conteúdo em modo visualização por padrão
  - Botão "Editar" → modo edição com `markdown-editor.tsx` por campo (title, body, callToAction)
  - Botão "Salvar" e "Cancelar" no modo edição
- Espaçamento `gap-4` entre cards de slide
- Ações globais (sticky no bottom ou no final da lista):
  - **Botão "Aprovar"** (primário) — envia os slides com edições aplicadas
  - **Botão "Regenerar"** (outline) — rejeita e solicita novo conteúdo; exibe confirmação antes

**Estado `completed`:**
- Colapsado: "Conteúdo aprovado — [N] slides"

---

#### Fase 3 — Plano de design + imagens (`carousel-design-plan-step.tsx`)

**Estado `awaiting_action`:**
- Título "Revise o plano de design"
- Lista de cards de slide com:
  - Header: número + badge do tipo + nome da variação escolhida (ex: "Variação 2")
  - Notas de layout da IA em modo visualização
  - Botão "Editar notas" → textarea livre para ajustar as notas de layout
  - Badge "Precisa de imagem" em destaque quando `needsImage: true`

- **Seção de upload de imagens** (exibida apenas se houver slides com `needsImage: true`):
  - Título "Imagens necessárias"
  - Grid de slots, um por slide que precisa de imagem
  - Cada slot: número do slide + `imageSlot` label (ex: "foto do produto") + área de upload (drag-and-drop + click)
  - Thumbnail preview após upload com botão de remover
  - Counter "X de Y imagens enviadas"
  - Upload via presigned PUT S3 (mesmo padrão do agente de cortes)

- Botão "Aprovar" desabilitado até todos os slots de imagem estarem preenchidos
- Ações:
  - **Botão "Aprovar"** (primário)
  - **Botão "Regenerar plano"** (outline) — com confirmação

**Estado `completed`:**
- Colapsado: "Plano de design aprovado — [N] slides, [X] imagens"

---

#### Fase 4 — Preview e exportação (`carousel-preview-step.tsx`)

**Estado `completed` (fase final):**
- Título "Seu carrossel está pronto"
- Grid de iframes, um por slide, renderizando o HTML+CSS gerado
  - Cada iframe tem label "Slide [N]" + badge do tipo
  - Aspect ratio correto para a rede social (ex: 1:1 para Instagram)
  - Scroll horizontal em mobile com snap
- Botão **"Exportar como imagens"** (primário):
  - Dispara geração de PNGs no backend (se não gerados ainda)
  - Loading state com spinner e texto "Gerando imagens..."
  - Após conclusão: botão muda para "Baixar ZIP" → download zip com todos os PNGs nomeados (ex: `carousel-slide-01.png`)
- Badge com a rede social escolhida
- Botão "Novo carrossel" (outline) → abre `CarouselRunModal`

---

### Settings page (`carousel-settings-page.tsx`)

Componente `CarouselSettingsForm`:

| Campo | Tipo | Detalhe |
|---|---|---|
| Quantidade padrão de slides | Slider (3–15) | Pré-preenche o modal de novo run |
| Template padrão | Select | Apenas templates resgatados pelo workspace |
| Redes sociais padrão | Checkbox group com ícones | Instagram ativo; Facebook/TikTok com badge "Em breve" |
| Imagens geradas por IA | Toggle desabilitado | Badge "Em breve" ao lado do label |

- RHF + zodResolver, autosave com debounce ou botão "Salvar"
- Feedback de sucesso inline (sem toast intrusivo)

---

## Permissões

Nenhuma permissão nova — reutiliza chaves existentes:

| Ação | Permissão CASL |
|---|---|
| Iniciar geração | `generation.create` |
| Aprovar/rejeitar etapas | `agentRun.review` |
| Visualizar runs | `agentRun.read` |
| Resgatar template | `marketplace.redeem` |

Frontend usa `<PermissionGate>` e `useAbility()` nas ações relevantes.

---

## Estrutura de diretórios completa

### Frontend (`apps/web`)

```
src/core/modules/agents/
├── pages/
│   ├── carousel-overview-page.tsx
│   ├── carousel-run-detail-page.tsx
│   └── carousel-settings-page.tsx
├── hooks/
│   ├── use-carousel-run-modal.ts
│   ├── use-carousel-runs.ts
│   ├── use-carousel-run-detail.ts
│   └── use-carousel-settings.ts
└── components/carousel/
    ├── carousel-run-modal.tsx
    ├── carousel-run-modal-provider.tsx
    ├── carousel-run-status-modal.tsx
    ├── carousel-source-step.tsx
    ├── carousel-runs-grid.tsx
    ├── carousel-run-card.tsx
    ├── carousel-ideas-step.tsx
    ├── carousel-content-step.tsx
    ├── carousel-design-plan-step.tsx
    └── carousel-preview-step.tsx
```

### Backend (`apps/api`)

```
src/agents/carousel/
├── agent.ts
├── build-carousel-run-deps.ts
├── templates/
│   └── minimal-clean/
│       ├── manifest.json
│       ├── instructions.md
│       └── slides/
│           ├── start/v1/
│           ├── text/v1/ v2/ v3/
│           ├── text-image/v1/ v2/ v3/
│           └── image/v1/ v2/
├── steps/
│   ├── generate-ideas.step.ts
│   ├── generate-content.step.ts
│   ├── generate-design-plan.step.ts
│   ├── generate-slides.step.ts
│   ├── render-slides.step.ts
│   └── finalize-carousel.step.ts
├── services/
│   ├── carousel-template.service.ts
│   └── carousel-render.service.ts
├── schemas/
│   └── carousel-schemas.ts
├── prompts/
│   ├── ideas.prompt.ts
│   ├── content.prompt.ts
│   ├── design-plan.prompt.ts
│   └── slides.prompt.ts
└── learning/
    └── feedback-handler.ts
```

### Tipos (`packages/types`)

```
src/agents/
└── carousel.ts
```

---

## Padrões de UX e design system

- **Componentes base:** `Button`, `Dialog`, `Badge`, `StatusModal`, `Slider`, `Select`, `Textarea`, `Progress`, `EmptyState` — todos do `core/shared/components/ui/`
- **Animações:** `tw-animate-css` em todas as transições de estado de fase (fade-in ao revelar nova fase, scale ao selecionar card de ideia)
- **Espaçamento:** `gap-6` entre fases do wizard, `gap-4` entre cards dentro de cada fase
- **Tipografia:** `Heading` e `Paragraph` com tones semânticos (primary/secondary/tertiary)
- **Upload:** mesmo padrão de presigned PUT S3 do agente de cortes
- **Loading states:** skeletons nos cards antes dos dados chegarem, spinner inline em botões durante submissão
- **Responsividade:** grids colapsam para 1 coluna em mobile; iframes do preview com scroll horizontal snap

---

## Plano 2 (frontend sem API)

Conforme regra 18 do CLAUDE.md, a implementação frontend usa **fixtures + estado local**. Sem chamadas reais à API até o Plano 3.

- Hooks usam fixtures estáticas simulando os estados de cada fase
- `use-carousel-run-detail.ts` simula progresso das fases com estado local
- Modal de configuração simula submissão com timeout
- Upload de imagens usa mock URL

---

## O que está fora do escopo desta spec

- Geração de imagens por IA (`aiGeneratedImages`) — reservado para fase futura
- Facebook e TikTok como redes sociais ativas — UI pronta, lógica desabilitada
- Múltiplos templates simultâneos por run — cada run usa um único template
- Edição do carrossel após a geração final
