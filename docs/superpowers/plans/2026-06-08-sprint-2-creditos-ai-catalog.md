# Sprint 2 — Credits + AI Catalog + Admin Settings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the credits module (ledger, balance, history), AI Catalog admin (providers, models, pipeline, RAG settings, company management), and expose credit balance in the dashboard header.

**Architecture:** Two new NestJS modules (`credits`, `ai-catalog`) registered in `AppModule`. AI Catalog is entirely protected by `PlatformRoleGuard`. Frontend extends the existing `platform-admin` module with new tabs (AI Catalog, Pipeline, RAG, Credits) and adds a `CreditBadge` to the dashboard header.

**Tech Stack:** NestJS 11, Prisma, CASL (`@RequirePermission`, `PlatformRoleGuard`), React 19, TanStack Query, RHF + zodResolver, nuqs, Tailwind v4, shadcn/ui, Zod v4.

**Prerequisite:** Sprint 1 completed (`CompanyModule` with `CompanyService` available).

---

## File Map

### Backend (`apps/api/src/`)
| File | Action | Responsibility |
|------|--------|----------------|
| `credits/credits.module.ts` | Create | NestJS module |
| `credits/credits.service.ts` | Create | balance, debit, credit, adjust, checkBalance |
| `credits/credits.controller.ts` | Create | `GET /api/empresa/creditos`, `GET /api/empresa/creditos/historico` |
| `credits/dto/credits.dto.ts` | Create | Zod schemas |
| `ai-catalog/ai-catalog.module.ts` | Create | NestJS module (protected by PlatformRoleGuard) |
| `ai-catalog/providers.service.ts` | Create | AiProvider + AiProviderCredential CRUD |
| `ai-catalog/models.service.ts` | Create | AiModel CRUD |
| `ai-catalog/policies.service.ts` | Create | AgentModelPolicy + PipelineAgentConfig CRUD |
| `ai-catalog/platform-settings.service.ts` | Create | PlatformCreditSettings + RagPlatformSettings |
| `ai-catalog/platform-companies.service.ts` | Create | Company listing + manual credit adjustment |
| `ai-catalog/ai-catalog.controller.ts` | Create | All `/api/platform/...` endpoints |
| `app.module.ts` | Modify | Import CreditsModule + AiCatalogModule |

### Frontend (`apps/web/src/`)
| File | Action | Responsibility |
|------|--------|----------------|
| `core/modules/credits/components/credit-badge.tsx` | Create | Credit balance badge in header |
| `core/modules/credits/hooks/use-credits.ts` | Create | TanStack Query with 60s auto-refetch |
| `core/modules/platform-admin/hooks/use-platform-settings.ts` | Create | TanStack Query platform settings |
| `core/modules/platform-admin/hooks/use-ai-catalog.ts` | Create | TanStack Query providers + models |
| `core/modules/platform-admin/components/ai-catalog-tab.tsx` | Create | AI Catalog tab (providers + models) |
| `core/modules/platform-admin/components/rag-settings-tab.tsx` | Create | RAG Settings tab |
| `core/modules/platform-admin/components/credits-platform-tab.tsx` | Create | Platform Credits tab |
| `core/modules/platform-admin/pages/platform-admin-page.tsx` | Modify | Add new tabs |
| `core/modules/dashboard/components/dashboard-shell.tsx` | Modify | Add CreditBadge to header |

### packages/types
| File | Action | Responsibility |
|------|--------|----------------|
| `packages/types/src/credits.ts` | Create | Credit Zod schemas |
| `packages/types/src/ai-catalog.ts` | Create | AI Catalog admin Zod schemas |
| `packages/types/src/index.ts` | Modify | Re-export new schemas |

---

## Task 1 — Shared Zod Schemas (packages/types)

**Files:**
- Create: `packages/types/src/credits.ts`
- Create: `packages/types/src/ai-catalog.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Create credit schemas**

```typescript
// packages/types/src/credits.ts
import { z } from 'zod';

export const creditBalanceSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  amount: z.string(), // Decimal serialized as string by Prisma
  currency: z.string(),
  updatedAt: z.string(),
});
export type CreditBalance = z.infer<typeof creditBalanceSchema>;

export const creditLedgerEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUST', 'REFUND']),
  amount: z.string(),
  balanceAfter: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
});
export type CreditLedgerEntry = z.infer<typeof creditLedgerEntrySchema>;

export const creditSummarySchema = z.object({
  balance: creditBalanceSchema,
  ledger: z.array(creditLedgerEntrySchema),
});
export type CreditSummary = z.infer<typeof creditSummarySchema>;

export const creditHistorySchema = z.object({
  items: z.array(creditLedgerEntrySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type CreditHistory = z.infer<typeof creditHistorySchema>;

export const adjustCreditSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUST']),
  reason: z.string().min(1),
});
export type AdjustCreditDto = z.infer<typeof adjustCreditSchema>;
```

- [ ] **Step 2: Create AI catalog schemas**

```typescript
// packages/types/src/ai-catalog.ts
import { z } from 'zod';

export const aiProviderSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  isEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const createAiProviderSchema = z.object({
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(120),
  isEnabled: z.boolean().optional().default(true),
});
export type CreateAiProviderDto = z.infer<typeof createAiProviderSchema>;

export const updateAiProviderSchema = createAiProviderSchema.partial();
export type UpdateAiProviderDto = z.infer<typeof updateAiProviderSchema>;

export const addCredentialSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1),
});
export type AddCredentialDto = z.infer<typeof addCredentialSchema>;

