# Agente MVP: Carrossel Automático

> **Superseded by:** [`../../carousel/README.md`](../../carousel/README.md) — canonical spec for Plano 3 implementation (templates, imageSlots, API integration).

**ID:** `carousel`  
**Tier:** Default (signup) — proposto para MVP  
**SDK:** `packages/agent-sdk/src/agents/carousel/`  
**UI label:** Carrossel automático  
**Rota:** `/dashboard/agents/carousel`  
**Permissão run:** `generation.create`

---

## Responsabilidade

Gerar um **carrossel pronto para Instagram/LinkedIn** a partir de um tema curto e do contexto do workspace — slides visuais + legendas por slide, aplicando um **Post Style** da Biblioteca.

Substitui o fluxo legado MEI (`designer` + `post` com `postFormat: carousel`) por um agente isolado video-OS-friendly.

---

## Estado atual vs alvo

| Aspecto | Hoje | Alvo MVP |
|---------|------|----------|
| Agente dedicado | ❌ Não existe | `carousel` registrado no SDK + API |
| UI | Sugestões de texto em i18n legado; Post Style `ps-carrossel` só no proto HTML | Wizard 3 passos com preview de slides |
| Output | — | PNGs por slide (Satori) + JSON de legendas |
| Marketplace | `post-style` tipo item | Post Style **consumido** pelo agente, não é o agente |

---

## Entrada do usuário (máx. 3 campos)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `topic` | string (textarea) | Sim | Tema ou mensagem do carrossel (ex.: "5 erros ao gravar Reels") |
| `postStyleId` | string | Sim | ID do Post Style **owned** na Biblioteca |
| `slideCount` | number (3–10) | Não | Default: inferido pelo estilo ou 5 |

**Não perguntar na UI:** rede social (fixo Instagram 1080×1080 no MVP), objetivo detalhado, hashtags em formulário longo — o LLM infere do contexto do workspace.

---

## Workflow (SDK)

```
retrieve_context
    → workspace settings + files extract + AGENT_LEARNING (carousel)
plan_slides (LLM)
    → estrutura: título por slide + bullet + nota visual
apply_post_style
    → tokens do Post Style (fontes, cores, layout)
render_slides (image pipeline — Satori/HTML→PNG)
    → um PNG 1080×1080 por slide
validate_output
    → Zod contra outputSchema
format_output
    → blocos SSE para UI (preview + download)
```

### Steps detalhados

| Step key | Tipo | Crédito |
|----------|------|---------|
| `retrieve_context` | `retrieve_context` | — |
| `plan_slides` | `generate_*` (LLM) | Sim |
| `apply_post_style` | transform | — |
| `render_slides` | `generate_*` (image) | Sim (por slide ou batch) |
| `validate_output` | validation | — |
| `format_output` | output | — |

**Pause opcional:** se `slideCount` não informado e estilo exige confirmação, step `PAUSED` com formulário "Quantos slides?" (padrão clarification do SDK).

---

## Output schema (Zod)

```typescript
{
  format: "carousel";
  postStyleId: string;
  topic: string;
  slides: {
    index: number;
    title: string;
    body: string;
    imageUrl: string;      // PNG no S3
    altText?: string;
  }[];
  caption: string;         // legenda principal do post
  hashtags?: string[];
}
```

---

## Contexto e RAG

| Fonte | Uso |
|-------|-----|
| `WORKSPACE_SETTINGS` | Voz, nicho, paleta, posicionamento |
| `FILE_EXTRACT` | PDFs, docs, transcrições como matéria-prima do tema |
| `AGENT_LEARNING` | Slides aprovados/rejeitados, comprimento preferido, tom |

Sem cross-tenant. `workspaceId` sempre do header — nunca do body.

---

## Learning (`learning/feedback-handler.ts`)

Indexar no RAG quando usuário:

- **Aprova** — estrutura de slides + tom + hashtags usadas
- **Rejeita** — motivo + o que evitar
- **Edita** slide ou legenda — diff como exemplo positivo

Aprende:

- Número ideal de slides por nicho
- Ganchos de primeiro slide que foram aprovados
- Densidade de texto por slide (mínimo vs editorial)

---

## UI (Plano 2 → Plano 3)

### Wizard — 3 passos

1. **Tema** — textarea única + contador de caracteres
2. **Estilo** — grid de Post Styles owned (`MarketplaceStyleThumb`); badge "Grátis" / owned
3. **Resultado** — carrossel horizontal com preview; editar texto por slide; copiar legenda; exportar ZIP de PNGs

### Componentes

- `BlisterStepper`
- `MarketplaceStyleThumb` (tipo `post-style`)
- `BlisterChipRow` para hashtags
- Revisão inline: Aprovar / Pedir ajuste / Editar slide

### i18n (PT-BR)

- Título página: **Carrossel automático**
- CTA primário: **Gerar carrossel**
- Evitar: "agente", "prompt", "designer"

---

## Créditos (estimativa)

| Step | Custo relativo |
|------|----------------|
| `plan_slides` | ~0.3 créditos |
| `render_slides` | ~0.2 × número de slides |

`estimatedCreditCost` no catálogo: **~1.5** (5 slides).

---

## Revisão pós-run

| Endpoint | Ação |
|----------|------|
| `POST .../runs/:runId/approve` | Indexa learning positivo |
| `POST .../runs/:runId/reject` | Indexa learning negativo |
| `PATCH .../runs/:runId/output` | Edição de slide → re-render opcional (run filha ou step manual) |

---

## Dependências

| Dependência | Motivo |
|-------------|--------|
| Post Style na Biblioteca | Layout visual dos slides |
| Satori + storage S3 | Render PNG |
| `packages/agent-sdk` image step | `createImageGenerationStep` ou pipeline HTML |
| Configurações preenchidas | Qualidade de copy alinhada à marca |

---

## O que este agente NÃO faz

- Publicar no Instagram (Fase 3+ / integrações)
- Gerar vídeo Reels (ver `reels_script` + `video_editor`)
- Disparar `script` ou `cuts` automaticamente após o carrossel
- Usar módulo Brand Brain (`/dashboard/brand`)

---

## Checklist de implementação

- [ ] Pasta SDK `agents/carousel/` com `agent.ts`, `schemas/`, `prompts/`, `learning/feedback-handler.ts`
- [ ] Seed Post Style "Carrossel Editorial" (`ps-carrossel` no proto)
- [ ] Rota Next.js + `carousel-generation.tsx` (Plano 2 fixture)
- [ ] Registrar em `agent-catalog.ts` + AI catalog admin
- [ ] Playwright smoke: tema → estilo → preview slides
- [ ] Atualizar `docs/agents/README.md` com entrada `carousel`
