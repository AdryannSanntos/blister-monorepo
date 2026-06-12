# Agente MVP: Roteiro para Reels

**ID:** `reels_script`  
**Tier:** Default (signup) — proposto para MVP  
**Relação:** especialização do agente genérico `script` (marketplace no PRD OS)  
**SDK:** `packages/agent-sdk/src/agents/reels_script/`  
**UI label:** Roteiro para Reels  
**Rota:** `/dashboard/agents/reels-script`  
**Permissão run:** `generation.create`

---

## Responsabilidade

Produzir **roteiro curto pronto para gravar** — gancho, desenvolvimento em blocos de tempo, falas na voz do workspace, texto na tela e CTA — otimizado para **15–90 segundos** (Instagram Reels, TikTok, YouTube Shorts).

Não grava nem edita vídeo; entrega texto estruturado que o creator lê na câmera ou envia ao Editor de Vídeo manualmente.

---

## Estado atual vs alvo

| Aspecto | Hoje | Alvo MVP |
|---------|------|----------|
| Agente | `script` no catálogo OS (marketplace); UI `BriefAgentGeneration` genérica | `reels_script` com formulário e output específicos |
| Input | Brief livre | Tema + duração alvo (2 campos) |
| Output | Mock string única | Roteiro com timecodes + overlays + CTA |
| Integração | Fixture Zustand | `POST /api/agents/reels_script/run` + SSE |

---

## Entrada do usuário (máx. 2–3 campos)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `topic` | string | Sim | Assunto do Reels (ex.: "como organizar gravação em batch") |
| `targetDurationSec` | enum `15 \| 30 \| 60 \| 90` | Sim | Duração alvo — default `30` |
| `sourceFileId` | string | Não | Vídeo/áudio em Arquivos para basear o roteiro na transcrição |

**Regra de simplicidade:** não exibir seletor de plataforma no MVP — o prompt interno assume vertical 9:16.

---

## Workflow (SDK)

```
retrieve_context
    → settings + files + learning (reels_script)
ingest_source (condicional)
    → se sourceFileId: transcrição / extract do arquivo
generate_reels_script (LLM)
    → roteiro com timecodes e overlays
validate_output
format_output
```

### Steps detalhados

| Step key | Tipo | Crédito |
|----------|------|---------|
| `retrieve_context` | `retrieve_context` | — |
| `ingest_source` | tool / skip se sem arquivo | — |
| `generate_reels_script` | `generate_*` (LLM) | Sim |
| `validate_output` | validation | — |
| `format_output` | output | — |

**Routing condicional:** pular `ingest_source` quando `sourceFileId` ausente (SDK `routing`).

---

## Output schema (Zod)

```typescript
{
  format: "reels";
  topic: string;
  targetDurationSec: number;
  hook: string;                    // primeiros 3s — falado
  sections: {
    startSec: number;
    endSec: number;
    spoken: string;                // fala do creator
    onScreenText?: string;         // texto na tela
    bRollSuggestion?: string;      // sugestão visual
  }[];
  cta: string;
  captionsDraft?: string;          // legenda para publicação
  estimatedDurationSec: number;
}
```

---

## Contexto e RAG

| Fonte | Uso |
|-------|-----|
| `WORKSPACE_SETTINGS` | Voz, público, proibições de tom, CTAs recorrentes |
| `FILE_EXTRACT` | Transcrição de live/podcast para recortar ideias |
| `AGENT_LEARNING` | Hooks aprovados, ritmo, comprimento de frase |

---

## Learning (`learning/feedback-handler.ts`)

Indexar:

- Hooks aprovados vs rejeitados (primeiros 3s)
- Duração real preferida vs pedida
- CTAs que converteram (feedback explícito do usuário)
- Edições em `spoken` e `onScreenText`

---

## UI (Plano 2 → Plano 3)

### Superfície — brief + entregas (estilo `AgentPage` do proto)

1. **Formulário**
   - Tema (textarea)
   - Duração (chips: 15s / 30s / 60s / 90s)
   - Opcional: "Usar arquivo" → picker de Arquivos (vídeo/áudio com extract)

2. **Resultado**
   - Timeline vertical com blocos por timecode
   - Copiar roteiro completo / copiar só gancho / copiar legenda
   - Botão secundário: "Abrir no Editor de Vídeo" → navega para `video_editor` **sem** passar output automaticamente (usuário cola ou seleciona arquivo)

3. **Revisão**
   - Aprovar / Ajustar tom / Editar bloco inline

### i18n

- Título: **Roteiro para Reels**
- CTA: **Gerar roteiro**
- Evitar: "escrever script", "prompt", "LLM"

---

## Créditos

| Step | Custo relativo |
|------|----------------|
| `generate_reels_script` | ~0.4–0.8 conforme duração e tamanho do contexto |

`estimatedCreditCost` no catálogo: **~0.6**.

---

## Revisão pós-run

Mesmo contrato dos demais agentes:

- `approve` → learning positivo (hook + estrutura)
- `reject` → learning negativo com motivo
- `PATCH output` → edição de seções; opcional re-run só do bloco editado (fase 2)

---

## Relação com `script` (marketplace)

| | `script` (OS) | `reels_script` (MVP) |
|---|---------------|----------------------|
| Formato | Roteiros genéricos (YouTube longo, aula) | Vertical curto com timecodes |
| Tier PRD | Marketplace | Default no MVP |
| SDK | Pode compartilhar prompts base em `packages/agent-sdk/src/agents/_shared/script/` | Especialização |

**Decisão de implementação:** manter IDs separados no registry; extrair prompt utilities compartilhadas no SDK, sem `if (agentId)` na API.

---

## O que este agente NÃO faz

- Gerar vídeo ou cortes automaticamente
- Disparar `video_editor` ou `cuts` em pipeline
- Publicar no TikTok/Instagram
- Substituir pesquisa de tendências (`research` — agente complementar)

---

## Checklist de implementação

- [ ] SDK `agents/reels_script/` completo
- [ ] UI dedicada (não reutilizar só `BriefAgentGeneration`)
- [ ] Entrada em `AGENTS_CATALOG` + nav grupo Conteúdo
- [ ] Smoke Playwright: tema + 30s → timeline visível
- [ ] Decisão documentada: `reels_script` default vs `script` marketplace no PRD
