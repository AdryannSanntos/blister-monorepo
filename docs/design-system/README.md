# AIBusiness OS Design System

## Objetivo

Consolidar a base visual oficial do `apps/web` usando `shadcn`, `Tailwind CSS 4` e tokens semanticos derivados de `ai-business-design-system.html`.

## Escopo

- app alvo: `apps/web`
- rota viva de referencia: `/design-system`
- tokens globais: `apps/web/src/app/globals.css`
- componentes base: `apps/web/src/core/shared/components/ui`
- showcase principal: `apps/web/src/core/modules/design-system/pages/design-system-page.tsx`

## Principios

- dark-first com paridade real para light theme
- uma cor de acento principal: `OS-Iris`
- alta densidade com respiracao controlada
- IA visivel, nunca espalhafatosa
- componentes reutilizaveis antes de markup paralelo

## Leitura Recomendada

1. `docs/design-system/tokens.md`
2. `docs/design-system/components.md`
3. `docs/design-system/patterns.md`
4. `docs/design-system/usage-rules.md`
5. `docs/design-system/showcase-map.md`

## Fonte de Verdade

O sistema deve ser entendido nesta ordem:

1. codigo implementado em `apps/web`
2. rota `/design-system`
3. documentacao desta pasta
4. referencia visual original `ai-business-design-system.html`
