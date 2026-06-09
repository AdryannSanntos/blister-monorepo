# Code Review Skill — Blister

> Alinhado a [`.claude/commands/review.md`](../../.claude/commands/review.md) e [`CLAUDE.md`](../../CLAUDE.md) (Regra 17)

## Objetivo

Guiar a revisão de código com foco em segurança, permissões, contratos, stack oficial e **UX**.

## Regras de codificação (bloqueiam merge se violadas)

| Regra | Esperado |
|-------|----------|
| Zod | **Sempre** — DTOs, formulários, outputs de IA |
| TanStack Query | Todo dado de servidor via hooks de domínio |
| RHF | Todo formulário com `zodResolver` |
| nuqs | Filtros, tabs, paginação na URL |
| Componentes | `core/modules/<modulo>/components/` ou `core/shared/` |
| Server Components | Padrão; client só quando necessário |
| zustand | Estado global de UI — não substituir Query |
| Playwright | Fluxos UX críticos com cobertura e2e |

## Ordem de Análise

1. Segurança e permissões (crítico)
2. Contratos e dados (alto)
3. Arquitetura e stack (médio)
4. Design system e UX (médio)
5. Qualidade e manutenibilidade (observação)

## Checklist Crítico — Segurança

**Backend:**
- [ ] `@RequirePermission` em mutações
- [ ] `@Public()` explícito em endpoints públicos
- [ ] `userId` de `req.currentUser.id` — nunca do body
- [ ] IDs de recurso de `req.params`
- [ ] `companyId` scope validated

**Frontend:**
- [ ] `<PermissionGate>` em ações sensíveis
- [ ] Permissões via `useAbility()` — não hardcoded

## Checklist Alto — Contratos

- [ ] Zod em toda fronteira (backend + frontend)
- [ ] RHF + zodResolver em formulários
- [ ] Tipos inferidos de Zod — sem `any` arbitrário
- [ ] Permissões novas em `packages/authz` primeiro

## Checklist Médio — Stack

**Frontend:**
- [ ] TanStack Query — zero fetch em page/component
- [ ] nuqs para filtros/tabs/paginação
- [ ] Server Components por padrão
- [ ] Componentes no módulo correto
- [ ] zustand só para UI global

**Backend:**
- [ ] Lógica no service, não no controller
- [ ] Prisma único acesso a banco

## Checklist UX — Playwright

- [ ] Fluxo crítico afetado tem spec e2e
- [ ] Tabs/filtros testáveis via URL (nuqs)
- [ ] Estados erro/vazio/permissão cobertos quando aplicável

## Severidade

**Bloqueia merge:** mutação sem permissão · userId do body · sem Zod · fetch direto · componente fora do módulo

**Deve corrigir:** formulário sem RHF · filtros sem nuqs · fluxo UX crítico sem Playwright · client desnecessário

## Formato de Saída

Findings primeiro (arquivo + risco + correção), resumo curto se > 5 findings.