export const aiModelSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  externalId: z.string(),
  name: z.string(),
  isEnabled: z.boolean(),
  inputCostPer1k: z.string(),
  outputCostPer1k: z.string(),
  maxTokens: z.number().nullable(),
  capabilities: z.array(z.string()),
});
export type AiModel = z.infer<typeof aiModelSchema>;

export const createAiModelSchema = z.object({
  providerId: z.string(),
  externalId: z.string().min(1),
  name: z.string().min(1).max(120),
  isEnabled: z.boolean().optional().default(true),
  inputCostPer1k: z.number().positive(),
  outputCostPer1k: z.number().positive(),
  maxTokens: z.number().int().positive().optional(),
  capabilities: z.array(z.string()).optional().default([]),
});
export type CreateAiModelDto = z.infer<typeof createAiModelSchema>;

export const updateAiModelSchema = createAiModelSchema
  .omit({ providerId: true, externalId: true })
  .partial();
export type UpdateAiModelDto = z.infer<typeof updateAiModelSchema>;

export const agentPolicySchema = z.object({
  agentId: z.string(),
  modelId: z.string(),
  markupMultiplier: z.string(),
  isEnabled: z.boolean(),
  minCostPerRun: z.string().nullable(),
});
export type AgentPolicy = z.infer<typeof agentPolicySchema>;

export const updateAgentPolicySchema = z.object({
  modelId: z.string().optional(),
  markupMultiplier: z.number().positive().optional(),
  isEnabled: z.boolean().optional(),
  minCostPerRun: z.number().positive().nullable().optional(),
});
export type UpdateAgentPolicyDto = z.infer<typeof updateAgentPolicySchema>;

export const pipelineAgentConfigSchema = z.object({
  agentId: z.string(),
  sortOrder: z.number(),
  isEnabled: z.boolean(),
});
export type PipelineAgentConfig = z.infer<typeof pipelineAgentConfigSchema>;

export const updatePipelineSchema = z.object({
  agents: z.array(z.object({
    agentId: z.string(),
    sortOrder: z.number().int(),
    isEnabled: z.boolean(),
  })),
});
export type UpdatePipelineDto = z.infer<typeof updatePipelineSchema>;

export const platformCreditSettingsSchema = z.object({
  freeTierAmount: z.string(),
  currency: z.string(),
  markupDefault: z.string(),
  minRunCost: z.string(),
});
export type PlatformCreditSettings = z.infer<typeof platformCreditSettingsSchema>;

export const updateCreditSettingsSchema = z.object({
  freeTierAmount: z.number().positive().optional(),
  markupDefault: z.number().positive().optional(),
  minRunCost: z.number().positive().optional(),
});
export type UpdateCreditSettingsDto = z.infer<typeof updateCreditSettingsSchema>;

export const ragPlatformSettingsSchema = z.object({
  chunkSize: z.number(),
  chunkOverlap: z.number(),
  topK: z.number(),
  rerankEnabled: z.boolean(),
  embeddingModelId: z.string().nullable(),
  captionModelId: z.string().nullable(),
});
export type RagPlatformSettings = z.infer<typeof ragPlatformSettingsSchema>;

export const updateRagSettingsSchema = z.object({
  chunkSize: z.number().int().positive().optional(),
  chunkOverlap: z.number().int().min(0).optional(),
  topK: z.number().int().positive().optional(),
  rerankEnabled: z.boolean().optional(),
  embeddingModelId: z.string().nullable().optional(),
  captionModelId: z.string().nullable().optional(),
});
export type UpdateRagSettingsDto = z.infer<typeof updateRagSettingsSchema>;

export const platformCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ownerEmail: z.string(),
  creditBalance: z.string().nullable(),
  onboardingCompletedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PlatformCompany = z.infer<typeof platformCompanySchema>;
```

- [ ] **Step 3: Re-export from index.ts**

```typescript
// Add at the end of packages/types/src/index.ts:
export * from './credits';
export * from './ai-catalog';
```

- [ ] **Step 4: Build**

```bash
cd packages/types && pnpm build
# Expected: no compilation errors
```

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/
git commit -m "feat(types): add credits + ai-catalog Zod schemas"
```

---

## Task 2 — Credits Module (backend)

**Files:**
- Create: `apps/api/src/credits/credits.module.ts`
- Create: `apps/api/src/credits/credits.service.ts`
- Create: `apps/api/src/credits/credits.controller.ts`
- Create: `apps/api/src/credits/dto/credits.dto.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// apps/api/src/credits/dto/credits.dto.ts
import { z } from 'zod';

export const creditHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
```

- [ ] **Step 2: Create CreditService**

