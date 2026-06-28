# Invite-Only B2B Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o sistema invite-only: somente admin cria empresas + convida o owner via email, owner convida membros via email, todo usuário faz primeiro login via reset-password e completa onboarding de perfil (nome, CPF, telefone) antes de acessar o dashboard.

**Architecture:** Admin cria empresa + usuário via endpoint privado, que pré-cria o registro de usuário no banco e usa o flow `forgetPassword` do better-auth para enviar o link de "definição de senha". Após definir a senha e logar, o dashboard detecta `User.onboardingCompletedAt === null` e exibe um modal obrigatório de perfil. Owner convida membros com o mesmo mecanismo (pré-cria usuário + envia email). Espaço pessoal é removido da lógica de aplicação.

**Tech Stack:** NestJS 11, Prisma, better-auth, Resend, Next.js 16, React 19, shadcn/ui, RHF + Zod, TanStack Query

## Global Constraints

- Todos os identificadores de código em inglês (nomes de função, variável, classe, comentário).
- Schema Prisma em `apps/api/prisma/schema.prisma`; rodar migrações com `cd apps/api && npx prisma migrate dev --name <nome>`.
- Após migrar, regenerar o client: `cd apps/api && npx prisma generate` (propaga para `packages/db/src/generated/`).
- Roteamento/proteção de rotas no Next.js vive em `apps/web/src/proxy.ts` — nunca criar `middleware.ts` novo.
- `better-auth` permanece como camada de auth; criação de usuário pelo admin bypassa o signup via Prisma direto + `auth.api.forgetPassword`.
- Nenhum endpoint novo sem `@RequirePermission` ou `@Public` explícito; admin endpoints usam `AdminGuard` (verifica `userType === 'ADMIN'`).
- Frontend Plano 2: onboarding modal e admin create-company usam chamadas reais à API (essas features são do Plano 3 de auth); demais fixtures permanecem.

---

## Task 0: Exploração e Alinhamento com o Projeto

> **Esta task é obrigatória e deve ser concluída antes de qualquer escrita de código.** O objetivo é entender profundamente a base existente para evitar duplicação, seguir os padrões estabelecidos e garantir qualidade consistente.

**Files:** Leitura de múltiplas áreas do projeto — nenhuma escrita.

**Interfaces:**
- Produz: um conjunto de anotações internas (não salvas em arquivo) que o agente usa como contexto para todas as tasks seguintes.
- Bloqueia: início de qualquer Task 1+.

---

### 0.1 — Estrutura geral do monorepo

- [ ] **Listar estrutura de packages e apps**

```bash
ls apps/ packages/
cat package.json | grep -E '"name"|"workspaces"'
cat pnpm-workspace.yaml 2>/dev/null || echo "no pnpm-workspace.yaml"
```

Anotar internamente: quais packages existem, quais são compartilhados, o que cada `apps/` exporta.

- [ ] **Ler CLAUDE.md para regras do projeto**

```bash
cat CLAUDE.md
```

Anotar: regras invioláveis, ordem de execução de planos, convenções de linguagem UI, stack resumida.

- [ ] **Ler estado atual do projeto**

```bash
cat docs/project/current-state.md 2>/dev/null || echo "not found"
cat docs/plans/blister-os/00-execution-rules.md 2>/dev/null || echo "not found"
```

---

### 0.2 — Backend: padrões de código existentes

- [ ] **Analisar como controllers existentes são estruturados**

Ler pelo menos dois controllers completos para entender o padrão:

```bash
cat apps/api/src/company/company.controller.ts
cat apps/api/src/users/users.controller.ts
```

Anotar: como `@CurrentUser` é obtido (decorator próprio, `@Req()`, ou outro), se usam `@UsePipes` com ZodValidationPipe ou outro mecanismo de validação, como retornam erros, padrão de nomenclatura.

- [ ] **Verificar se `ZodValidationPipe` já existe**

```bash
find apps/api/src -name "*validation*pipe*" -o -name "*zod*pipe*" 2>/dev/null
find apps/api/src -name "*.pipe.ts" 2>/dev/null
```

Se existir, anotar o caminho exato e a assinatura — o plano já assume um caminho, verificar se bate.

- [ ] **Verificar como pipes/validation são usados nos controllers existentes**

```bash
grep -r "UsePipes\|ZodValidation\|ValidationPipe\|zodResolver" apps/api/src --include="*.ts" -l | head -10
grep -r "UsePipes\|ZodValidation" apps/api/src --include="*.ts" | head -20
```

- [ ] **Verificar padrão de guards existentes**

```bash
cat apps/api/src/auth/auth.guard.ts
cat apps/api/src/users/guards/permission.guard.ts
```

Anotar: como guards acessam `currentUser`, se usam `Reflector`, se injetam `PrismaService` diretamente.

- [ ] **Verificar se já existe algum guard ou decorator de admin**

```bash
grep -r "ADMIN\|isAdmin\|AdminGuard\|userType" apps/api/src --include="*.ts" | grep -v "generated" | head -20
```

Se já existir lógica de admin guard, usar o que existe em vez de criar novo.

- [ ] **Verificar como `PrismaService.getClient()` é chamado vs injeção direta**

```bash
grep -r "getClient\|prisma\.getClient" apps/api/src --include="*.ts" | grep -v "generated" | head -10
grep -r "private readonly prisma: PrismaService" apps/api/src --include="*.ts" | head -5
```

Anotar se services injetam `PrismaService` e usam `this.prisma.model` diretamente ou chamam `this.prisma.getClient().model`.

- [ ] **Verificar como emails são enviados em outros services (padrão EmailPort)**

```bash
cat apps/api/src/email/resend-email.adapter.ts
grep -r "EMAIL_PORT\|EmailPort\|emailPort" apps/api/src --include="*.ts" | head -10
```

Anotar: o plano usa Resend direto em `register-better-auth.ts`; verificar se outros services usam o `EMAIL_PORT` injectable. Se sim, o `AdminService` e `MembersService` devem seguir o mesmo padrão injetável em vez de instanciar Resend diretamente.

- [ ] **Verificar como `getAuthInstance()` é usada atualmente**

```bash
grep -r "getAuthInstance\|_authInstance" apps/api/src --include="*.ts"
```

Anotar se já há algum service usando `getAuthInstance()` — para entender se o padrão de chamada `auth.api.forgetPassword` já foi testado em outros lugares.

- [ ] **Ler o schema Prisma completo para entender modelos existentes**

```bash
cat apps/api/prisma/schema.prisma
```

Anotar: campos existentes no model `User`, models que referenciam `PersonalSpace` (para identificar o impacto completo de removê-lo da lógica), campos que o plano assume existir (ex: `Company.onboardingCompletedAt`).

---

### 0.3 — Frontend: padrões de design e componentes

