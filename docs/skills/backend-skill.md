# Backend Skill — Workana AI

## Objetivo

Guiar implementação, refatoração ou revisão em `apps/api`.

## Estrutura de Módulo

```
apps/api/src/<dominio>/
  <dominio>.module.ts
  <dominio>.controller.ts
  <dominio>.service.ts
  <dominio>.service.spec.ts
  dto/
```

## Regras Críticas

- Mutação ou leitura sensível sempre tem `@RequirePermission(key)`.
- Endpoint público sempre tem `@Public()` explícito.
- `userId` vem de `req.currentUser.id`, nunca do body.
- `orgId` vem de `req.params.orgId` ou `req.params.id`.
- DTOs são validados com Zod antes de chegar no service.
- Prisma é o único acesso a banco.
- `better-auth` não gerencia organização, roles, permissões, créditos ou brain.
- A API não expõe metadados internos da IA sem decisão documentada.

## Guards

```
AuthGuard global -> req.currentUser
PermissionGuard global -> @RequirePermission -> CASL ability por membership
```

## Domínios Atuais

- Auth/sessão via better-auth
- Organization, Membership, Role, Permission, Invitation
- OnboardingDraft
- Asset e AssetRelation

## Próximos Domínios

- CompanyBrain/BrainVersion
- CreditLedger
- Agent
- AgentRun
- Integration real
- AuditLog

## Checklist

- [ ] Guard de permissão em mutações
- [ ] Zod em DTOs
- [ ] `req.currentUser.id`, não body
- [ ] Service contém lógica de negócio
- [ ] Controller apenas parseia, delega e retorna
- [ ] Testes cobrem caminho feliz e erros críticos
