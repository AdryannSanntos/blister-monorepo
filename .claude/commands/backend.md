# Skill de Backend — Blister

Você é especialista em `apps/api` deste monorepo. Aplique as regras abaixo em toda implementação ou revisão de código backend.
Contexto técnico em `docs/project/architecture.md`.

> Target modules: `company/`, `campaigns/`, `agents/` (runtime isolado), `rag/`, `ai-runtime/`, `credits/`, `ai-catalog/`. **Sem** `PipelineOrchestrator`. Ver `docs/decisions/2026-06-09-agents-isolated-architecture.md`.

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

Módulos existentes: `auth`, `users`, `platform`, `audit`, `email`, `prisma`.

## Regra de Permissão Universal (inviolável)

Todo endpoint de mutação ou dado sensível **deve** ter `@RequirePermission(key)`.

- `@Public()` deve ser explícito — sem ele, `AuthGuard` (global) bloqueia automaticamente
- `userId` vem **sempre** de `req.currentUser.id` — nunca do body
- IDs de recurso vêm de `req.params` — nunca do body

## Padrão de Controller

```typescript
@Controller('campaigns')
export class CampaignController {
  @Post()
  @RequirePermission('campaign.create')
  async create(@Body() body: unknown, @Req() req: Request) {
    const currentUser = (req as unknown as Record<string, unknown>)['currentUser'] as CurrentUser;
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.service.create(currentUser.id, parsed.data);
  }

  @Patch(':id')
  @RequirePermission('campaign.update')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.service.update(id, parsed.data);
  }
}
```

## Cadeia de Guards

```
Request → AuthGuard (valida sessão better-auth) → req.currentUser = user
        → PermissionGuard (@RequirePermission)
             → resolve roles do usuário (UserRoleAssignment + overrides)
             → defineAbilityForPermissions(...) → AppAbility CASL
             → ability.can(action, subject)
```

## Validação com Zod (sempre)

**Zod é obrigatório** em toda fronteira de entrada — body, query, params quando parseados, e outputs de agentes/IA antes de persistir.

- Schemas em `dto/` por módulo; compartilhados em `packages/types` quando cruzam web/api.
- Controller: `safeParse` → `BadRequestException` — nunca passar `unknown` ao service.
- Service: validate business invariants (ownership `companyId`, status transitions, credit balance).

```typescript
export const createCampaignSchema = z.object({
  name: z.string().min(2).max(120),
  objective: z.string().min(2).max(500),
});
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
```

## Padrão de Service

```typescript
@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }
}
```

## Auditoria

Mutações críticas (campanha, agenda, pagamento, aprovação de perfil) registram em `AuditLog` (`actorUserId`, `action`, `resourceType`, `resourceId`, `metadata`).

## Adicionando nova permissão (Regra 4)

1. `packages/authz/src/index.ts` → `subjects` (se novo) + `AppPermissionKey` + `allPermissionKeys` + `permissionMap` + `getDefaultRolePermissions`
2. Rodar seed de roles padrão (`apps/api/prisma/seed.ts`)
3. `@RequirePermission('nova.chave')` no controller
4. `<PermissionGate permission="nova.chave">` no frontend

## Invariantes de Segurança

- `userId` **nunca** vem do body — sempre de `req.currentUser.id`
- IDs de recurso de `req.params`, nunca do body
- Roles de sistema (`owner`, `admin`, `member`) são imutáveis
- `better-auth` trata apenas auth/sessão — `userType`, roles e perfil são domínio próprio
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
| Storage de mídia | S3-compatível (presigned URL) |

## Checklist de entrega

- [ ] **Zod** em todo DTO e validação de params/query quando aplicável
- [ ] Validação de negócio no service (ownership, status, créditos)
- [ ] Endpoint de mutação tem `@RequirePermission` com chave válida
- [ ] Endpoints públicos têm `@Public()` explícito
- [ ] `userId` vem de `req.currentUser.id`, nunca do body
- [ ] IDs de recurso vêm de `req.params`, nunca do body
- [ ] DTO validado com Zod antes de passar ao service
- [ ] Erros mapeados para exceções HTTP corretas
- [ ] Nova permissão declarada em `packages/authz` antes de usar no guard
- [ ] Nenhum acesso a banco fora do PrismaService
- [ ] `better-auth` não assumiu responsabilidades de domínio (userType/roles/perfil)
- [ ] Mutação crítica registra em `AuditLog`
- [ ] Testes cobrem caminho feliz + erros críticos
