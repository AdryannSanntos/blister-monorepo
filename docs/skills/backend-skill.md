# Backend Skill

## Objetivo

Guiar a implementação, refatoração ou revisão de código em `apps/api`.

## Ler Antes

- `docs/skills/project-engineering-skill.md`
- `docs/decisions/stack-decisions.md`

## Estrutura de Módulo NestJS

```
apps/api/src/<dominio>/
  <dominio>.module.ts        importa guards, services, controllers
  <dominio>.controller.ts    HTTP, @UseGuards, @RequirePermission
  <dominio>.service.ts       lógica de negócio, Prisma
  <dominio>.service.spec.ts  testes
  dto/                       schemas Zod + tipos inferidos
  guards/                    guards específicos do módulo
```

## Padrão de Controller

```typescript
@Controller('organizations')
export class OrganizationController {
  // Endpoint público
  @Post('health')
  @Public()
  health() { return 'ok'; }

  // Autenticado sem permissão específica
  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    // userId SEMPRE de req.currentUser — nunca do body
    const currentUser = (req as unknown as Record<string, unknown>)['currentUser'] as CurrentUser;
    return this.service.create(currentUser.id, parsed.data);
  }

  // Com permissão CASL
  @Patch(':id')
  @RequirePermission('company.update')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.service.update(id, parsed.data);
  }
}
```

## Cadeia de Guards (automática via AppModule)

```
AuthGuard global → valida cookie/Bearer → req.currentUser
PermissionGuard global → ativado apenas quando @RequirePermission existe
  → lê orgId de req.params.orgId ?? req.params.id
  → membershipService.getEffectiveAbility(orgId, currentUser.id)
  → ability.can(action, subject)
  → req.orgContext = { ability }
```

## Padrão de DTO com Zod

```typescript
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/).optional(),
  logo: z.string().url().optional().or(z.literal('')),
});
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
```

## Padrão de Service com Prisma

```typescript
@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, data: UpdateOrganizationDto) {
    return this.prisma.organization.update({ where: { id }, data });
  }
}
```

## Regras de Negócio Críticas (MembershipService)

- `removeMember`: não pode remover o último owner → `ForbiddenException`
- `removeRole`: não pode remover o último role de um membro → `ConflictException`
- `addRole`: checa duplicidade → `ConflictException`
- `setOverride`: upsert de override allow/deny por membro
- `getEffectiveAbility`: agrega permissões de todas as roles + aplica overrides

## Invariantes de Segurança

- `userId` **nunca** vem do body — sempre de `req.currentUser.id`
- `orgId` vem de `req.params` — nunca do body
- Endpoints sem `@Public()` são protegidos automaticamente pelo `AuthGuard`
- Roles de sistema (`owner`, `admin`, `member`) são imutáveis
- `onboarding.publish` não é assignable — só owner recebe automaticamente
- `better-auth` trata apenas auth/sessão

## Adicionando Nova Permissão

1. `packages/authz/src/index.ts` → declarar em `AppPermissionKey`, `allPermissionKeys`, `permissionMap`, `getDefaultRolePermissions`
2. Rodar seed de roles padrão
3. `@RequirePermission('nova.chave')` no controller
4. `<PermissionGate permission="nova.chave">` no frontend

## Mapeamento de Erros

| Situação | Exceção |
|----------|---------|
| Recurso não encontrado | `NotFoundException` |
| Ação proibida | `ForbiddenException` |
| Dados inválidos | `BadRequestException` |
| Conflito de unicidade/estado | `ConflictException` |

## Regras de Prisma

- Único cliente de banco — sem SQL raw avulso, sem outro ORM
- Alterações de domínio começam pelo `schema.prisma`
- Nunca editar `apps/api/src/generated/prisma` manualmente
- Migrations via `pnpm prisma migrate dev`

## Checklist de Entrega

- [ ] Endpoint de mutação tem `@RequirePermission` com chave válida de `AppPermissionKey`
- [ ] Endpoints públicos têm `@Public()` explícito
- [ ] `userId` vem de `req.currentUser.id`, nunca do body
- [ ] DTO validado com Zod antes de passar ao service
- [ ] Erros mapeados para exceções HTTP corretas
- [ ] Nova permissão declarada em `packages/authz` antes de usar no guard
- [ ] Nenhum acesso a banco fora do PrismaService
- [ ] `better-auth` não assumiu responsabilidades de org/membership/roles
- [ ] Testes de service cobrem caminho feliz + erros críticos (último owner, duplicidade, etc.)