```typescript
// apps/api/src/credits/credits.service.ts
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getBalance(companyId: string) {
    const balance = await this.prisma.creditBalance.findUnique({
      where: { companyId },
    });
    if (!balance) throw new NotFoundException('Credit balance not found');
    return balance;
  }

  async checkBalance(companyId: string, estimatedCost: number) {
    const balance = await this.getBalance(companyId);
    if (Number(balance.amount) < estimatedCost) {
      throw new UnprocessableEntityException('Insufficient credit balance');
    }
  }

  async getSummary(companyId: string) {
    const [balance, ledger] = await Promise.all([
      this.getBalance(companyId),
      this.prisma.creditLedger.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return { balance, ledger };
  }

  async getHistory(companyId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.creditLedger.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.creditLedger.count({ where: { companyId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async debit(
    companyId: string,
    amount: number,
    description?: string,
    agentRunStepId?: string,
    agentRunId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUniqueOrThrow({
        where: { companyId },
      });
      const newAmount = Number(balance.amount) - amount;
      if (newAmount < 0) {
        throw new UnprocessableEntityException('Insufficient credit balance');
      }
      await tx.creditBalance.update({
        where: { companyId },
        data: { amount: newAmount },
      });
      return tx.creditLedger.create({
        data: {
          companyId,
          type: 'DEBIT',
          amount,
          balanceAfter: newAmount,
          currency: balance.currency,
          description,
          agentRunStepId,
          agentRunId,
        },
      });
    });
  }

  async credit(companyId: string, amount: number, description?: string) {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUniqueOrThrow({
        where: { companyId },
      });
      const newAmount = Number(balance.amount) + amount;
      await tx.creditBalance.update({
        where: { companyId },
        data: { amount: newAmount },
      });
      return tx.creditLedger.create({
        data: {
          companyId,
          type: 'CREDIT',
          amount,
          balanceAfter: newAmount,
          currency: balance.currency,
          description,
        },
      });
    });
  }

  async adjust(
    companyId: string,
    amount: number,
    type: 'CREDIT' | 'DEBIT' | 'ADJUST',
    adminUserId: string,
    reason: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUniqueOrThrow({
        where: { companyId },
      });
      const delta = type === 'DEBIT' ? -amount : amount;
      const newAmount = Math.max(0, Number(balance.amount) + delta);
      await tx.creditBalance.update({
        where: { companyId },
        data: { amount: newAmount },
      });
      return tx.creditLedger.create({
        data: {
          companyId,
          type,
          amount,
          balanceAfter: newAmount,
          currency: balance.currency,
          description: reason,
          createdByUserId: adminUserId,
        },
      });
    });
    await this.audit.write({
      actorUserId: adminUserId,
      action: 'credit.adjust',
      resourceType: 'CreditBalance',
      resourceId: companyId,
      metadata: { amount, type, reason },
    });
    return result;
  }
}
```

- [ ] **Step 3: Create CreditsController**

```typescript
// apps/api/src/credits/credits.controller.ts
import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CompanyService } from '../empresa/empresa.service';
import { CreditService } from './credits.service';
import { creditHistoryQuerySchema } from './dto/credits.dto';

@Controller('empresa/creditos')
export class CreditsController {
  constructor(
    private readonly creditService: CreditService,
    private readonly companyService: CompanyService,
  ) {}

  @Get()
  @RequirePermission('credit.read')
  async getSummary(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const company = await this.companyService.findByOwnerOrThrow(user.id);
    return this.creditService.getSummary(company.id);
  }

  @Get('historico')
  @RequirePermission('credit.read')
  async getHistory(@Req() req: Request, @Query() query: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = creditHistoryQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const company = await this.companyService.findByOwnerOrThrow(user.id);
    return this.creditService.getHistory(
      company.id,
      parsed.data.page,
      parsed.data.pageSize,
    );
  }
}
```

- [ ] **Step 4: Create CreditsModule**

```typescript
// apps/api/src/credits/credits.module.ts
import { Module } from '@nestjs/common';
import { CreditService } from './credits.service';
import { CreditsController } from './credits.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyModule } from '../empresa/empresa.module';

@Module({
  imports: [PrismaModule, AuditModule, CompanyModule],
  controllers: [CreditsController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditsModule {}
```

- [ ] **Step 5: Register in AppModule**

```typescript
// apps/api/src/app.module.ts — add:
import { CreditsModule } from './credits/credits.module';
// In imports: [..., CreditsModule]
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/credits/ apps/api/src/app.module.ts
git commit -m "feat(api): credits module (balance, ledger, debit/credit/adjust)"
```

---

## Task 3 — AI Catalog: Providers and Models Services

**Files:**
- Create: `apps/api/src/ai-catalog/providers.service.ts`
- Create: `apps/api/src/ai-catalog/models.service.ts`
- Create: `apps/api/src/ai-catalog/dto/ai-catalog.dto.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// apps/api/src/ai-catalog/dto/ai-catalog.dto.ts
import { z } from 'zod';

export const createProviderSchema = z.object({
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(120),
  isEnabled: z.boolean().optional().default(true),
});

export const updateProviderSchema = createProviderSchema.partial();

export const addCredentialSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1),
});

export const createModelSchema = z.object({
  providerId: z.string(),
  externalId: z.string().min(1),
  name: z.string().min(1).max(120),
  isEnabled: z.boolean().optional().default(true),
  inputCostPer1k: z.number().positive(),
  outputCostPer1k: z.number().positive(),
  maxTokens: z.number().int().positive().optional(),
  capabilities: z.array(z.string()).optional().default([]),
});

export const updateModelSchema = createModelSchema
  .omit({ providerId: true, externalId: true })
  .partial();

export const updateAgentPolicySchema = z.object({
  modelId: z.string().optional(),
  markupMultiplier: z.number().positive().optional(),
  isEnabled: z.boolean().optional(),
  minCostPerRun: z.number().positive().nullable().optional(),
});

export const updatePipelineSchema = z.object({
  agents: z.array(
    z.object({
      agentId: z.string(),
      sortOrder: z.number().int(),
      isEnabled: z.boolean(),
    }),
  ),
});

export const updateCreditSettingsSchema = z.object({
  freeTierAmount: z.number().positive().optional(),
  markupDefault: z.number().positive().optional(),
  minRunCost: z.number().positive().optional(),
});

export const updateRagSettingsSchema = z.object({
  chunkSize: z.number().int().positive().optional(),
  chunkOverlap: z.number().int().min(0).optional(),
  topK: z.number().int().positive().optional(),
  rerankEnabled: z.boolean().optional(),
  embeddingModelId: z.string().nullable().optional(),
  captionModelId: z.string().nullable().optional(),
});

export const adjustCompanyCreditSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUST']),
  reason: z.string().min(1),
});

export const platformCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});
```