- [ ] **Ler o design system de referência**

```bash
cat docs/design-system/blister-os-reference.md 2>/dev/null | head -100
```

Anotar: tokens de cor usados (`--fg-primary`, `--bg-base`, etc.), padrões de espaçamento (`gap-6` entre seções, `gap-4` dentro), tamanho de fonte padrão para labels e descrições.

- [ ] **Analisar um modal existente para seguir o padrão visual**

```bash
find apps/web/src -name "*modal*" -o -name "*dialog*" | grep -v node_modules | grep "\.tsx$" | head -10
```

Ler um ou dois modais existentes para entender: como `Dialog` do shadcn/ui é usado, se há wrapper próprio, padrões de header/footer.

- [ ] **Analisar um form existente com RHF + Zod + shadcn para seguir o padrão**

Ler pelo menos um form completo similar ao que será criado (admin create company, invite form):

```bash
cat apps/web/src/core/modules/auth/pages/forgot-password-page.tsx
```

Anotar: como `zodResolver` é configurado, `mode: 'onBlur'` é consistente, padrão de loading state nos botões, como erros são exibidos.

- [ ] **Verificar quais componentes shadcn/ui já estão instalados**

```bash
ls apps/web/src/core/shared/components/ui/
```

Anotar: quais componentes existem. O plano usa `Card`, `Dialog`, `Form`, `Input`, `Button` — confirmar que todos estão disponíveis. Se algum não estiver, adicionar um passo de instalação na task correspondente.

- [ ] **Verificar como TanStack Query é configurado e usado no projeto**

```bash
find apps/web/src -name "*query*provider*" -o -name "*react-query*" | grep "\.tsx\?$" | head -5
grep -r "useQuery\|useMutation\|useQueryClient" apps/web/src --include="*.ts" --include="*.tsx" -l | head -10
```

Ler um hook de query existente para entender o padrão de `queryKey`, `staleTime`, error handling:

```bash
cat apps/web/src/core/modules/company/hooks/use-company.ts 2>/dev/null || \
  find apps/web/src/core/modules -name "use-*.ts" | head -3 | xargs head -50
```

Anotar: estrutura de queryKey, se há wrapper próprio sobre `axios`, se há `queryFn` centralizado.

- [ ] **Verificar como axios é configurado (baseURL, interceptors)**

```bash
find apps/web/src -name "axios*" -o -name "api-client*" | grep -v node_modules | head -5
grep -r "axios.create\|baseURL\|interceptors" apps/web/src --include="*.ts" --include="*.tsx" | grep -v node_modules | head -10
```

Anotar: se há uma instância configurada de axios com baseURL e interceptors para session. O plano usa `axios.get('/api/user/me')` — verificar se deve usar instância customizada.

- [ ] **Verificar padrão de tabs no painel admin**

```bash
cat apps/web/src/core/modules/platform-admin/hooks/use-platform-admin-tab.ts 2>/dev/null || \
  find apps/web/src/core/modules/platform-admin -name "*.ts" | head -5 | xargs cat
cat apps/web/src/core/modules/platform-admin/components/platform-admin-page-layout.tsx 2>/dev/null | head -80
```

Anotar: como tabs são definidas (array de objetos? union type?), como adicionar uma tab nova, se há i18n nas labels.

- [ ] **Verificar padrão de i18n (next-intl)**

```bash
find apps/web/src -name "*.json" -path "*/messages/*" | head -5
ls apps/web/src/i18n/ 2>/dev/null || ls apps/web/messages/ 2>/dev/null
```

Ler um arquivo de mensagens para entender a estrutura:

```bash
find apps/web -name "en.json" -o -name "pt.json" -o -name "pt-BR.json" | grep -v node_modules | head -3 | xargs head -50
```

Anotar: se os componentes que o plano cria precisam de chaves i18n, onde adicioná-las. Se o projeto é pt-BR direto no código (sem i18n lookup) ou usa `useTranslations()`.

---

### 0.4 — Validação de duplicação e impacto

- [ ] **Verificar referências a `PersonalSpace` em todo o frontend**

```bash
grep -r "personal-space\|personalSpace\|PersonalSpace\|PERSONAL_WORKSPACE" apps/web/src --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"
```

Listar cada ocorrência. Cada uma representa código que precisará ser removido ou adaptado nas tasks 8 e 9. Se houver mais ocorrências do que o plano cobre, registrar para revisão.

- [ ] **Verificar referências a `personal-space` no backend além dos arquivos já mapeados**

```bash
grep -r "personal-space\|personalSpace\|PersonalSpace\|PERSONAL_WORKSPACE\|personal_space" apps/api/src --include="*.ts" | grep -v "generated" | grep -v "node_modules"
```

Cada ocorrência que não está coberta por Tasks 2–6 é um gap no plano.

- [ ] **Verificar referências a `/onboarding` no frontend**

```bash
grep -r "onboarding\|/onboarding" apps/web/src --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"
```

Identificar links para `/onboarding` que precisarão ser removidos além do que o plano já cobre.

- [ ] **Verificar se o schema de `InviteMemberDto` em packages/types tem mais campos que o plano assume**

```bash
grep -r "InviteMemberDto\|inviteMember" packages/types/src --include="*.ts"
```

Confirmar a estrutura exata antes de alterar.

- [ ] **Verificar todos os lugares que chamam `bootstrapUserOnSignup`**

```bash
grep -r "bootstrapUserOnSignup" apps/api/src --include="*.ts"
```

O plano assume que só `register-better-auth.ts` chama. Se houver outros, adicionar a task de remoção.

- [ ] **Verificar se já existe algum endpoint `/user/me` ou similar**

```bash
grep -r "user/me\|'/me'\|\"/me\"" apps/api/src --include="*.ts" | grep -v generated
```

Se existir, o plano de Task 5 deve adaptar em vez de criar do zero.

---

### 0.5 — Consolidação antes de implementar

Após completar todos os checks acima, o agente deve:

- [ ] **Registrar gaps encontrados**: qualquer arquivo com referência a PersonalSpace, signup, ou onboarding não coberto pelo plano deve ser adicionado como sub-step na task mais próxima ou como nova task antes do commit final.

- [ ] **Confirmar caminhos de arquivo**: cada `Create:` e `Modify:` nas tasks 1–11 deve ter o caminho verificado contra `ls` real — não assumir que o arquivo existe onde o plano diz.

- [ ] **Confirmar ZodValidationPipe**: se não existir em `apps/api/src/pipes/`, criar no Task 4 antes de usá-lo.

- [ ] **Confirmar shadcn Card**: se `apps/web/src/core/shared/components/ui/card.tsx` não existir, adicionar passo de `npx shadcn add card` no Task 10.

---

