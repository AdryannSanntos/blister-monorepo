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

## Regras de Agentes V1

- Classificacao de mensagem decide conversa vs execucao; pedido de artefato final deve forcar execucao.
- Execucoes por empresa limitadas a 3 simultaneas, com fila FIFO para excedente.
- Retry automatico maximo de 1 tentativa e timeline de tentativas no mesmo run.
- Retrieval de contexto em camadas: conversa atual -> memoria do mesmo agente -> estruturado -> vetorial (pgvector) -> rerank.
- Retrieval deve respeitar permissao do solicitante e bloquear segredos/credenciais.
- Delegacao do chat geral para agente especializado deve manter resposta no chat geral e rastrear run delegado.
- Arquivos gerados devem ir para storage S3-compativel; `AgentRun` guarda referencias/metadados, nao binarios.

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