- [ ] **Step 2: Create ProvidersService**

```typescript
// apps/api/src/ai-catalog/providers.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { z } from 'zod';
import type {
  createProviderSchema,
  updateProviderSchema,
  addCredentialSchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.aiProvider.findMany({
      include: {
        credentials: {
          select: { id: true, label: true, isActive: true, createdAt: true },
        },
        _count: { select: { models: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: z.infer<typeof createProviderSchema>) {
    return this.prisma.aiProvider.create({ data: dto });
  }

  async update(id: string, dto: z.infer<typeof updateProviderSchema>) {
    return this.prisma.aiProvider.update({ where: { id }, data: dto });
  }

  async addCredential(providerId: string, dto: z.infer<typeof addCredentialSchema>) {
    // TODO: encrypt dto.value before storing in production
    return this.prisma.aiProviderCredential.create({
      data: {
        providerId,
        label: dto.label,
        encryptedValue: dto.value,
      },
    });
  }

  async deleteCredential(credId: string) {
    return this.prisma.aiProviderCredential.delete({ where: { id: credId } });
  }
}
```

- [ ] **Step 3: Create ModelsService**

```typescript
// apps/api/src/ai-catalog/models.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { z } from 'zod';
import type { createModelSchema, updateModelSchema } from './dto/ai-catalog.dto';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.aiModel.findMany({
      include: {
        provider: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ providerId: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: z.infer<typeof createModelSchema>) {
    return this.prisma.aiModel.create({ data: dto });
  }

  async update(id: string, dto: z.infer<typeof updateModelSchema>) {
    return this.prisma.aiModel.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    return this.prisma.aiModel.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai-catalog/
git commit -m "feat(api): ai-catalog providers + models services"
```

---

## Task 4 — AI Catalog: Policies, Settings and Platform Companies

**Files:**
- Create: `apps/api/src/ai-catalog/policies.service.ts`
- Create: `apps/api/src/ai-catalog/platform-settings.service.ts`
- Create: `apps/api/src/ai-catalog/platform-companies.service.ts`

- [ ] **Step 1: Create PoliciesService**

```typescript
// apps/api/src/ai-catalog/policies.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { z } from 'zod';
import type {
  updateAgentPolicySchema,
  updatePipelineSchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPolicies() {
    return this.prisma.agentModelPolicy.findMany({
      include: {
        model: { select: { id: true, name: true, externalId: true } },
      },
    });
  }

  async updatePolicy(
    agentId: string,
    dto: z.infer<typeof updateAgentPolicySchema>,
  ) {
    return this.prisma.agentModelPolicy.upsert({
      where: { agentId },
      update: dto,
      create: {
        agentId,
        modelId: dto.modelId!,
        markupMultiplier: dto.markupMultiplier ?? 1.2,
        isEnabled: dto.isEnabled ?? true,
        minCostPerRun: dto.minCostPerRun ?? null,
      },
    });
  }

  async getPipeline() {
    return this.prisma.pipelineAgentConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updatePipeline(dto: z.infer<typeof updatePipelineSchema>) {
    return this.prisma.$transaction(
      dto.agents.map((agent) =>
        this.prisma.pipelineAgentConfig.upsert({
          where: { agentId: agent.agentId },
          update: { sortOrder: agent.sortOrder, isEnabled: agent.isEnabled },
          create: {
            agentId: agent.agentId,
            sortOrder: agent.sortOrder,
            isEnabled: agent.isEnabled,
          },
        }),
      ),
    );
  }
}
```

- [ ] **Step 2: Create PlatformSettingsService**

```typescript
// apps/api/src/ai-catalog/platform-settings.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { z } from 'zod';
import type {
  updateCreditSettingsSchema,
  updateRagSettingsSchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSettings() {
    const [credits, rag] = await Promise.all([
      this.prisma.platformCreditSettings.findUnique({ where: { id: 'default' } }),
      this.prisma.ragPlatformSettings.findUnique({ where: { id: 'default' } }),
    ]);
    return { credits, rag };
  }

  async updateCreditSettings(
    adminUserId: string,
    dto: z.infer<typeof updateCreditSettingsSchema>,
  ) {
    const updated = await this.prisma.platformCreditSettings.upsert({
      where: { id: 'default' },
      update: { ...dto, updatedByUserId: adminUserId },
      create: {
        id: 'default',
        freeTierAmount: dto.freeTierAmount ?? 20,
        markupDefault: dto.markupDefault ?? 1.2,
        minRunCost: dto.minRunCost ?? 0.01,
        updatedByUserId: adminUserId,
      },
    });
    await this.audit.write({
      actorUserId: adminUserId,
      action: 'platform.credit_settings_updated',
      resourceType: 'PlatformCreditSettings',
      resourceId: 'default',
      metadata: dto as Record<string, unknown>,
    });
    return updated;
  }

  async updateRagSettings(dto: z.infer<typeof updateRagSettingsSchema>) {
    return this.prisma.ragPlatformSettings.upsert({
      where: { id: 'default' },
      update: dto,
      create: {
        id: 'default',
        chunkSize: dto.chunkSize ?? 512,
        chunkOverlap: dto.chunkOverlap ?? 64,
        topK: dto.topK ?? 8,
        rerankEnabled: dto.rerankEnabled ?? true,
        embeddingModelId: dto.embeddingModelId ?? null,
        captionModelId: dto.captionModelId ?? null,
      },
    });
  }
}
```