## Task 1: DB — User Profile Fields Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model User)

**Interfaces:**
- Produces: `User.cpf: String?`, `User.phone: String?`, `User.onboardingCompletedAt: DateTime?`

- [ ] **Step 1: Adicionar campos ao model User no schema**

Abrir `apps/api/prisma/schema.prisma` e localizar o model `User`. Adicionar as três linhas novas:

```prisma
model User {
  id              String               @id
  name            String
  email           String               @unique
  emailVerified   Boolean
  image           String?
  userType        UserType             @default(USER)
  createdAt       DateTime
  updatedAt       DateTime
  // New profile fields
  cpf                   String?
  phone                 String?
  onboardingCompletedAt DateTime?
  // Relations
  accounts        Account[]
  sessions        Session[]
  roleAssignments UserRoleAssignment[]
  ownedCompanies  Company[]
  companyMembers  CompanyMember[]
  personalSpace   PersonalSpace?
  agentFeedbacks  AgentFeedback[]
}
```

- [ ] **Step 2: Criar e aplicar a migration**

```bash
cd apps/api && npx prisma migrate dev --name add-user-profile-fields
```

Saída esperada: `The following migration(s) have been created and applied from new schema changes: migrations/..._add_user_profile_fields/migration.sql`

- [ ] **Step 3: Regenerar o Prisma Client**

```bash
cd apps/api && npx prisma generate
```

Saída esperada: `Generated Prisma Client (v5.x.x) to ./../../packages/db/src/generated/client`

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/ packages/db/src/generated/
git commit -m "feat(db): add cpf, phone, onboardingCompletedAt to User"
```

---

## Task 2: Backend — Limpar Config do better-auth

**Files:**
- Modify: `apps/api/src/auth/register-better-auth.ts`

**Interfaces:**
- Produces: rota `POST /api/auth/sign-up/email` bloqueada (retorna 403); `requireEmailVerification` desabilitado; Google OAuth removido; hook `bootstrapUserOnSignup` removido.

- [ ] **Step 1: Reescrever `register-better-auth.ts`**

Substituir o conteúdo completo do arquivo por:

```typescript
import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { Resend } from 'resend';
import type { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('BetterAuth');
const authBasePath = '/api/auth';
type AuthInstance = ReturnType<typeof import('better-auth').betterAuth>;

let _authInstance: AuthInstance | null = null;

export function getAuthInstance(): AuthInstance | null {
  return _authInstance;
}

export async function registerBetterAuth(
  app: INestApplication,
  prisma: PrismaService,
): Promise<void> {
  if (!prisma.isConfigured()) {
    logger.warn('Skipping Better Auth bootstrap because DATABASE_URL is not set.');
    return;
  }

  const [{ betterAuth }, { toNodeHandler }, { prismaAdapter }] = await Promise.all([
    import('better-auth'),
    import('better-auth/node'),
    import('@better-auth/prisma-adapter'),
  ]);

  const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const trustedOrigins = [
    ...new Set(
      [baseURL, ...(process.env.CORS_ORIGIN?.split(',') ?? [])]
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  ];

  type BA = typeof import('better-auth');
  type BetterAuthOptions = Parameters<BA['betterAuth']>[0];

  const options: BetterAuthOptions = {
    appName: 'Blister API',
    baseURL,
    basePath: authBasePath,
    secret:
      process.env.BETTER_AUTH_SECRET ??
      'change-me-before-production-this-secret-must-be-overridden',
    database: prismaAdapter(prisma.getClient(), {
      provider: 'postgresql',
    }),
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async (data: { user: { email: string }; url: string }) => {
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM_EMAIL ?? 'Blister <noreply@blister.com.br>';
        if (!apiKey || apiKey === 'change-me') {
          logger.warn(`[DEV] Reset password for ${data.user.email}: ${data.url}`);
          return;
        }
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from,
          to: data.user.email,
          subject: 'Defina sua senha — Blister',
          html: `
            <p>Você foi convidado para acessar o Blister.</p>
            <p><a href="${data.url}">Clique aqui para definir sua senha</a></p>
            <p>O link expira em 1 hora.</p>
          `,
        });
      },
    },
  };

  const auth = betterAuth(options);
  _authInstance = auth;

  const handler = toNodeHandler(auth);
  const httpAdapter = app.getHttpAdapter().getInstance();

  httpAdapter.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.url.startsWith(authBasePath)) {
      next();
      return;
    }

    // Block self-signup: only admin can create users
    if (req.url === `${authBasePath}/sign-up/email` && req.method === 'POST') {
      res.status(403).json({ error: 'Cadastro direto não permitido. Solicite acesso ao administrador.' });
      return;
    }

    void handler(req, res).catch(next);
  });
}
```

- [ ] **Step 2: Verificar que a importação de `bootstrapUserOnSignup` foi removida**

Confirmar que `register-better-auth.ts` não importa mais `bootstrapUserOnSignup`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/register-better-auth.ts
git commit -m "feat(auth): disable self-signup, remove email verification and google oauth"
```

---

## Task 3: Backend — Remover PersonalSpace do Bootstrap e do WorkspaceContext

**Files:**
- Modify: `apps/api/src/company/company-bootstrap.util.ts`
- Modify: `apps/api/src/workspace/workspace-context.service.ts`
- Modify: `apps/api/src/company/company.service.ts`

**Interfaces:**
- `createCompanyForUser(db, user, name)` permanece com a mesma assinatura.
- `WorkspaceContextService.resolveFromRequest()` agora lança `BadRequestException` se não houver `activeCompanyId` válido.
- `getHomeDestination()` retorna `'onboarding'` ou `'dashboard'` (nunca `'personal-space'`).

- [ ] **Step 1: Limpar `company-bootstrap.util.ts`**

Substituir o conteúdo do arquivo por (remover `ensurePersonalSpace` e `bootstrapUserOnSignup`, manter apenas `createCompanyForUser`):

```typescript
import { ensureWorkspaceAgentFolders } from '../files/workspace-folders.util';
import type { Company, PrismaClient } from '@company-os/db';

type BootstrapUser = {
  id: string;
  name?: string | null;
  email: string;
};

function buildUniqueSlug(db: PrismaClient, email: string): Promise<string> {
  const baseSlug = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

  return (async () => {
    let slug = baseSlug;
    let i = 1;
    while (await db.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i}`;
      i++;
    }
    return slug;
  })();
}

