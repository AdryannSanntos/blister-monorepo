# Frontend Skill — Blister OS

> Fonte: [`blister-os-prd.md`](../prd/blister-os-prd.md) · [`blister-os-reference.md`](../design-system/blister-os-reference.md) · Plano 2: [`02-frontend.md`](../plans/blister-os/02-frontend.md)

## Objetivo

Implementar UI OS em `apps/web` espelhando `blister-os-reference.html`.

## Plano 2 — zero integração (obrigatório)

| Permitido | Proibido |
|-----------|----------|
| Fixtures TS/JSON, Zustand, localStorage | `axios`, `fetch`, `apiClient` para produto |
| TanStack Query `queryFn` síncrono sobre fixtures | MSW → API real |
| `setTimeout` simulando loading | Hooks que importam `services/*` reais |

Marcar contratos futuros: `// CONTRACT: docs/plans/blister-os/03-backend.md#...`

## Estrutura

```
apps/web/src/core/modules/<feature>/
  pages/
  components/
  hooks/
  fixtures/          ← Plano 2
```

Módulos OS: `home`, `agents`, `marketplace`, `library`, `projects`, `files`, `settings`, `shell`

## Rotas

Ver mapa em `blister-os-reference.md`. **Não** criar `/dashboard/brand`.

## Regras UI

- Sidebar NAV = reference
- `gap-6` / `gap-4`, `tw-animate-css`
- Typography: `Display`, `Heading`, `Paragraph`
- Copy video-first — sem "Cérebro da Marca", "peça", "agente"

## Codificação

Zod · RHF · nuqs · Server Components default · Playwright smoke rotas OS

## Fixtures globais (copiar padrão reference)

`MKT_ITEMS`, `AGENTS`, `PROJECTS`, `FILES`, `owned`, `credits`

## Plano 3

Substituir fixtures por hooks TanStack Query — um módulo por vez.
