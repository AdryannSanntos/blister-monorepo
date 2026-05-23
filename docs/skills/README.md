# Habilidades de IA do Projeto

Esta pasta e reservada para skills operacionais que uma IA deve seguir ao trabalhar neste monorepo.

Cada skill traduz o contexto do projeto em instrucoes praticas para execucao consistente.

## Habilidades Disponiveis

- `project-engineering-skill.md`: skill base com regras do monorepo, stack e bibliotecas
- `frontend-skill.md`: skill para implementacoes e refactors no `apps/web`
- `backend-skill.md`: skill para implementacoes e refactors no `apps/api`
- `code-review-skill.md`: skill para revisoes tecnicas com foco em bugs, risco e aderencia
- `design-system-skill.md`: skill para tokens, componentes, variacoes e uso da rota `/design-system`
- `agents-skill.md`: skill para o dominio de agentes — workspace, chat, workflow builder, execucoes, ciclo de vida de versoes e bloqueio quando agente nao esta ativo

## Regra de Uso

Antes de alterar codigo, a IA deve ler primeiro a skill base e depois a skill especifica da tarefa.

Quando uma decisao de arquitetura ou produto for fechada em conversas de planejamento, a documentacao em `/docs` e as skills desta pasta devem ser atualizadas para refletir a decisao aprovada e destacar divergencias temporarias do codigo real.

Quando a tarefa envolver UI, componentes, tokens visuais ou design system, a IA deve ler tambem `design-system-skill.md`.

Quando a tarefa envolver dashboard, cards, sidebar, charts, buttons, modais ou avatares, a IA deve aplicar `docs/design-system/usage-rules.md` antes de criar ou refatorar UI.

Quando a tarefa envolver agentes (chat, workflow builder, execucoes, sidebar do workspace de agente, publicacao/ativacao de versoes), a IA deve ler `agents-skill.md` antes de tocar qualquer arquivo em `apps/web/src/core/modules/agents/**` ou `apps/api/src/agents/**`.