export async function createCompanyForUser(
  db: PrismaClient,
  user: BootstrapUser,
  name: string,
): Promise<Company> {
  const settings = await db.platformCreditSettings.findUnique({
    where: { id: 'default' },
  });
  const freeTierAmount = settings?.freeTierAmount ?? 20;
  const slug = await buildUniqueSlug(db, user.email);

  return db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        ownerUserId: user.id,
        name,
        slug,
        onboardingCompletedAt: new Date(),
      },
    });

    await tx.creditBalance.create({
      data: {
        companyId: company.id,
        amount: freeTierAmount,
        currency: 'USD',
      },
    });

    await tx.creditLedger.create({
      data: {
        companyId: company.id,
        type: 'CREDIT',
        amount: freeTierAmount,
        balanceAfter: freeTierAmount,
        currency: 'USD',
        description: 'Free tier credit',
      },
    });

    await tx.workspaceSettings.create({
      data: {
        companyId: company.id,
        displayName: name,
      },
    });

    await ensureWorkspaceAgentFolders(tx, { companyId: company.id });

    const ownerRole = await tx.role.findUnique({ where: { name: 'owner' } });
    if (ownerRole) {
      await tx.companyMember.upsert({
        where: { companyId_userId: { companyId: company.id, userId: user.id } },
        update: { roleId: ownerRole.id },
        create: {
          companyId: company.id,
          userId: user.id,
          roleId: ownerRole.id,
        },
      });
    }

    return company;
  });
}
```

**Nota:** `onboardingCompletedAt: new Date()` é setado na criação pois a empresa é criada pelo admin (já está onboardada). O onboarding do usuário (modal de perfil) é separado.

- [ ] **Step 2: Atualizar `workspace-context.service.ts`**

Substituir o conteúdo por (remover toda lógica de PersonalSpace):

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVE_COMPANY_COOKIE,
  getActiveCompanyIdFromRequest,
} from '../company/company-context.util';
import { ensureWorkspaceAgentFolders } from '../files/workspace-folders.util';

export type WorkspaceScope = { type: 'company'; companyId: string };

export type ResolvedWorkspace = WorkspaceScope & {
  userId: string;
};

@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  getActiveWorkspaceIdFromRequest(req: Request): string | undefined {
    return getActiveCompanyIdFromRequest(req);
  }

  async resolveFromRequest(userId: string, req: Request): Promise<ResolvedWorkspace> {
    const activeId = this.getActiveWorkspaceIdFromRequest(req);

    if (!activeId) {
      throw new BadRequestException('Nenhuma empresa ativa selecionada. Selecione uma empresa para continuar.');
    }

    await this.assertCompanyAccess(userId, activeId);
    return { type: 'company', companyId: activeId, userId };
  }

  async assertCompanyAccess(userId: string, companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { members: { where: { userId } } },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const isOwner = company.ownerUserId === userId;
    const isMember = company.members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this company');
    }

    if (!company.onboardingCompletedAt) {
      throw new BadRequestException('Company onboarding is incomplete');
    }

    return company;
  }

  async listAccessibleWorkspaces(userId: string) {
    const ownedCompanies = await this.prisma.company.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'asc' },
    });

    const memberCompanies = await this.prisma.companyMember.findMany({
      where: { userId },
      include: { company: true },
    });

    const companyMap = new Map<string, (typeof ownedCompanies)[number]>();
    for (const company of ownedCompanies) {
      companyMap.set(company.id, company);
    }
    for (const membership of memberCompanies) {
      companyMap.set(membership.company.id, membership.company);
    }

    return {
      companies: [...companyMap.values()],
    };
  }

  async ensureCompanyAgentFolders(companyId: string) {
    await ensureWorkspaceAgentFolders(this.prisma, { companyId });
  }

  async ensureCompanyWorkspaceSettings(companyId: string, displayName?: string) {
    const existing = await this.prisma.workspaceSettings.findUnique({
      where: { companyId },
    });
    if (existing) return existing;

    return this.prisma.workspaceSettings.create({
      data: {
        companyId,
        displayName: displayName ?? null,
      },
    });
  }

  static activeWorkspaceCookie = ACTIVE_COMPANY_COOKIE;
}
```

- [ ] **Step 3: Atualizar `getHomeDestination()` em `company.service.ts`**

Localizar o método `getHomeDestination` e substituir por:

```typescript
async getHomeDestination(ownerUserId: string): Promise<'onboarding' | 'dashboard'> {
  const companies = await this.listAccessibleCompanies(ownerUserId);
  const onboarded = companies.filter((company) => company.onboardingCompletedAt);
  return onboarded.length > 0 ? 'dashboard' : 'onboarding';
}
```

Também atualizar o tipo `HomeDestination` no topo do arquivo:

```typescript
export type HomeDestination = 'onboarding' | 'dashboard';
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -50
```

Corrigir quaisquer erros de tipo relacionados a `PersonalSpace` ou `personal-space` que apareçam.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/company/ apps/api/src/workspace/
git commit -m "refactor(auth): remove personal space, workspace context is company-only"
```

---

## Task 4: Backend — Admin Module + Endpoint Create Company

**Files:**
- Create: `apps/api/src/admin/admin.guard.ts`
- Create: `apps/api/src/admin/admin.service.ts`
- Create: `apps/api/src/admin/admin.controller.ts`
- Create: `apps/api/src/admin/admin.module.ts`
- Create: `apps/api/src/admin/dto/create-company.dto.ts`
- Modify: `apps/api/src/app.module.ts` (importar AdminModule)

**Interfaces:**
- Produces: `POST /api/admin/companies` — body `{ name, ownerEmail, ownerName? }` → `{ company, owner }`
- `AdminGuard` verifica `user.userType === 'ADMIN'`, lança `ForbiddenException` caso contrário.

- [ ] **Step 1: Criar `admin.guard.ts`**

```typescript
// apps/api/src/admin/admin.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req as any).currentUser?.id;

    if (!userId) throw new ForbiddenException('Not authenticated');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
```

- [ ] **Step 2: Criar `dto/create-company.dto.ts`**

```typescript
// apps/api/src/admin/dto/create-company.dto.ts
import { z } from 'zod';

export const createCompanyDtoSchema = z.object({
  name: z.string().min(2).max(100),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(2).max(100).optional(),
});

