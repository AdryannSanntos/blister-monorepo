# Code Review Skill

## Objetivo

Guiar a revisão de código neste projeto com foco em segurança, permissões, contratos de domínio e conformidade com a stack oficial.

## Ler Antes

- `docs/skills/project-engineering-skill.md`
- `docs/decisions/stack-decisions.md`

## Ordem de Análise

1. Segurança e permissões (crítico)
2. Contratos e dados (alto)
3. Arquitetura e stack (médio)
4. Design system e UI (baixo/visual)
5. Qualidade e manutenibilidade (observação)

## Checklist Crítico — Segurança e Permissões

**Backend:**
- [ ] Todo endpoint de mutação tem `@RequirePermission(key)` com chave válida de `AppPermissionKey`
- [ ] Endpoints sem `@RequirePermission` têm justificativa clara (são apenas-leitura de dados próprios)
- [ ] Endpoints públicos têm `@Public()` explícito — nunca "implicitamente público por omissão"
- [ ] `userId` vem de `req.currentUser.id` — nunca de body, params externos ou query
- [ ] `orgId` vem de `req.params` — nunca do body
- [ ] Dados de um usuário não acessíveis por outro sem verificação de membership

**Frontend:**
- [ ] Toda ação de escrita/exclusão dentro de `<PermissionGate permission="...">`
- [ ] Nenhuma lógica de permissão hardcoded — sempre via `useAbility()` ou `PermissionGate`
- [ ] Chats e execuções visíveis apenas para autor + owner/admin (quando aplicável)

## Checklist Alto — Contratos e Dados

- [ ] Nova permissão declarada em `packages/authz` antes de usada em guard ou PermissionGate
- [ ] Nenhuma permissão hardcoded fora de `packages/authz/src/index.ts`
- [ ] DTOs validados com Zod antes de passar ao service
- [ ] Formulários com `zodResolver` e `mode: 'onBlur'`
- [ ] Tipos inferidos do schema Zod — sem `any` sem justificativa
- [ ] Contratos de API consistentes entre backend e frontend
- [ ] Invariantes de negócio respeitadas:
  - Não remove o último owner → `ForbiddenException`
  - Não remove o último role de um membro → `ConflictException`
  - `onboarding.publish` não é assignable

## Checklist Médio — Arquitetura e Stack

**Geral:**
- [ ] Nenhuma biblioteca nova sem decisão registrada em `docs/decisions/stack-decisions.md`
- [ ] `Prisma` é o único acesso a banco — sem SQL raw avulso, sem outro ORM
- [ ] `better-auth` trata apenas auth/sessão
- [ ] `generated/prisma` não foi editado manualmente

**Backend:**
- [ ] Lógica de negócio no service, não no controller
- [ ] Controller: parse → guard → delegar ao service → retornar
- [ ] Erros mapeados para exceções HTTP corretas (`NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`)

**Frontend:**
- [ ] Nenhuma chamada HTTP direta em page/component — hook de domínio com React Query
- [ ] Estado de servidor em React Query, não em `useState`
- [ ] `activeOrgId` de `useActiveOrganization()`, não de sessão better-auth
- [ ] Estrutura `core/modules` e `core/shared` respeitada
- [ ] Rotas de chat geral/workflow/agent workspace usam layout full-focus, não dashboard shell

## Checklist Específico — Agentes V1

- [ ] Editar mensagem no chat cria branch de conversa
- [ ] Conversa com execução ativa bloqueia input
- [ ] Timeline de execução tem tentativas no mesmo run
- [ ] Cap de concorrência por empresa (3) + fila FIFO preservados
- [ ] Retrieval de contexto é permission-aware e remove segredos/credenciais
- [ ] Delegação do chat geral mantém resposta no chat principal

## Checklist Baixo — Design System e UI

- [ ] Tokens de design system usados — sem cores raw
- [ ] Componentes importados de `src/core/shared/components/ui/`
- [ ] `Button` padrão `md`; dentro de card → `variant="ghost"`
- [ ] Raiz do `Card` sem padding
- [ ] Três ou mais ações → `DropdownMenu`
- [ ] Modais com header + content + footer separados
- [ ] Sem `font-semibold` amplo — máximo `font-medium`
- [ ] Sem glow em cards
- [ ] `AvatarFallback` com iniciais, borda e fundo sutil — sem fundo primary sólido
- [ ] Sem `dark:` utility — tokens são dark-default

## Severidade dos Achados

### Bloqueia merge (must fix)
- Endpoint de mutação sem guard de permissão
- `userId` lido do body em vez de `req.currentUser`
- Nova permissão hardcoded fora de `packages/authz`
- Acesso ao banco fora do PrismaService
- `better-auth` assumindo responsabilidade de org/membership
- Role de sistema sendo deletada ou renomeada
- Endpoint público sem `@Public()` explícito

### Deve corrigir antes do merge (should fix)
- Ação sensível de UI sem `PermissionGate`
- Fetch direto em componente sem hook de domínio
- DTO sem validação Zod
- Tipo `any` sem justificativa
- Contrato de API divergente entre web e api
- Invariante de negócio violada

### Observação / tech debt (nice to fix)
- Token de design system ignorado em favor de cor raw
- Lógica complexa no controller que deveria estar no service
- Ausência de testes para caminho de erro crítico
- Componente de UI fora da estrutura `core/shared/components/ui`

## Itens Críticos Deste Projeto

- `better-auth` não deve ser contornado
- `better-auth` não deve reassumir responsabilidades de org ativa, roles ou permissões
- Permissões não devem ser hardcoded fora de `packages/authz`
- `Prisma` é o único acesso a banco
- `TanStack Query` não deve ser substituído por estado local para dados de servidor
- `nuqs` deve ser preferido para estado de filtro compartilhável por URL
- A rota `/design-system` deve continuar coerente com o visual de referência e o código real

## Formato de Saída

- Findings primeiro, resumo depois
- Para cada finding: arquivo + risco concreto + correção recomendada
- Ordenar por severidade (crítico → alto → médio → baixo → observação)
- Sem "poderia ser melhorado" sem especificar risco e ação
- Resumo curto apenas se houver mais de 5 findings
