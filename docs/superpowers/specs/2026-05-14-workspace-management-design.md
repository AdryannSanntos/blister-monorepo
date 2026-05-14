# Workspace Management — Design Spec

**Data:** 2026-05-14  
**Escopo:** Equipe, Permissões e Configurações do Workspace  
**Status:** Aprovado

---

## Objetivo

Implementar o gerenciamento completo de membros, convites, cargos e permissões do workspace, com proteção CASL em todos os endpoints do backend e verificações de permissão em toda a UI do frontend.

---

## Regra Central

Toda ação do produto — backend e frontend — deve ter verificação de permissão. Nenhuma feature nasce sem guards no backend e checks de UI. Esta regra está registrada em `docs/decisions/stack-decisions.md`.

---

## Escopo

### Incluído
- Página **Equipe** (`/workspace/team`): lista de membros, convites pendentes, convidar, editar cargos, remover membro
- Página **Permissões** (`/workspace/permissions`): listar cargos, criar cargos customizados, editar permissões, deletar cargos
- Página **Configurações** (`/workspace/settings`): dados gerais da org + zona de perigo (deletar workspace, transferir ownership)
- Guards de autenticação e permissão em todos os endpoints da API
- Hook `useAbility` e componente `<PermissionGate>` no frontend

### Não incluído (próximas fases)
- Integrações externas
- Arquivos e assets

---

## Novas Permissões (`packages/authz`)

| Chave | Ação CASL | Subject | Owner | Admin | Member |
|-------|-----------|---------|-------|-------|--------|
| `member.remove` | `delete` | `Member` | ✅ | ✅ | ❌ |
| `company.delete` | `delete` | `Company` | ✅ | ❌ | ❌ |

---

## Arquitetura de Guards (Backend)

### Pipeline por request

```
Request
  → AuthGuard (global, APP_GUARD)
      • Lê token de cookie "better-auth.session_token" ou "Authorization: Bearer"
      • Consulta tabela Session no Prisma (token + expiresAt)
      • Anexa req.currentUser = { id, name, email }
      • Lança 401 se sessão inválida ou ausente
      • Rotas @Public() são ignoradas
  → PermissionGuard (por endpoint via @RequirePermission('key'))
      • Lê orgId de req.params.orgId
      • Resolve membership + ability via MembershipService.getEffectiveAbility()
      • Verifica ability.can(action, subject)
      • Anexa req.orgContext = { membership, ability } para reuso no handler
      • Lança 403 se sem permissão ou sem membership na org
  → Controller Handler
      • userId vem SEMPRE de req.currentUser.id — nunca do body
```

### Decorators

```typescript
@Public()                              // bypassa AuthGuard
@RequirePermission('member.invite')    // aplica PermissionGuard
```

### Invariantes de segurança (service layer)

- Não pode remover o último `owner` da organização
- Roles de sistema (`isSystem: true`) não podem ser editadas nem deletadas
- `userId` nunca vem do body em operações autenticadas

---