export type CreateCompanyDto = z.infer<typeof createCompanyDtoSchema>;
```

- [ ] **Step 3: Criar `admin.service.ts`**

```typescript
// apps/api/src/admin/admin.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CreateCompanyDto } from './dto/create-company.dto';
import { createCompanyForUser } from '../company/company-bootstrap.util';
import { getAuthInstance } from '../auth/register-better-auth';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCompanyWithOwner(dto: CreateCompanyDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: dto.ownerEmail, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(`Já existe um usuário com o email ${dto.ownerEmail}`);
    }

    const userId = randomUUID();
    const accountId = randomUUID();

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          email: dto.ownerEmail,
          name: dto.ownerName ?? dto.ownerEmail,
          emailVerified: true,
          userType: 'BUSINESS',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Credential account sem senha — usuário só acessa após definir via reset-password
      await tx.account.create({
        data: {
          id: accountId,
          userId: newUser.id,
          accountId: newUser.id,
          providerId: 'credential',
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return newUser;
    });

    const company = await createCompanyForUser(this.prisma.getClient(), user, dto.name);

    await this.sendFirstAccessEmail(dto.ownerEmail);

    return { company, owner: { id: user.id, email: user.email, name: user.name } };
  }

  private async sendFirstAccessEmail(email: string) {
    const auth = getAuthInstance();
    if (!auth) {
      this.logger.warn('Auth instance not available, skipping first-access email');
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:3000';

    try {
      await (auth as any).api.forgetPassword({
        body: {
          email,
          redirectTo: `${frontendUrl}/auth/reset-password`,
        },
        headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
      });
    } catch (err) {
      this.logger.error(`Failed to send first-access email to ${email}`, err);
      throw new BadRequestException('Empresa criada mas falha ao enviar email. Tente reenviar o convite.');
    }
  }
}
```

- [ ] **Step 4: Criar `admin.controller.ts`**

```typescript
// apps/api/src/admin/admin.controller.ts
import { Body, Controller, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import type { Request } from 'express';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { createCompanyDtoSchema, type CreateCompanyDto } from './dto/create-company.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('companies')
  @UsePipes(new ZodValidationPipe(createCompanyDtoSchema))
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.adminService.createCompanyWithOwner(dto);
  }
}
```

**Nota:** Verificar o caminho correto do `ZodValidationPipe`. Checar em `apps/api/src/pipes/` ou `apps/api/src/common/`. Se não existir, criar:

```typescript
// apps/api/src/pipes/zod-validation.pipe.ts (se não existir)
import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
```

- [ ] **Step 5: Criar `admin.module.ts`**

```typescript
// apps/api/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
```

- [ ] **Step 6: Registrar `AdminModule` em `app.module.ts`**

Localizar `apps/api/src/app.module.ts` e adicionar `AdminModule` ao array `imports`:

```typescript
import { AdminModule } from './admin/admin.module';

// Dentro de @Module({ imports: [...] })
AdminModule,
```

- [ ] **Step 7: Verificar TypeScript e testar endpoint manualmente**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```

Subir API e testar:
```bash
curl -X POST http://localhost:3001/api/admin/companies \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie-de-admin>" \
  -d '{"name":"Empresa Teste","ownerEmail":"teste@example.com","ownerName":"João Silva"}'
```

Saída esperada: `{ "company": { "id": "...", "name": "Empresa Teste", ... }, "owner": { ... } }`

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/admin/ apps/api/src/app.module.ts
git commit -m "feat(admin): create company + owner endpoint with first-access email"
```

---

## Task 5: Backend — Endpoint de Perfil do Usuário

**Files:**
- Modify: `apps/api/src/users/users.controller.ts`
- Modify: `apps/api/src/users/users.service.ts`
- Modify: `apps/api/src/users/dto/` (adicionar schema de perfil)

**Interfaces:**
- Produces: `GET /api/user/me` → `{ id, name, email, cpf, phone, onboardingCompletedAt, userType }`
- Produces: `PATCH /api/user/profile` — body `{ name, cpf, phone }` → mesmo shape de `/me`

- [ ] **Step 1: Criar schema de perfil em `apps/api/src/users/dto/`**

Verificar o nome exato do arquivo de DTO existente em `apps/api/src/users/dto/`. Criar ou adicionar ao arquivo existente:

```typescript
// apps/api/src/users/dto/user-profile.dto.ts
import { z } from 'zod';

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

export const updateProfileDtoSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  cpf: z
    .string()
    .regex(cpfRegex, 'CPF deve estar no formato 000.000.000-00')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(10)
    .max(20)
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileDto = z.infer<typeof updateProfileDtoSchema>;
```

- [ ] **Step 2: Adicionar métodos ao `UsersService`**

Localizar `apps/api/src/users/users.service.ts` e adicionar os dois métodos:

```typescript
async getMe(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      phone: true,
      onboardingCompletedAt: true,
      userType: true,
    },
  });
  if (!user) throw new NotFoundException('User not found');
  return user;
}

async updateProfile(userId: string, dto: UpdateProfileDto) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundException('User not found');

  const isFirstTime = user.onboardingCompletedAt === null;

  const updated = await this.prisma.user.update({
    where: { id: userId },
    data: {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.cpf !== undefined ? { cpf: dto.cpf || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      ...(isFirstTime ? { onboardingCompletedAt: new Date() } : {}),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      phone: true,
      onboardingCompletedAt: true,
      userType: true,
    },
  });

  return updated;
}
```

Assegurar que `UpdateProfileDto` está importado no service.

- [ ] **Step 3: Adicionar endpoints ao `UsersController`**

Localizar `apps/api/src/users/users.controller.ts`. Adicionar:

```typescript
import { updateProfileDtoSchema, type UpdateProfileDto } from './dto/user-profile.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

// Dentro da classe UsersController:

@Get('me')
getMe(@CurrentUser() user: { id: string }) {
  return this.usersService.getMe(user.id);
}

@Patch('profile')
@UsePipes(new ZodValidationPipe(updateProfileDtoSchema))
updateProfile(
  @CurrentUser() user: { id: string },
  @Body() dto: UpdateProfileDto,
) {
  return this.usersService.updateProfile(user.id, dto);
}
```

Verificar como `@CurrentUser()` é obtido no projeto (existe decorator em `apps/api/src/auth/decorators/`). Se o controller usa `@Req()`, adaptar:

```typescript
@Get('me')
getMe(@Req() req: Request) {
  return this.usersService.getMe((req as any).currentUser.id);
}

@Patch('profile')
@UsePipes(new ZodValidationPipe(updateProfileDtoSchema))
updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
  return this.usersService.updateProfile((req as any).currentUser.id, dto);
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/users/
git commit -m "feat(user): add GET /user/me and PATCH /user/profile endpoints"
```

---

## Task 6: Backend — Refatorar Invite de Membros

**Files:**
- Modify: `apps/api/src/users/members.service.ts`
- Modify: `packages/types/src/` (atualizar `InviteMemberDto`)

**Interfaces:**
- `inviteMember(actorUserId, req, dto)` agora: pré-cria usuário se não existir + envia email de primeiro acesso.
- `InviteMemberDto` muda: `roleId` torna-se opcional (default = role 'member').

- [ ] **Step 1: Atualizar `InviteMemberDto` em packages/types**

Localizar o arquivo que define `InviteMemberDto` em `packages/types/src/` e atualizar:

```typescript
// packages/types/src/workspace.ts (ou onde InviteMemberDto está definido)
export const inviteMemberDtoSchema = z.object({
  email: z.string().email(),
  roleId: z.string().optional(),
});