- [ ] **Step 3: Create PlatformCompaniesService**

```typescript
// apps/api/src/ai-catalog/platform-companies.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credits/credits.service';
import type { z } from 'zod';
import type {
  adjustCompanyCreditSchema,
  platformCompaniesQuerySchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class PlatformCompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {}

  async findAll(query: z.infer<typeof platformCompaniesQuerySchema>) {
    const skip = (query.page - 1) * query.pageSize;
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { slug: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          creditBalance: true,
          owner: { select: { email: true } },
        },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      items: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        ownerEmail: c.owner.email,
        creditBalance: c.creditBalance?.amount?.toString() ?? null,
        onboardingCompletedAt: c.onboardingCompletedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string) {
    return this.prisma.company.findUniqueOrThrow({
      where: { id },
      include: {
        creditBalance: true,
        owner: { select: { email: true } },
      },
    });
  }

  async adjustCredits(
    companyId: string,
    adminUserId: string,
    dto: z.infer<typeof adjustCompanyCreditSchema>,
  ) {
    return this.creditService.adjust(
      companyId,
      dto.amount,
      dto.type,
      adminUserId,
      dto.reason,
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai-catalog/
git commit -m "feat(api): ai-catalog policies, platform settings, companies admin services"
```

---

## Task 5 — AI Catalog: Controller + Module + Registration

**Files:**
- Create: `apps/api/src/ai-catalog/ai-catalog.controller.ts`
- Create: `apps/api/src/ai-catalog/ai-catalog.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create AiCatalogController**

```typescript
// apps/api/src/ai-catalog/ai-catalog.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { PlatformRoleGuard } from '../platform/guards/platform-role.guard';
import { RequirePlatformRole } from '../platform/decorators/require-platform-role.decorator';
import { ProvidersService } from './providers.service';
import { ModelsService } from './models.service';
import { PoliciesService } from './policies.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformCompaniesService } from './platform-companies.service';
import {
  createProviderSchema,
  updateProviderSchema,
  addCredentialSchema,
  createModelSchema,
  updateModelSchema,
  updateAgentPolicySchema,
  updatePipelineSchema,
  updateCreditSettingsSchema,
  updateRagSettingsSchema,
  adjustCompanyCreditSchema,
  platformCompaniesQuerySchema,
} from './dto/ai-catalog.dto';