## Novos Endpoints

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/organizations/:orgId/me/ability` | auth | Retorna permissões efetivas do usuário |
| `DELETE` | `/organizations/:orgId/members/:membershipId` | `member.remove` | Remove membro |
| `DELETE` | `/organizations/:orgId` | `company.delete` | Deleta workspace |
| `POST` | `/organizations/:orgId/transfer` | `company.delete` | Transfere ownership |

### Endpoints existentes com guards adicionados

Todos os endpoints de `/organizations/:orgId/*` recebem `AuthGuard` + `@RequirePermission` conforme tabela:

| Endpoint | Permissão |
|----------|-----------|
| `GET /organizations/:orgId/members` | `member.read` |
| `POST /organizations/:orgId/members/:id/roles/:roleId` | `member.update` |
| `DELETE /organizations/:orgId/members/:id/roles/:roleId` | `member.update` |
| `POST /organizations/:orgId/members/:id/overrides` | `member.update` |
| `DELETE /organizations/:orgId/members/:id/overrides/:key` | `member.update` |
| `GET /organizations/:orgId/invitations` | `member.read` |
| `POST /organizations/:orgId/invitations` | `member.invite` |
| `POST /organizations/:orgId/invitations/:id/cancel` | `member.invite` |
| `POST /organizations/:orgId/invitations/:id/accept` | `@Public()` |
| `GET /organizations/:orgId/roles` | `role.read` |
| `POST /organizations/:orgId/roles` | `role.create` |
| `PUT /organizations/:orgId/roles/:roleId` | `role.update` |
| `DELETE /organizations/:orgId/roles/:roleId` | `role.delete` |
| `GET /organizations/:orgId` | `company.read` |
| `PATCH /organizations/:orgId` | `company.update` |

---

## Frontend

### `useAbility()` hook

- Chama `GET /organizations/:orgId/me/ability`
- Reconstrói `AppAbility` CASL no cliente com `defineAbilityForPermissions`
- Cacheado via React Query (stale: 5min)
- Invalida ao trocar de org ativa

### `<PermissionGate>` component

```tsx
<PermissionGate permission="member.invite">
  <Button>Convidar</Button>
</PermissionGate>
```

Renderiza `children` só se `can(action, subject)`. Fallback opcional (padrão `null`).

### Página Equipe (`/workspace/team`)

- `DataTable`: avatar, nome, email, badges de cargos, data de entrada, menu de ações
- Ações por linha: editar cargos (`member.update`), remover (`member.remove`)
- Header: botão "Convidar membro" (`member.invite`) → `CreateInviteDialog` (email + dropdown de cargo)
- Aba de convites: lista com status e botão cancelar (`member.invite`)

### Página Permissões (`/workspace/permissions`)

- Lista de roles: system roles com badge "Sistema" (sem editar/deletar), custom roles com ações
- Botão "Criar cargo" (`role.create`) → dialog: nome + checkboxes de permissões
- Por role: drawer editar permissões (`role.update`), botão deletar (`role.delete`)
- System roles nunca recebem controles de edição/deleção — independente da permissão

### Página Configurações (`/workspace/settings`)

- **Seção geral** (`company.update`): nome, slug, logo com react-hook-form + Zod
- **Zona de perigo** (`company.delete` — owner only):
  - "Transferir ownership" → dialog com dropdown de membros
  - "Deletar workspace" → dialog com digitação do nome da org para confirmação

---

## Estrutura de Arquivos

### Backend (`apps/api`)

```
src/
  auth/
    auth.module.ts           (novo)
    auth.guard.ts            (novo — AuthGuard global)
    session.service.ts       (novo — valida token via Prisma Session)
    decorators/
      public.decorator.ts    (novo)
      require-permission.decorator.ts (novo)
  organization/
    guards/
      permission.guard.ts    (novo)
    organization.controller.ts (atualizado — guards + company.delete/transfer)
    membership.controller.ts  (atualizado — guards + DELETE member)
    membership.service.ts     (atualizado — removeMember + lastOwnerCheck)
    invitation.controller.ts  (atualizado — guards + @Public em accept)
    role.controller.ts        (atualizado — guards)
```

### Frontend (`apps/web`)

```
src/
  core/
    modules/
      organization/
        hooks/
          use-ability.ts       (novo)
          use-members.ts       (atualizado — add remove mutation)
          use-roles.ts         (novo)
        pages/
          team-page.tsx        (novo)
          permissions-page.tsx (novo)
          settings-page.tsx    (novo)
    shared/
      components/
        permission-gate.tsx    (novo)
  app/
    (dashboard)/
      workspace/
        team/page.tsx          (novo)
        permissions/page.tsx   (novo)
        settings/page.tsx      (novo)
packages/
  authz/
    src/index.ts               (atualizado — member.remove, company.delete)
```

---

## Regras de Role por Ação

| Ação | Owner | Admin | Member |
|------|-------|-------|--------|
| Ver membros | ✅ | ✅ | ✅ |
| Convidar | ✅ | ✅ | ❌ |
| Editar cargos de membro | ✅ | ✅ | ❌ |
| Remover membro | ✅ | ✅ | ❌ |
| Ver cargos | ✅ | ✅ | ✅ |
| Criar cargo custom | ✅ | ❌ | ❌ |
| Editar cargo custom | ✅ | ❌ | ❌ |
| Deletar cargo custom | ✅ | ❌ | ❌ |
| Editar configurações gerais | ✅ | ✅ | ❌ |
| Deletar workspace | ✅ | ❌ | ❌ |
| Transferir ownership | ✅ | ❌ | ❌ |