export type InviteMemberDto = z.infer<typeof inviteMemberDtoSchema>;
```

- [ ] **Step 2: Atualizar `MembersService.inviteMember()`**

Substituir o método `inviteMember` em `apps/api/src/users/members.service.ts`:

```typescript
async inviteMember(actorUserId: string, req: Request, dto: InviteMemberDto) {
  const companyId = await this.resolveCompanyId(actorUserId, req);

  const frontendUrl =
    process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:3000';

  let user = await this.prisma.user.findFirst({
    where: { email: { equals: dto.email, mode: 'insensitive' } },
  });

  const isNewUser = !user;

  if (!user) {
    const userId = randomUUID();
    user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          email: dto.email,
          name: dto.email,
          emailVerified: true,
          userType: 'BUSINESS',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.account.create({
        data: {
          id: randomUUID(),
          userId: newUser.id,
          accountId: newUser.id,
          providerId: 'credential',
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return newUser;
    });
  }

  // Resolve role: use provided roleId or default to 'member' role
  let role = dto.roleId
    ? await this.prisma.role.findUnique({ where: { id: dto.roleId } })
    : await this.prisma.role.findUnique({ where: { name: 'member' } });

  if (!role) {
    role = await this.prisma.role.findFirst({ where: { isSystem: true, name: { not: 'owner' } } });
  }
  if (!role) throw new NotFoundException('Cargo padrão não encontrado');

  const existingMembership = await this.prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: user.id } },
  });

  if (existingMembership) {
    throw new ConflictException('Este usuário já faz parte desta empresa');
  }

  await this.prisma.companyMember.create({
    data: {
      companyId,
      userId: user.id,
      roleId: role.id,
    },
  });

  if (isNewUser) {
    await this.sendMemberInviteEmail(user.email, frontendUrl);
  }

  await this.audit.write({
    actorUserId,
    targetUserId: user.id,
    action: 'member.invite',
    resourceType: 'CompanyMember',
    resourceId: user.id,
    metadata: { companyId, roleId: role.id, roleName: role.name, isNewUser },
  });

  return this.listMembers(actorUserId, req).then((members) =>
    members.find((member) => member.id === user!.id),
  );
}

private async sendMemberInviteEmail(email: string, frontendUrl: string) {
  const auth = getAuthInstance();
  if (!auth) return;

  try {
    await (auth as any).api.forgetPassword({
      body: { email, redirectTo: `${frontendUrl}/auth/reset-password` },
      headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
    });
  } catch (err) {
    this.logger.warn(`Failed to send invite email to ${email}`, err);
  }
}
```

Adicionar as importações necessárias ao topo do arquivo:

```typescript
import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { getAuthInstance } from '../auth/register-better-auth';
```

E adicionar `private readonly logger = new Logger(MembersService.name);` na classe.

- [ ] **Step 3: Verificar TypeScript**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/users/members.service.ts packages/types/src/
git commit -m "feat(members): invite pre-creates user and sends first-access email"
```

---

## Task 7: Frontend — Remover Rota de Signup + Limpar Login Page

**Files:**
- Modify: `apps/web/src/app/[locale]/auth/signup/page.tsx` (redirecionar para login)
- Modify: `apps/web/src/core/modules/auth/pages/login-page.tsx`

**Interfaces:**
- `/auth/signup` redireciona para `/auth/login` (componente permanece, só a rota muda).
- `LoginPage` sem link "Criar conta" e sem botões Google/Apple.

- [ ] **Step 1: Tornar a rota signup um redirecionamento**

Abrir `apps/web/src/app/[locale]/auth/signup/page.tsx` e substituir o conteúdo por:

```typescript
import { redirect } from 'next/navigation';

export default function SignupPage() {
  redirect('/auth/login');
}
```

- [ ] **Step 2: Limpar `LoginPage` — remover link de signup**

Localizar em `login-page.tsx` o parágrafo com "Não tem uma conta?" e remover:

```tsx
// REMOVER este bloco inteiro:
<p className="mt-6 text-center text-[13px] text-[var(--fg-tertiary)]">
  Não tem uma conta?{" "}
  <Link href="/auth/signup" ...>
    Criar conta
  </Link>
</p>
```

- [ ] **Step 3: Remover Google/Apple OAuth da LoginPage**

Remover os seguintes blocos de `login-page.tsx`:
1. A `div` com separador "ou continue com"
2. Os botões Google e Apple
3. As funções `GoogleIcon`, `AppleIcon`, `handleGoogleSignIn`
4. O estado `const [socialLoading, setSocialLoading] = useState<"google" | null>(null)`
5. O tipo `SocialSignIn`

- [ ] **Step 4: Remover lógica de email-not-verified do `onSubmit`**

No método `onSubmit` de `login-page.tsx`, remover o bloco:

```typescript
// REMOVER:
if (
  error.code === "EMAIL_NOT_VERIFIED" ||
  error.message?.toLowerCase().includes("email not verified") ||
  error.message?.toLowerCase().includes("email não verificado")
) {
  toast.error("Seu email ainda não foi verificado. Verifique sua caixa de entrada.");
  router.push(`/auth/verify-email?email=${encodeURIComponent(values.email)}`);
  return;
}
```

Substituir pelo erro genérico já existente: `toast.error(error.message ?? "Email ou senha incorretos.");`

- [ ] **Step 5: Remover tipos e imports desnecessários de `login-page.tsx`**

Após as remoções, checar se algum import ficou sem uso (ex.: `useState` se não houver mais estado local). Remover imports órfãos.

