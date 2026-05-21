# Skill de Code Review — Workana AI

Faça a revisão do código usando os critérios abaixo. Findings primeiro, resumo depois.

---

## Ordem de análise

1. Segurança e permissões (crítico)
2. Contratos e dados (alto)
3. Arquitetura e stack (médio)
4. Design system e UI (baixo/visual)
5. Qualidade e manutenibilidade (observação)

---

## Checklist crítico — Segurança e permissões

**Backend:**
- [ ] Todo endpoint de mutação tem `@RequirePermission(key)` com chave válida
- [ ] Endpoints sem `@RequirePermission` têm justificativa clara
- [ ] Endpoints públicos têm `@Public()` explícito
- [ ] `userId` vem de `req.currentUser.id` — nunca de `req.body.userId`
- [ ] `orgId` vem de `req.params` — nunca do body
- [ ] Dados de um usuário não acessíveis por outro sem verificação de membership

**Frontend:**
- [ ] Toda ação de escrita/exclusão dentro de `<PermissionGate permission="...">`
- [ ] Nenhuma lógica de permissão hardcoded — sempre via `useAbility()` ou `PermissionGate`

---

## Checklist alto — Contratos e dados

- [ ] Nova permissão declarada em `packages/authz` antes de usar em guard ou PermissionGate
- [ ] Nenhuma permissão hardcoded fora de `packages/authz/src/index.ts`
- [ ] DTOs validados com Zod antes de passar ao service (backend)
- [ ] Formulários com `zodResolver` e `mode: 'onBlur'` (frontend)
- [ ] Tipos inferidos do schema Zod — sem `any` sem justificativa
- [ ] Invariantes de negócio respeitadas:
  - Não remove último owner
  - Não remove último role de membro
  - `onboarding.publish` não é assignable

---

## Checklist médio — Arquitetura e stack

- [ ] Nenhuma biblioteca nova sem decisão registrada
- [ ] `Prisma` é o único acesso a banco
- [ ] `better-auth` trata apenas auth/sessão
- [ ] `generated/prisma` não foi editado manualmente
- [ ] Lógica de negócio no service, não no controller (backend)
- [ ] Nenhuma chamada HTTP direta em page/component — hook com React Query (frontend)
- [ ] `activeOrgId` de `useActiveOrganization()`, não de sessão better-auth (frontend)
- [ ] Estrutura `core/modules` e `core/shared` respeitada (frontend)

---

## Checklist baixo — Design system

- [ ] Tokens de design system usados (`var(--fg-*)`, `var(--bg-*)`, etc.)
- [ ] Sem cores raw onde há token equivalente
- [ ] `Button` padrão `md`; dentro de card → `variant="ghost"`
- [ ] Raiz do `Card` sem padding
- [ ] Três ou mais ações lado a lado → `DropdownMenu`
- [ ] Modais com header + content + footer separados
- [ ] Sem `font-semibold` amplo — máximo `font-medium`
- [ ] Sem glow em cards
- [ ] `AvatarFallback` com iniciais, borda e fundo sutil

---

## Severidade dos achados

**Bloqueia merge:**
- Endpoint de mutação sem guard de permissão
- `userId` lido do body
- Nova permissão hardcoded fora de `packages/authz`
- Acesso ao banco fora do PrismaService
- Role de sistema sendo deletada/renomeada

**Deve corrigir antes do merge:**
- Ação de UI sem `PermissionGate`
- Fetch direto em componente (sem hook de domínio)
- DTO sem validação Zod
- Tipo `any` sem justificativa

**Observação/tech debt:**
- Token de design system ignorado
- Lógica complexa no controller
- Ausência de testes para caminho de erro crítico

---

## Formato de saída

Para cada finding: arquivo + risco concreto + correção recomendada.
Resumo curto no final apenas se houver mais de 5 findings.
