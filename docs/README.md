# AI Company OS Docs

Esta pasta concentra a documentacao viva do monorepo e substitui referencias genericas por contexto real do produto, da stack e do estado atual da implementacao.

## Estrutura

- `context/`: estado atual do projeto, limites tecnicos e responsabilidades por app/pacote
- `prd/`: PRD alinhado ao produto e analises de aderencia entre visao e implementacao atual
- `plans/`: planos de implementacao aprovados para epicos e fundacoes do produto
- `decisions/`: decisoes arquiteturais e padroes obrigatorios da stack
- `design-system/`: tokens, componentes, padroes visuais e mapa da rota `/design-system`
- `examples/`: referencias de codigo e exemplos removidos da interface principal, preservados para consulta
- `setup/`: setup local, scripts e proximos passos da fundacao
- `skills/`: skills operacionais para IA trabalhar no projeto com contexto e padroes corretos

## Leitura Recomendada

1. `docs/prd/ai-company-os-prd.md`
2. `docs/prd/prd-gap-analysis.md`
3. `docs/prd/2026-05-14-auth-org-onboarding-foundation-prd.md`
4. `docs/context/2026-05-13-monorepo-foundation-design.md`
5. `docs/decisions/stack-decisions.md`
6. `docs/plans/2026-05-14-auth-org-onboarding-foundation-plan.md`
7. `docs/design-system/README.md`
8. `docs/skills/README.md`
9. `docs/setup/local-development.md`

## Regra Geral

Quando houver divergencia entre uma expectativa de produto e o codigo atual, a documentacao deve deixar isso explicito. Este repositorio ainda esta na fase de fundacao tecnica e nao contem os modulos finais de negocio descritos no PRD.

O mesmo vale para o design system: a referencia final deve refletir primeiro o codigo real do `apps/web` e a rota `/design-system`.

No frontend, a prioridade deve ser sempre encapsular comportamento em hooks antes de espalhar logica em paginas ou componentes. Requisicoes de dados devem usar `TanStack Query` como regra padrao do projeto.
