# Skills / Commands de desenvolvimento

O projeto define **skills de desenvolvimento** como slash commands em `.claude/commands/` (e espelhadas em `.opencode/agents/` para o OpenCode). Cada uma carrega as convenções de um domínio para guiar implementação e revisão.

> ⚠️ **Atenção:** alguns commands têm trechos **desatualizados** de antes do pivô para Blister (citam `company.*`, `brain.*`, `orgId`, "organization"). A fonte de verdade do estado atual é o código (`packages/authz`, schema Prisma) e os docs em `docs/project/`. Ao usar uma skill, confie no código atual, não em tabelas antigas dentro do command.

## Skills disponíveis

| Command | Papel | Quando usar |
|---------|-------|-------------|
| `/context` | Agente estratégico de produto. Lê `CLAUDE.md`, stack, `packages/authz`, `docs/prd`, `docs/decisions`, `docs/skills` antes de responder. | Decisões de produto, priorização, dúvida sobre intenção. |
| `/backend` | Especialista em `apps/api`. Padrão de módulo NestJS, regra de permissão universal, Prisma, Zod. | Implementar/revisar endpoint, service, migration. |
| `/frontend` | Especialista em `apps/web`. Estrutura de módulos, hooks, api-client, PermissionGate. | Implementar/revisar tela, hook, integração. |
| `/design` | Design system. Tokens Tailwind v4, shadcn `new-york`, ícones lucide 16, dark default. | Qualquer UI; garantir tokens e animações. |
| `/authz` | Catálogo de permissões, roles e padrões de autorização. | Adicionar/alterar permissão; revisar guards. |
| `/review` | Code review. Ordem: segurança/permissões → contratos → arquitetura → design → qualidade. | Revisar um diff/PR. |

## Protocolo do `/context` (leitura obrigatória)

Antes de qualquer resposta substantiva sobre produto, lê nesta ordem:

1. `CLAUDE.md`
2. `package.json` (raiz + apps) — stack real
3. `packages/authz/src/index.ts` — catálogo de permissões
4. `docs/prd/*` — intenção de produto
5. `docs/decisions/*` — decisões passadas
6. `docs/skills/*` — convenções

## Regras que toda skill reforça

- **Permissão em tudo** (backend `@RequirePermission`, frontend `<PermissionGate>`).
- `userId` de `req.currentUser.id`; ids de recurso de `req.params`; **nunca** do body.
- `@Public()` explícito para endpoints públicos.
- Nova permissão → `packages/authz` primeiro.
- Prisma é o único cliente de banco.
- Dados em `<DataTable>` com sort/filtros/seleção/export.
- Simplicidade radical (máx. 2–3 campos para iniciar).
- Tokens de design, animações (`tw-animate-css`) e espaçamento padronizado sempre.

## Skills do ambiente (superpowers)

Além dos commands do projeto, o ambiente Claude Code expõe skills de processo (ex: `brainstorming`, `writing-plans`) usadas para transformar ideias em specs e planos de implementação. Specs vão para `docs/superpowers/specs/`, planos para `docs/superpowers/plans/`.
