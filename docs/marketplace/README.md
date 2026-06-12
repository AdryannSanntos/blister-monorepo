# Marketplace — Blister OS

> Catálogo de itens resgatáveis e compráveis com **créditos**.  
> PRD: [`docs/prd/blister-os-prd.md`](../prd/blister-os-prd.md) · Proto: [`blister-os-reference.html`](../../blister-os-reference.html)

---

## Propósito

O Marketplace estende o SO de conteúdo com **estilos, templates, assets e agentes extras** — sem poluir o signup. Itens resgatados vão para a **Biblioteca** e alimentam wizards (Editor, Cortes) e superfícies de agente.

---

## Tipos de item (`MKT_TYPES`)

| Type ID | Label UI | Uso |
|---------|----------|-----|
| `edit-style` | Edit Style | Presets de edição de vídeo (ritmo, legendas, transições) |
| `post-style` | Post Style | Layouts estáticos / carrossel |
| `pack` | Pack visual | Texturas, LUTs, molduras |
| `template` | Template | Roteiros e sequências (ex.: semana de lançamento) |
| `asset` | Asset criativo | SFX, vinhetas, stickers |
| `agent` | Agente | Desbloqueia agente marketplace na Biblioteca |

---

## Agentes marketplace

| ID | Label | Preço típico |
|----|-------|--------------|
| `planning` | Planejar conteúdo | Grátis ou créditos |
| `script` | Escrever roteiro | Créditos |
| `thumbnail` | Criar thumbnail | Créditos |
| `distribution` | Distribuir | Fase posterior |

Agentes **default** (`research`, `cuts`, `video_editor`) **não** passam pelo Marketplace — já vêm no signup.

---

## Fluxo do usuário

```
Marketplace → filtrar por tipo → Detalhe do item → Resgatar/Comprar
  → créditos debitados (se pago) → item em owned → Biblioteca
  → wizards e agentes consomem item possuído
```

Estado no proto: `localStorage` key `blisteros-owned-v1` + fixture `INITIAL_OWNED`.

---

## Preços

- `price: 0` → **Grátis** — resgate imediato
- `price > 0` → debita créditos do workspace ativo
- Badge: `destaque`, `novo` (opcional)

---

## API (Plano 3 — contrato futuro)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/marketplace/items` | Lista paginada + filtros |
| GET | `/api/marketplace/items/:id` | Detalhe |
| POST | `/api/marketplace/items/:id/redeem` | Resgatar → `LibraryItem` |
| GET | `/api/library` | Itens possuídos pelo workspace |

Permissões: `marketplace.read`, `marketplace.redeem`, `library.read`.

---

## UI

| Tela | Rota | Reference |
|------|------|-----------|
| Marketplace | `/dashboard/marketplace` | `#/marketplace` |
| Detalhe | `/dashboard/marketplace/[itemId]` | `#/item/{id}` |
| Biblioteca | `/dashboard/library` | `#/library` |

Componentes: `StyleThumb`, `PriceBadge`, `OwnBadge`, filtros por `MKT_TYPES`.

---

## Admin (fase posterior)

- CRUD de itens marketplace
- Upload de previews e pacotes de assets
- Habilitar/desabilitar item por ambiente