- [ ] **Step 6: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\[locale\]/auth/signup/ apps/web/src/core/modules/auth/
git commit -m "feat(auth): disable signup route, remove social oauth from login"
```

---

## Task 8: Frontend — Atualizar proxy.ts

**Files:**
- Modify: `apps/web/src/proxy.ts`

**Interfaces:**
- `/auth/signup` → redireciona para `/auth/login` antes mesmo de render.
- `/onboarding` não é mais uma rota pública especial — usuário autenticado é redirecionado para `/dashboard`.
- Lógica de personal space removida.

- [ ] **Step 1: Atualizar `proxy.ts`**

Substituir o conteúdo do arquivo por:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { stripLocalePrefix, withLocalePrefix } from "./i18n/locale-path";
import { routing } from "./i18n/routing";

const AUTH_PREFIX = "/auth";
const DASHBOARD_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";
const AUTH_API_PREFIX = "/api/auth";
const API_PREFIX = "/api";
const SYSTEM_PREFIX = "/system";
const PUBLIC_ROUTE_PREFIXES = [AUTH_PREFIX, SYSTEM_PREFIX];
const ACTIVE_COMPANY_COOKIE = "blister-active-company-id";
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

const handleI18nRouting = createIntlMiddleware(routing);

function redirect(request: NextRequest, pathname: string) {
  const { locale } = stripLocalePrefix(request.nextUrl.pathname);
  const localizedPath = withLocalePrefix(pathname, locale);
  return NextResponse.redirect(new URL(localizedPath, request.url));
}

function buildLoginRedirectPath(request: NextRequest) {
  const { pathname } = stripLocalePrefix(request.nextUrl.pathname);
  const next = `${pathname}${request.nextUrl.search}`;
  return `${AUTH_PREFIX}/login?next=${encodeURIComponent(next)}`;
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function getSession(request: NextRequest) {
  const response = await fetch(
    `${API_BASE_URL}${AUTH_API_PREFIX}/get-session`,
    {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  return response.json();
}

async function companyBelongsToUser(
  request: NextRequest,
  companyId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/companies`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return false;

    const companies = (await response.json()) as Array<{ id: string }>;
    return companies.some((company) => company.id === companyId);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(API_PREFIX) || pathname.startsWith(SYSTEM_PREFIX)) {
    return NextResponse.next();
  }

  const intlResponse = handleI18nRouting(request);

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const { pathname: localizedPathname } = stripLocalePrefix(
    request.nextUrl.pathname,
  );

  // Signup is invite-only — redirect to login
  if (localizedPathname === "/auth/signup") {
    return redirect(request, `${AUTH_PREFIX}/login`);
  }

  try {
    const session = await getSession(request);
    const isAuthenticated = Boolean(session?.session && session?.user);
    const isAuthRoute = localizedPathname.startsWith(AUTH_PREFIX);
    const isDashboardRoute = localizedPathname.startsWith(DASHBOARD_PREFIX);
    const isAdminRoute = localizedPathname.startsWith(ADMIN_PREFIX);

    if (localizedPathname === "/") {
      return redirect(
        request,
        isAuthenticated ? DASHBOARD_PREFIX : `${AUTH_PREFIX}/login`,
      );
    }

    if (!isAuthenticated) {
      if (!isPublicRoute(localizedPathname)) {
        return redirect(request, buildLoginRedirectPath(request));
      }
      return intlResponse;
    }

    if (isAuthRoute) {
      return redirect(request, DASHBOARD_PREFIX);
    }

    if (isDashboardRoute) {
      const activeCompanyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value;
      if (
        activeCompanyId &&
        activeCompanyId !== "personal" &&
        activeCompanyId !== "__personal__"
      ) {
        const isValid = await companyBelongsToUser(request, activeCompanyId);
        if (!isValid) {
          const response = intlResponse;
          response.cookies.delete(ACTIVE_COMPANY_COOKIE);
          return response;
        }
      }
      return intlResponse;
    }

    if (isAdminRoute) {
      return intlResponse;
    }

    return intlResponse;
  } catch (error) {
    console.error("Proxy failed to resolve request state", error);

    if (!isPublicRoute(localizedPathname)) {
      return redirect(request, buildLoginRedirectPath(request));
    }

    return intlResponse;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_vercel|.*\\..*).*)",
  ],
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/proxy.ts
git commit -m "refactor(proxy): remove personal-space logic, block signup redirect"
```

---

## Task 9: Frontend — Onboarding Modal de Perfil no Dashboard

**Files:**
- Modify: `apps/web/src/app/[locale]/onboarding/page.tsx` (redirecionar para dashboard)
- Create: `apps/web/src/core/modules/onboarding/components/onboarding-profile-modal.tsx`
- Create: `apps/web/src/core/modules/onboarding/hooks/use-user-profile.ts`
- Modify: `apps/web/src/app/[locale]/dashboard/layout.tsx` (envolver com modal)

**Interfaces:**
- `GET /api/user/me` → usado pelo hook `useUserProfile()` via TanStack Query.
- `PATCH /api/user/profile` → usado por `useUpdateProfile()`.
- Modal exibe quando `user.onboardingCompletedAt === null`.

- [ ] **Step 1: Redirecionar a rota `/onboarding`**

Substituir o conteúdo de `apps/web/src/app/[locale]/onboarding/page.tsx` por:

```typescript
import { redirect } from 'next/navigation';

export default function OnboardingPage() {
  redirect('/dashboard');
}
```

A página `onboarding-page.tsx` em `core/modules/onboarding/` pode permanecer no FS (componente não usado), mas a rota não exibe mais conteúdo.

- [ ] **Step 2: Criar hook `use-user-profile.ts`**

```typescript
// apps/web/src/core/modules/onboarding/hooks/use-user-profile.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  onboardingCompletedAt: string | null;
  userType: string;
};

export type UpdateProfilePayload = {
  name?: string;
  cpf?: string;
  phone?: string;
};

async function fetchUserProfile(): Promise<UserProfile> {
  const { data } = await axios.get<UserProfile>("/api/user/me");
  return data;
}

async function patchUserProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const { data } = await axios.patch<UserProfile>("/api/user/profile", payload);
  return data;
}

export function useUserProfile() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: fetchUserProfile,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchUserProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(["user", "me"], updated);
    },
  });
}
```

- [ ] **Step 3: Criar `onboarding-profile-modal.tsx`**

```typescript
// apps/web/src/core/modules/onboarding/components/onboarding-profile-modal.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BrandLogo } from "src/core/shared/components/brand-logo";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { useUpdateProfile, useUserProfile } from "../hooks/use-user-profile";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z
    .string()
    .regex(cpfRegex, "CPF deve estar no formato 000.000.000-00")
    .optional()
    .or(z.literal("")),
  phone: z.string().min(10, "Telefone inválido").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function OnboardingProfileModal() {
  const { data: profile, isLoading } = useUserProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const isOpen = !isLoading && profile?.onboardingCompletedAt === null;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      name: profile?.name ?? "",
      cpf: "",
      phone: "",
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    try {
      await updateProfile({
        name: values.name,
        ...(values.cpf ? { cpf: values.cpf } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
      });
      toast.success("Perfil configurado com sucesso!");
    } catch {
      toast.error("Erro ao salvar perfil. Tente novamente.");
    }
  }

  if (isLoading || !isOpen) return null;

  return (
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 flex justify-center">
            <BrandLogo className="h-8 w-auto" />
          </div>
          <DialogTitle>Complete seu perfil</DialogTitle>
          <DialogDescription>
            Preencha suas informações para começar a usar a plataforma.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Começar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Adicionar o modal ao layout do dashboard**

Localizar `apps/web/src/app/[locale]/dashboard/layout.tsx`. Adicionar o modal ao final do JSX retornado:

```typescript
import { OnboardingProfileModal } from "src/core/modules/onboarding/components/onboarding-profile-modal";

// Dentro do componente de layout, envolver o children:
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* layout existente */}
      {children}
      <OnboardingProfileModal />
    </>
  );
}
```

Se o layout for um Server Component, mover o `OnboardingProfileModal` para um Client Component wrapper separado, ou garantir que o arquivo do modal tem `"use client"` (já tem).

- [ ] **Step 5: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\[locale\]/onboarding/ apps/web/src/core/modules/onboarding/ apps/web/src/app/\[locale\]/dashboard/
git commit -m "feat(onboarding): user profile modal on first login replaces company onboarding page"
```

---

## Task 10: Frontend — Admin Dashboard: Tab de Criar Empresa

**Files:**
- Create: `apps/web/src/core/modules/platform-admin/components/companies-admin-tab.tsx`
- Modify: `apps/web/src/core/modules/platform-admin/pages/platform-admin-page.tsx`
- Modify: `apps/web/src/core/modules/platform-admin/hooks/use-platform-admin-tab.ts` (adicionar tab 'companies')

**Interfaces:**
- Nova tab `"companies"` no painel admin.
- `POST /api/admin/companies` com `{ name, ownerEmail, ownerName? }`.

- [ ] **Step 1: Criar `companies-admin-tab.tsx`**

```typescript
// apps/web/src/core/modules/platform-admin/components/companies-admin-tab.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import axios from "axios";

const createCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  ownerEmail: z.string().email("Email inválido"),
  ownerName: z.string().min(2).optional().or(z.literal("")),
});

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;

