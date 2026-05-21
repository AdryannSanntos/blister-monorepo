# Skill de Autorização — Workana AI

Catálogo completo de permissões, roles e padrões de implementação de autorização.

---

## Catálogo de permissões (AppPermissionKey)

| Chave | Ação CASL | Subject CASL |
|-------|-----------|--------------|
| `company.read` | read | Company |
| `company.update` | update | Company |
| `company.delete` | delete | Company |
| `member.read` | read | Member |
| `member.invite` | create | Member |
| `member.update` | update | Member |
| `member.remove` | delete | Member |
| `role.read` | read | Role |
| `role.create` | create | Role |
| `role.update` | update | Role |
| `role.delete` | delete | Role |
| `permission.read` | read | Permission |
| `onboarding.publish` | update | Onboarding |
| `brain.read` | read | CompanyBrain |
| `brain.update` | update | CompanyBrain |
| `skill.read` | read | Skill |
| `skill.execute` | create | Skill |
| `output.read` | read | Output |
| `output.review` | update | Output |

## Roles padrão de sistema (imutáveis)

**owner** — todas as permissões incluindo `company.delete`, `role.create/update/delete`, `onboarding.publish`

**admin** — `company.read/update`, `member.read/invite/update/remove`, `role.read`, `permission.read`, `brain.read/update`, `skill.read/execute`, `output.read/review`

**member** — `company.read`, `brain.read`, `skill.read/execute`, `output.read`

Nota: `onboarding.publish` não é assignable — exclusiva do owner.

## Invariantes de segurança

- Não remover o último owner → `ForbiddenException`
- Roles de sistema não podem ser renomeadas nem deletadas
- Um membro pode ter múltiplas roles simultâneas
- Overrides individuais `allow`/`deny` sobrepõem permissões das roles

## Backend — uso nos controllers

```typescript
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Get('health')
@Public()
health() { return 'ok'; }

@Patch(':id')
@RequirePermission('company.update')  // orgId deve estar em req.params.id ou req.params.orgId
async update(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
  const currentUser = (req as unknown as Record<string, unknown>)['currentUser'] as CurrentUser;
  // userId de req.currentUser.id — nunca do body
}
```

## Frontend — proteção de UI

```tsx
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { useAbility } from 'src/core/modules/organization/hooks/use-ability';

// Declarativo
<PermissionGate permission="member.invite">
  <Button>Convidar</Button>
</PermissionGate>

// Programático
const { can, cannot } = useAbility();
if (can('update', 'Company')) { ... }
```

## Adicionando nova permissão (fluxo completo)

1. `packages/authz/src/index.ts`:
   - Adicionar chave em `AppPermissionKey`
   - Adicionar em `allPermissionKeys`
   - Adicionar em `permissionMap` com `[AppAction, AppSubject]`
   - Se subject for novo, adicionar em `subjects`
   - Definir em `getDefaultRolePermissions` para cada role aplicável

2. Rodar seed de roles padrão no banco

3. Backend: `@RequirePermission('nova.chave')` no controller

4. Frontend: `<PermissionGate permission="nova.chave">` na UI

## Regra universal

**Toda ação do produto tem verificação de permissão — sem exceção.**

Backend: `@RequirePermission(key)` em todo endpoint sensível.
Frontend: `<PermissionGate>` ou `can()` antes de renderizar controles de escrita/exclusão.
Nenhuma feature é entregue sem guards e checks de UI implementados.
