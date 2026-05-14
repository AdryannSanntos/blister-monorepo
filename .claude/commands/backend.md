# Skill de Backend — AI Company OS

Você é especialista em `apps/api` deste monorepo. Aplique as regras abaixo em toda implementação ou revisão de código backend.

---

## Estrutura do módulo NestJS

```
apps/api/src/<dominio>/
  <dominio>.module.ts
  <dominio>.controller.ts    ← HTTP, @UseGuards, @RequirePermission
  <dominio>.service.ts       ← lógica de negócio, Prisma
  <dominio>.service.spec.ts  ← testes
  dto/                       ← schemas Zod + tipos inferidos
  guards/                    ← guards específicos do módulo
```

## Regra de Permissão Universal (inviolável)

Todo endpoint de mutação ou dado sensível **deve** ter `@RequirePermission(key)`.

- `@Public()` deve ser explícito — sem ele, `AuthGuard` bloqueia automaticamente
- `userId` vem **sempre** de `req.currentUser.id` — nunca do body
- `orgId` vem de `req.params` — nunca do body

## Padrão de Controller

```typescript
@Controller('organizations')
export class OrganizationController {
  // Endpoint público
  @Post('login')
  @Public()
  async login(@Body() body: unknown) { ... }

  // Autenticado sem permissão específica
  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const currentUser = (req as unknown as Record<string, unknown>)['currentUser'] as CurrentUser;
    return this.service.create(currentUser.id, data);
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

## Cadeia de Guards

```
Request → AuthGuard (valida cookie/Bearer) → req.currentUser = user
        → PermissionGuard (@RequirePermission)
             → orgId de req.params.orgId ?? req.params.id
             → membershipService.getEffectiveAbility(orgId, currentUser.id)
             → ability.can(action, subject)
             → req.orgContext = { ability }
```

## Regras de Negócio Críticas

- `removeMember`: não pode remover o último owner → `ForbiddenException`
- `removeRole`: não pode remover o último role → `ConflictException`
- `addRole`: checa duplicidade → `ConflictException`
- `getEffectiveAbility`: agrega roles + aplica overrides allow/deny

## Padrão de DTO com Zod

```typescript
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/).optional(),
});
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
```

## Padrão de Service

```typescript
@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
```

## Adicionando nova permissão

1. `packages/authz/src/index.ts` → `AppPermissionKey` + `allPermissionKeys` + `permissionMap` + `getDefaultRolePermissions`
2. Rodar seed de roles padrão
3. `@RequirePermission('nova.chave')` no controller
4. `<PermissionGate permission="nova.chave">` no frontend

## Invariantes de Segurança

- `userId` **nunca** vem do body — sempre de `req.currentUser.id`
- Roles de sistema (`owner`, `admin`, `member`) são imutáveis
- `onboarding.publish` não é assignable — só owner recebe automaticamente
- `better-auth` trata apenas auth/sessão — org/membership/roles são domínio próprio
- Nunca editar `apps/api/src/generated/prisma` manualmente

## Stack do backend

| Responsabilidade | Ferramenta |
|-----------------|-----------|
| HTTP/módulos | NestJS 11 |
| Banco de dados | Prisma (único permitido) |
| Autenticação/sessão | better-auth |
| Autorização | CASL (via packages/authz) |
| Validação de entrada | Zod |
| Emails transacionais | Resend |
| Realtime (futuro) | socket.io |
| Storage S3 (futuro) | @aws-sdk/client-s3 |

## Checklist de entrega

- [ ] Endpoint de mutação tem `@RequirePermission` com chave válida
- [ ] Endpoints públicos têm `@Public()` explícito
- [ ] `userId` vem de `req.currentUser.id`, nunca do body
- [ ] DTO validado com Zod antes de passar ao service
- [ ] Erros mapeados para exceções HTTP corretas
- [ ] Nova permissão declarada em `packages/authz` antes de usar no guard
- [ ] Nenhum acesso a banco fora do PrismaService
- [ ] `better-auth` não assumiu responsabilidades de org/membership/roles
- [ ] Testes cobrem caminho feliz + erros críticos (último owner, duplicidade, etc.)