@Controller('platform')
@UseGuards(PlatformRoleGuard)
@RequirePlatformRole('platform_admin')
export class AiCatalogController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly models: ModelsService,
    private readonly policies: PoliciesService,
    private readonly settings: PlatformSettingsService,
    private readonly companies: PlatformCompaniesService,
  ) {}

  // ── Providers ──────────────────────────────────────────────────────────────
  @Get('ai/providers')
  listProviders() {
    return this.providers.findAll();
  }

  @Post('ai/providers')
  createProvider(@Body() body: unknown) {
    const parsed = createProviderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.providers.create(parsed.data);
  }

  @Patch('ai/providers/:id')
  updateProvider(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateProviderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.providers.update(id, parsed.data);
  }

  @Post('ai/providers/:id/credentials')
  addCredential(@Param('id') providerId: string, @Body() body: unknown) {
    const parsed = addCredentialSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.providers.addCredential(providerId, parsed.data);
  }

  @Delete('ai/providers/:id/credentials/:credId')
  deleteCredential(@Param('credId') credId: string) {
    return this.providers.deleteCredential(credId);
  }

  // ── Models ─────────────────────────────────────────────────────────────────
  @Get('ai/models')
  listModels() {
    return this.models.findAll();
  }

  @Post('ai/models')
  createModel(@Body() body: unknown) {
    const parsed = createModelSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.models.create(parsed.data);
  }

  @Patch('ai/models/:id')
  updateModel(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateModelSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.models.update(id, parsed.data);
  }

  @Delete('ai/models/:id')
  deleteModel(@Param('id') id: string) {
    return this.models.delete(id);
  }

  // ── Policies ───────────────────────────────────────────────────────────────
  @Get('agents/policies')
  listPolicies() {
    return this.policies.findAllPolicies();
  }

  @Patch('agents/policies/:agentId')
  updatePolicy(@Param('agentId') agentId: string, @Body() body: unknown) {
    const parsed = updateAgentPolicySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.policies.updatePolicy(agentId, parsed.data);
  }

  // ── Pipeline ───────────────────────────────────────────────────────────────
  @Get('agents/pipeline')
  getPipeline() {
    return this.policies.getPipeline();
  }

  @Patch('agents/pipeline')
  updatePipeline(@Body() body: unknown) {
    const parsed = updatePipelineSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.policies.updatePipeline(parsed.data);
  }

  // ── Platform settings ──────────────────────────────────────────────────────
  @Get('settings')
  getSettings() {
    return this.settings.getSettings();
  }

  @Patch('settings/credits')
  @RequirePlatformRole('platform_owner')
  updateCreditSettings(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateCreditSettingsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.settings.updateCreditSettings(user.id, parsed.data);
  }

  @Patch('settings/rag')
  updateRagSettings(@Body() body: unknown) {
    const parsed = updateRagSettingsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.settings.updateRagSettings(parsed.data);
  }

  // ── Companies ──────────────────────────────────────────────────────────────
  @Get('empresas')
  listCompanies(@Query() query: unknown) {
    const parsed = platformCompaniesQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companies.findAll(parsed.data);
  }

  @Get('empresas/:id')
  getCompany(@Param('id') id: string) {
    return this.companies.findById(id);
  }

  @Post('empresas/:id/creditos/ajustar')
  @RequirePlatformRole('platform_owner')
  adjustCredits(
    @Req() req: Request,
    @Param('id') companyId: string,
    @Body() body: unknown,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = adjustCompanyCreditSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companies.adjustCredits(companyId, user.id, parsed.data);
  }
}
```

- [ ] **Step 2: Create AiCatalogModule**

```typescript
// apps/api/src/ai-catalog/ai-catalog.module.ts
import { Module } from '@nestjs/common';
import { AiCatalogController } from './ai-catalog.controller';
import { ProvidersService } from './providers.service';
import { ModelsService } from './models.service';
import { PoliciesService } from './policies.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformCompaniesService } from './platform-companies.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CreditsModule } from '../credits/credits.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [PrismaModule, AuditModule, CreditsModule, PlatformModule],
  controllers: [AiCatalogController],
  providers: [
    ProvidersService,
    ModelsService,
    PoliciesService,
    PlatformSettingsService,
    PlatformCompaniesService,
  ],
})
export class AiCatalogModule {}
```

- [ ] **Step 3: Register in AppModule**

```typescript
// apps/api/src/app.module.ts — add:
import { AiCatalogModule } from './ai-catalog/ai-catalog.module';
// In imports: [..., AiCatalogModule]
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai-catalog/ apps/api/src/app.module.ts
git commit -m "feat(api): ai-catalog module (providers, models, policies, settings, companies)"
```

---

## Task 6 — Frontend: CreditBadge

**Files:**
- Create: `apps/web/src/core/modules/credits/hooks/use-credits.ts`
- Create: `apps/web/src/core/modules/credits/components/credit-badge.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`

- [ ] **Step 1: Create useCredits hook**

```typescript
// apps/web/src/core/modules/credits/hooks/use-credits.ts
"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { CreditSummary } from "@company-os/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useCredits() {
  return useQuery<CreditSummary>({
    queryKey: ["credits"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/empresa/creditos`, {
        withCredentials: true,
      });
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 2: Create CreditBadge**

```tsx
// apps/web/src/core/modules/credits/components/credit-badge.tsx
"use client";
import { Coins } from "lucide-react";
import { useCredits } from "src/core/modules/credits/hooks/use-credits";

export function CreditBadge() {
  const { data, isLoading } = useCredits();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-xs text-[var(--fg-secondary)]">
        <Coins className="h-3.5 w-3.5" />
        <span>—</span>
      </div>
    );
  }

  const amount = data?.balance?.amount
    ? parseFloat(data.balance.amount).toFixed(2)
    : "0.00";
  const isLow = parseFloat(amount) < 2;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        isLow
          ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          : "bg-[var(--bg-subtle)] text-[var(--fg-secondary)]"
      }`}
      title={`Saldo: US$ ${amount}`}
    >
      <Coins className="h-3.5 w-3.5" />
      <span>US$ {amount}</span>
    </div>
  );
}
```

- [ ] **Step 3: Add CreditBadge to dashboard header**

In `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`, locate the header area (near the breadcrumb or page title) and add:

```tsx
import { CreditBadge } from "src/core/modules/credits/components/credit-badge";

// Inside the header, add to the right side:
<div className="ml-auto">
  <CreditBadge />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/core/modules/credits/ apps/web/src/core/modules/dashboard/
git commit -m "feat(web): CreditBadge in header with 60s auto-refetch"
```

---

## Task 7 — Frontend: Platform Admin Hooks

**Files:**
- Create: `apps/web/src/core/modules/platform-admin/hooks/use-platform-settings.ts`
- Create: `apps/web/src/core/modules/platform-admin/hooks/use-ai-catalog.ts`

- [ ] **Step 1: Create usePlatformSettings**

```typescript
// apps/web/src/core/modules/platform-admin/hooks/use-platform-settings.ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  PlatformCreditSettings,
  RagPlatformSettings,
  UpdateCreditSettingsDto,
  UpdateRagSettingsDto,
  PlatformCompany,
  AdjustCreditDto,
} from "@company-os/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function usePlatformSettings() {
  return useQuery<{
    credits: PlatformCreditSettings | null;
    rag: RagPlatformSettings | null;
  }>({
    queryKey: ["platform", "settings"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/platform/settings`, {
        withCredentials: true,
      });
      return data;
    },
  });
}

export function useUpdateCreditSettings() {
  const qc = useQueryClient();
  return useMutation<PlatformCreditSettings, Error, UpdateCreditSettingsDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.patch(
        `${API}/api/platform/settings/credits`,
        dto,
        { withCredentials: true },
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "settings"] }),
  });
}