async function createCompany(data: CreateCompanyFormValues) {
  const { data: result } = await axios.post("/api/admin/companies", {
    name: data.name,
    ownerEmail: data.ownerEmail,
    ...(data.ownerName ? { ownerName: data.ownerName } : {}),
  });
  return result;
}

export function CompaniesAdminTab() {
  const form = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      ownerEmail: "",
      ownerName: "",
    },
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createCompany,
    onSuccess: (result) => {
      toast.success(`Empresa "${result.company.name}" criada. Email enviado para ${result.owner.email}.`);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Erro ao criar empresa.");
    },
  });

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5" />
            <CardTitle>Criar Nova Empresa</CardTitle>
          </div>
          <CardDescription>
            Cria a empresa e envia um email de primeiro acesso para o responsável.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutateAsync(data))}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da empresa *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Ltda" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do responsável (owner) *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="owner@empresa.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do responsável (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Criando..." : "Criar empresa e enviar convite"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar tab 'companies' no hook de tabs**

Localizar `apps/web/src/core/modules/platform-admin/hooks/use-platform-admin-tab.ts`. Verificar quais tabs estão definidas e adicionar `'companies'` ao union type e ao array de tabs válidas.

```typescript
// Localizar o tipo de tabs (ex: 'overview' | 'admins' | 'support' | ...)
// Adicionar 'companies' ao union:
type PlatformAdminTab = 'overview' | 'admins' | 'support' | 'agents' | 'ai-catalog' | 'system-ai' | 'credits' | 'companies';
```

- [ ] **Step 3: Atualizar `PlatformAdminPage` para incluir a tab**

Em `platform-admin-page.tsx`, adicionar após os imports existentes:

```typescript
import { CompaniesAdminTab } from "../components/companies-admin-tab";
```

E no JSX, adicionar a condição:

```tsx
{tab === "companies" && <CompaniesAdminTab />}
```

Também adicionar um botão/tab de navegação no `PlatformAdminPageLayout`. Localizar o componente de layout de tabs admin (`platform-admin-page-layout.tsx`) e adicionar "Empresas" como opção. O valor da tab deve ser `"companies"`.

- [ ] **Step 4: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/platform-admin/
git commit -m "feat(admin): add Companies tab to platform admin for creating companies"
```

---

## Task 11: Frontend — Atualizar Form de Invite de Membros

**Files:**
- Localizar o componente de invite de membros em `apps/web/src/core/modules/settings/` ou `apps/web/src/core/modules/workspace/`
- Modify: componente de invite (remover campo de busca de usuário existente, manter email + roleId opcional)

**Interfaces:**
- Form de invite: campo `email` (obrigatório) + campo `role` (opcional, dropdown).
- Remove mensagem/validação "usuário precisa ter conta".
- Chama `POST /api/members/invite` com `{ email, roleId? }`.

- [ ] **Step 1: Localizar o componente de invite**

```bash
grep -r "inviteMember\|invite-member\|InviteMember" apps/web/src --include="*.tsx" -l
```

Identificar o arquivo correto.

- [ ] **Step 2: Atualizar o form de invite**

Localizar o schema Zod do form e remover qualquer validação que exija `roleId` obrigatório:

```typescript
const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  roleId: z.string().optional(),
});
```

Remover qualquer texto que diga "o usuário precisa ter uma conta" ou mensagem similar.

- [ ] **Step 3: Atualizar o payload enviado à API**

Assegurar que a chamada à API envia:

```typescript
await axios.post("/api/members/invite", {
  email: values.email,
  ...(values.roleId ? { roleId: values.roleId } : {}),
});
```

- [ ] **Step 4: Atualizar mensagem de sucesso**

Trocar a mensagem de sucesso para:

```typescript
toast.success(`Convite enviado para ${values.email}. Um email de acesso foi disparado.`);
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/
git commit -m "feat(members): invite form accepts email-only, no pre-existing account required"
```

---

## Self-Review Checklist

### Cobertura dos requisitos:
- [x] Todo usuário pertence a uma empresa (Task 3: workspace context company-only; Task 4: empresa criada junto ao owner)
- [x] Somente admin cria empresa (Task 4: AdminGuard; Task 10: form no admin dashboard)
- [x] Não existe mais página de cadastro (Task 7: rota redireciona; Task 2: endpoint bloqueado)
- [x] Sem espaço pessoal (Task 3: removido do WorkspaceContextService e bootstrap)
- [x] Admin cria empresa + owner email → email de primeiro acesso (Task 4)
- [x] Primeiro login pede troca de senha (Task 2: fluxo forgetPassword existente reutilizado)
- [x] Após troca de senha + login → onboarding modal de perfil (Task 9: detecta `onboardingCompletedAt === null`)
- [x] Owner convida membros pelo email → mesmo fluxo (Task 6 + Task 11)
- [x] Onboarding coleta nome, CPF, telefone (Task 9)
- [x] Google/Apple OAuth removido (Task 7)

### Dependências entre tasks:
- Task 1 (DB) deve ser executada antes de Tasks 4, 5, 6, 9.
- Task 2 (better-auth) deve ser executada antes de Tasks 4, 6.
- Task 4 depende de Task 3 (company-bootstrap sem personalSpace).
- Tasks 7, 8, 9, 10, 11 são independentes entre si mas dependem das tasks de backend.