export function useUpdateRagSettings() {
  const qc = useQueryClient();
  return useMutation<RagPlatformSettings, Error, UpdateRagSettingsDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.patch(
        `${API}/api/platform/settings/rag`,
        dto,
        { withCredentials: true },
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "settings"] }),
  });
}

export function usePlatformCompanies(page = 1, pageSize = 20, search?: string) {
  return useQuery<{
    items: PlatformCompany[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: ["platform", "companies", page, pageSize, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
      });
      const { data } = await axios.get(
        `${API}/api/platform/empresas?${params}`,
        { withCredentials: true },
      );
      return data;
    },
  });
}

export function useAdjustCompanyCredits(companyId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, AdjustCreditDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.post(
        `${API}/api/platform/empresas/${companyId}/creditos/ajustar`,
        dto,
        { withCredentials: true },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "companies"] });
    },
  });
}
```

- [ ] **Step 2: Create useAiCatalog**

```typescript
// apps/web/src/core/modules/platform-admin/hooks/use-ai-catalog.ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  AiProvider,
  AiModel,
  AgentPolicy,
  PipelineAgentConfig,
  CreateAiProviderDto,
  UpdateAiProviderDto,
  CreateAiModelDto,
  UpdateAiModelDto,
  UpdateAgentPolicyDto,
  UpdatePipelineDto,
} from "@company-os/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useAiProviders() {
  return useQuery<AiProvider[]>({
    queryKey: ["platform", "ai", "providers"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/platform/ai/providers`, {
        withCredentials: true,
      });
      return data;
    },
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation<AiProvider, Error, CreateAiProviderDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.post(
        `${API}/api/platform/ai/providers`,
        dto,
        { withCredentials: true },
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "ai", "providers"] }),
  });
}

export function useAiModels() {
  return useQuery<AiModel[]>({
    queryKey: ["platform", "ai", "models"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/platform/ai/models`, {
        withCredentials: true,
      });
      return data;
    },
  });
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation<AiModel, Error, CreateAiModelDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.post(`${API}/api/platform/ai/models`, dto, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "ai", "models"] }),
  });
}

export function useAgentPolicies() {
  return useQuery<AgentPolicy[]>({
    queryKey: ["platform", "agents", "policies"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/platform/agents/policies`, {
        withCredentials: true,
      });
      return data;
    },
  });
}

export function usePipelineConfig() {
  return useQuery<PipelineAgentConfig[]>({
    queryKey: ["platform", "agents", "pipeline"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/platform/agents/pipeline`, {
        withCredentials: true,
      });
      return data;
    },
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation<PipelineAgentConfig[], Error, UpdatePipelineDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.patch(
        `${API}/api/platform/agents/pipeline`,
        dto,
        { withCredentials: true },
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["platform", "agents", "pipeline"] }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/core/modules/platform-admin/hooks/
git commit -m "feat(web): platform-admin hooks (settings, ai-catalog, companies)"
```

---

## Task 8 — Frontend: Platform Admin Tabs

**Files:**
- Create: `apps/web/src/core/modules/platform-admin/components/ai-catalog-tab.tsx`
- Create: `apps/web/src/core/modules/platform-admin/components/rag-settings-tab.tsx`
- Create: `apps/web/src/core/modules/platform-admin/components/credits-platform-tab.tsx`
- Modify: `apps/web/src/core/modules/platform-admin/pages/platform-admin-page.tsx`

- [ ] **Step 1: Read current platform-admin-page.tsx**

```bash
cat apps/web/src/core/modules/platform-admin/pages/platform-admin-page.tsx
```

Identify which tab component and tab value structure is used.

- [ ] **Step 2: Create AiCatalogTab**

```tsx
// apps/web/src/core/modules/platform-admin/components/ai-catalog-tab.tsx
"use client";
import { useAiProviders, useAiModels } from "../hooks/use-ai-catalog";
import { Badge } from "src/core/shared/components/ui/badge";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

export function AiCatalogTab() {
  const { data: providers, isLoading: loadingProviders } = useAiProviders();
  const { data: models, isLoading: loadingModels } = useAiModels();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Providers</h3>
        {loadingProviders ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            {providers?.length === 0 && (
              <p className="p-4 text-sm text-[var(--fg-secondary)]">
                Nenhum provider cadastrado
              </p>
            )}
            {providers?.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  <code className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-xs">
                    {p.slug}
                  </code>
                </div>
                <Badge variant={p.isEnabled ? "default" : "outline"}>
                  {p.isEnabled ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Modelos</h3>
        {loadingModels ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            {models?.length === 0 && (
              <p className="p-4 text-sm text-[var(--fg-secondary)]">
                Nenhum modelo cadastrado
              </p>
            )}
            {models?.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="text-xs text-[var(--fg-secondary)]">{m.externalId}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--fg-secondary)]">
                  <span>in: ${m.inputCostPer1k}/1k</span>
                  <span>out: ${m.outputCostPer1k}/1k</span>
                  <Badge variant={m.isEnabled ? "default" : "outline"}>
                    {m.isEnabled ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Create RagSettingsTab**

```tsx
// apps/web/src/core/modules/platform-admin/components/rag-settings-tab.tsx
"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { usePlatformSettings, useUpdateRagSettings } from "../hooks/use-platform-settings";
import { Button } from "src/core/shared/components/ui/button";
import { Input } from "src/core/shared/components/ui/input";
import { Switch } from "src/core/shared/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";

const schema = z.object({
  chunkSize: z.coerce.number().int().positive(),
  chunkOverlap: z.coerce.number().int().min(0),
  topK: z.coerce.number().int().positive(),
  rerankEnabled: z.boolean(),
});

export function RagSettingsTab() {
  const { data: settings, isLoading } = usePlatformSettings();
  const { mutateAsync: update, isPending } = useUpdateRagSettings();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { chunkSize: 512, chunkOverlap: 64, topK: 8, rerankEnabled: true },
  });

  useEffect(() => {
    if (settings?.rag) {
      form.reset({
        chunkSize: settings.rag.chunkSize,
        chunkOverlap: settings.rag.chunkOverlap,
        topK: settings.rag.topK,
        rerankEnabled: settings.rag.rerankEnabled,
      });
    }
  }, [settings?.rag, form]);

  async function onSubmit(data: z.infer<typeof schema>) {
    try {
      await update(data);
      toast.success("Configurações RAG salvas");
    } catch {
      toast.error("Erro ao salvar configurações");
    }
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-md">
        <FormField
          control={form.control}
          name="chunkSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chunk Size (tokens)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="chunkOverlap"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chunk Overlap (tokens)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="topK"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Top-K</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rerankEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormLabel className="mt-0">Reranking habilitado</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Salvando..." : "Salvar configurações RAG"}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 4: Create CreditsPlatformTab**

```tsx
// apps/web/src/core/modules/platform-admin/components/credits-platform-tab.tsx
"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  usePlatformSettings,
  useUpdateCreditSettings,
  usePlatformCompanies,
} from "../hooks/use-platform-settings";
import { Button } from "src/core/shared/components/ui/button";
import { Input } from "src/core/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";

const schema = z.object({
  freeTierAmount: z.coerce.number().positive(),
  markupDefault: z.coerce.number().positive(),
  minRunCost: z.coerce.number().positive(),
});

export function CreditsPlatformTab() {
  const { data: settings, isLoading } = usePlatformSettings();
  const { mutateAsync: updateSettings, isPending } = useUpdateCreditSettings();
  const { data: companies } = usePlatformCompanies();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { freeTierAmount: 20, markupDefault: 1.2, minRunCost: 0.01 },
  });

  useEffect(() => {
    if (settings?.credits) {
      form.reset({
        freeTierAmount: parseFloat(settings.credits.freeTierAmount),
        markupDefault: parseFloat(settings.credits.markupDefault),
        minRunCost: parseFloat(settings.credits.minRunCost),
      });
    }
  }, [settings?.credits, form]);

  async function onSubmit(data: z.infer<typeof schema>) {
    try {
      await updateSettings(data);
      toast.success("Configurações de crédito salvas");
    } catch {
      toast.error("Erro ao salvar");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">Configurações Globais</h3>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-md">
              <FormField
                control={form.control}
                name="freeTierAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free Tier (US$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="markupDefault"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Markup padrão (ex: 1.2 = 20%)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-fit">
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </Form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Empresas</h3>
        <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
          {companies?.items?.length === 0 && (
            <p className="p-4 text-sm text-[var(--fg-secondary)]">
              Nenhuma empresa cadastrada
            </p>
          )}
          {companies?.items?.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-[var(--fg-secondary)]">{c.ownerEmail}</span>
              </div>
              <span className="text-sm font-mono">
                US$ {c.creditBalance ? parseFloat(c.creditBalance).toFixed(2) : "0.00"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Integrate new tabs into platform-admin-page**

After reading the current page structure (Step 1), add:

```tsx
// Add imports:
import { AiCatalogTab } from "../components/ai-catalog-tab";
import { RagSettingsTab } from "../components/rag-settings-tab";
import { CreditsPlatformTab } from "../components/credits-platform-tab";

// Add to the existing tabs array/structure:
{ value: "ai-catalog", label: "AI Catalog", content: <AiCatalogTab /> },
{ value: "rag", label: "RAG", content: <RagSettingsTab /> },
{ value: "creditos", label: "Créditos", content: <CreditsPlatformTab /> },
```

- [ ] **Step 6: Verify Switch component is available**

```bash
ls apps/web/src/core/shared/components/ui/switch.tsx 2>/dev/null || echo "needs install"
# If missing: cd apps/web && npx shadcn@latest add switch
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/core/modules/platform-admin/
git commit -m "feat(web): platform-admin tabs AI Catalog, RAG Settings, Credits"
```

---

## Sprint 2 Acceptance Checklist

- [ ] `GET /api/empresa/creditos` returns balance and last 20 ledger entries
- [ ] CreditBadge appears in dashboard header showing "US$ 20.00"
- [ ] `GET /api/platform/ai/providers` returns array (seed has OpenRouter)
- [ ] `GET /api/platform/settings` returns `{ credits: {...}, rag: {...} }`
- [ ] Platform admin page shows AI Catalog, RAG, Credits tabs
- [ ] `PATCH /api/platform/settings/credits` updates free tier amount

---

## Dependencies and Notes

- Sprint 2 depends on Sprint 1 (`CompanyModule` with `CompanyService`)
- `CreditsModule` imports `CompanyModule` — no circular dependency since `CompanyModule` does not import `CreditsModule`
- `AiCatalogModule` imports `CreditsModule` (for manual credit adjustment)
- `PlatformRoleGuard` is already implemented in `platform/guards/` — reuse as-is
- Credential encryption (`encryptedValue`) stores raw value — acceptable for MVP, encrypt in Phase 2
- Prisma Decimal serializes as string — use `parseFloat()` in frontend for display
