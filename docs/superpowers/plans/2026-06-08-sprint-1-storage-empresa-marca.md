# Sprint 1 — Storage + Company + Brand Brain

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the product backbone: S3 storage, company module (Company + BrandProfile), onboarding wizard, and Brand Brain page — unblocking all subsequent sprints.

**Architecture:** Three new NestJS modules (`storage`, `empresa`, `marca` inside empresa — folder names follow ROADMAP) registered in `AppModule`. Post-signup hook in better-auth creates `Company` + `CreditBalance` automatically. Next.js 16 proxy redirects to `/onboarding` when `onboardingCompletedAt` is null. 2-step wizard with direct S3 upload.

**Tech Stack:** NestJS 11, Prisma, `@aws-sdk/client-s3` v3 (already installed), `@aws-sdk/s3-request-presigner` (already installed), React 19, TanStack Query, RHF + zodResolver, nuqs, Tailwind v4, shadcn/ui, Zod v4.

---

## File Map

### Backend (`apps/api/src/`)
| File | Action | Responsibility |
|------|--------|----------------|
| `app.controller.ts` | Modify | Add `@Public()` to `getHealth` |
| `auth/register-better-auth.ts` | Modify | `databaseHooks.user.create.after` bootstrap + real Resend emails |
| `storage/storage.module.ts` | Create | NestJS module |
| `storage/storage.service.ts` | Create | Presigned PUT and GET via AWS SDK v3 |
| `storage/storage.controller.ts` | Create | `POST /api/storage/presigned-upload`, `GET /api/storage/presigned-download` |
| `storage/dto/storage.dto.ts` | Create | Zod schemas |
| `empresa/empresa.module.ts` | Create | NestJS module (imports StorageModule, AuditModule) |
| `empresa/empresa.service.ts` | Create | Company CRUD + bootstrap + onboarding status |
| `empresa/empresa.controller.ts` | Create | `GET /api/empresa`, `PATCH /api/empresa`, `GET /api/empresa/onboarding-status`, `POST /api/empresa/onboarding` |
| `empresa/dto/empresa.dto.ts` | Create | Zod schemas |
| `empresa/marca/marca.service.ts` | Create | BrandProfile CRUD |
| `empresa/marca/marca.controller.ts` | Create | `GET/PATCH /api/empresa/marca`, `POST /api/empresa/marca/logo` |
| `empresa/marca/dto/marca.dto.ts` | Create | Zod schemas |
| `app.module.ts` | Modify | Import StorageModule + CompanyModule |

### Frontend (`apps/web/src/`)
| File | Action | Responsibility |
|------|--------|----------------|
| `proxy.ts` | Modify | Redirect to `/onboarding` when company is not onboarded |
| `core/modules/onboarding/pages/onboarding-page.tsx` | Create | 2-step wizard |
| `core/modules/onboarding/components/step-business-info.tsx` | Create | Step 1: name + logo |
| `core/modules/onboarding/components/step-brand-voice.tsx` | Create | Step 2: brand voice |
| `core/modules/onboarding/hooks/use-onboarding.ts` | Create | TanStack Query mutations |
| `core/modules/marca/pages/brand-page.tsx` | Create | Brand Brain page |
| `core/modules/marca/components/logo-uploader.tsx` | Create | Logo upload + preview |
| `core/modules/marca/components/brand-voice-editor.tsx` | Create | Brand voice textarea |
| `core/modules/marca/hooks/use-brand.ts` | Create | TanStack Query brand |
| `app/[locale]/onboarding/page.tsx` | Create | Route `/onboarding` (outside shell) |
| `app/[locale]/dashboard/(shell)/marca/page.tsx` | Create | Route `/dashboard/marca` |
| `core/modules/dashboard/components/dashboard-shell.tsx` | Modify | Add "Cérebro da Marca" sidebar item |

### packages/types
| File | Action | Responsibility |
|------|--------|----------------|
| `packages/types/src/company.ts` | Create | Shared Zod schemas (CompanyDto, BrandProfileDto, OnboardingDto, PresignedUploadDto) |
| `packages/types/src/index.ts` | Modify | Re-export new schemas |

---

## Task 1 — Foundation Fixes

**Files:**
- Modify: `apps/api/src/app.controller.ts`
- Modify: `apps/api/src/auth/register-better-auth.ts`

- [ ] **Step 1: Add `@Public()` to health endpoint**

```typescript
// apps/api/src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth(): { service: string; status: string } {
    return this.appService.getHealth();
  }
}
```

- [ ] **Step 2: Wire real Resend emails in register-better-auth.ts**

Locate the two `logger.log` calls in the email handlers (~lines 57-66) and replace them. Add Resend import at the top:

```typescript
import { Resend } from 'resend';
```

Replace email handlers inside `options`:

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
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
      subject: 'Reset your password — Blister',
      html: `<p>Click <a href="${data.url}">here</a> to reset your password.</p>`,
    });
  },
},
emailVerification: {
  sendVerificationEmail: async (data: { user: { email: string }; url: string }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? 'Blister <noreply@blister.com.br>';
    if (!apiKey || apiKey === 'change-me') {
      logger.warn(`[DEV] Verify email for ${data.user.email}: ${data.url}`);
      return;
    }
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: data.user.email,
      subject: 'Confirm your email — Blister',
      html: `<p>Click <a href="${data.url}">here</a> to confirm your email.</p>`,
    });
  },
},
```

- [ ] **Step 3: Verify `/api/health` responds without auth**

```bash
curl -s http://localhost:3001/api/health
# Expected: {"service":"Blister API","status":"ok"}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app.controller.ts apps/api/src/auth/register-better-auth.ts
git commit -m "fix: health endpoint public, Resend wired for email/reset"
```

---

## Task 2 — Shared Zod Schemas (packages/types)

**Files:**
- Create: `packages/types/src/company.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Create company/brand schemas**

```typescript
// packages/types/src/company.ts
import { z } from 'zod';

export const presignedUploadRequestSchema = z.object({
  key: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type PresignedUploadRequest = z.infer<typeof presignedUploadRequestSchema>;

export const presignedUploadResponseSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  expiresIn: z.number(),
});
export type PresignedUploadResponse = z.infer<typeof presignedUploadResponseSchema>;

export const companyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  onboardingCompletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CompanyResponse = z.infer<typeof companyResponseSchema>;

export const updateCompanySchema = z.object({
  name: z.string().min(2).max(120),
});
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;

export const onboardingSchema = z.object({
  companyName: z.string().min(2).max(120),
  brandVoice: z.string().min(10).max(2000),
  logoStorageKey: z.string().optional(),
});
export type OnboardingDto = z.infer<typeof onboardingSchema>;

export const brandProfileResponseSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  logoStorageKey: z.string().nullable(),
  brandVoice: z.string(),
  palette: z.array(z.string()),
  typography: z.string().nullable(),
  niche: z.string().nullable(),
  description: z.string().nullable(),
  updatedAt: z.string(),
});
export type BrandProfileResponse = z.infer<typeof brandProfileResponseSchema>;

export const updateBrandProfileSchema = z.object({
  brandVoice: z.string().min(10).max(2000).optional(),
  palette: z.array(z.string()).optional(),
  typography: z.string().max(200).optional().nullable(),
  niche: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});
export type UpdateBrandProfileDto = z.infer<typeof updateBrandProfileSchema>;

export const updateLogoSchema = z.object({
  logoStorageKey: z.string().min(1),
});
export type UpdateLogoDto = z.infer<typeof updateLogoSchema>;

export const onboardingStatusSchema = z.object({
  completed: z.boolean(),
});
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
```

- [ ] **Step 2: Re-export from index.ts**

Add at the end of `packages/types/src/index.ts`:

```typescript
export * from './company';
```

- [ ] **Step 3: Build packages/types**

```bash
cd packages/types && pnpm build
# Expected: no compilation errors
```

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/company.ts packages/types/src/index.ts
git commit -m "feat(types): add company/brand Zod schemas"
```

---

## Task 3 — Storage Module (S3 Presigned URLs)

**Files:**
- Create: `apps/api/src/storage/storage.module.ts`
- Create: `apps/api/src/storage/storage.service.ts`
- Create: `apps/api/src/storage/storage.controller.ts`
- Create: `apps/api/src/storage/dto/storage.dto.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// apps/api/src/storage/dto/storage.dto.ts
import { z } from 'zod';

export const presignedUploadBodySchema = z.object({
  key: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

export const presignedDownloadQuerySchema = z.object({
  key: z.string().min(1),
});
```

- [ ] **Step 2: Create StorageService**

```typescript
// apps/api/src/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('AWS_S3_ENDPOINT');
    const forcePathStyle =
      this.config.get<string>('AWS_S3_FORCE_PATH_STYLE') === 'true';

    this.client = new S3Client({
      region: this.config.get<string>('AWS_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
      ...(endpoint ? { endpoint, forcePathStyle } : {}),
    });

    this.bucket = this.config.getOrThrow<string>('AWS_S3_BUCKET');
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn = 300,
  ): Promise<{ url: string; key: string; expiresIn: number }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return { url, key, expiresIn };
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
```

- [ ] **Step 3: Create StorageController**

```typescript
// apps/api/src/storage/storage.controller.ts
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import {
  presignedUploadBodySchema,
  presignedDownloadQuerySchema,
} from './dto/storage.dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-upload')
  async getPresignedUpload(@Body() body: unknown) {
    const parsed = presignedUploadBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.storageService.getPresignedUploadUrl(
      parsed.data.key,
      parsed.data.mimeType,
    );
  }

  @Get('presigned-download')
  async getPresignedDownload(@Query() query: unknown) {
    const parsed = presignedDownloadQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const url = await this.storageService.getPresignedDownloadUrl(parsed.data.key);
    return { url };
  }
}
```

- [ ] **Step 4: Create StorageModule**

```typescript
// apps/api/src/storage/storage.module.ts
import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 5: Register in AppModule**

Open `apps/api/src/app.module.ts` and add `StorageModule` to imports:

```typescript
import { StorageModule } from './storage/storage.module';
// Inside @Module({ imports: [..., StorageModule] })
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/storage/ apps/api/src/app.module.ts
git commit -m "feat(api): storage module with S3 presigned URLs"
```

---

## Task 4 — CompanyService + Post-Signup Bootstrap

**Files:**
- Create: `apps/api/src/empresa/empresa.module.ts`
- Create: `apps/api/src/empresa/empresa.service.ts`
- Create: `apps/api/src/empresa/dto/empresa.dto.ts`
- Modify: `apps/api/src/auth/register-better-auth.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// apps/api/src/empresa/dto/empresa.dto.ts
import { z } from 'zod';

export const updateCompanyBodySchema = z.object({
  name: z.string().min(2).max(120),
});

export const onboardingBodySchema = z.object({
  companyName: z.string().min(2).max(120),
  brandVoice: z.string().min(10).max(2000),
  logoStorageKey: z.string().optional(),
});
```

- [ ] **Step 2: Create CompanyService**

```typescript
// apps/api/src/empresa/empresa.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { z } from 'zod';
import type {
  updateCompanyBodySchema,
  onboardingBodySchema,
} from './dto/empresa.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findByOwner(ownerUserId: string) {
    return this.prisma.company.findUnique({ where: { ownerUserId } });
  }

  async findByOwnerOrThrow(ownerUserId: string) {
    const company = await this.findByOwner(ownerUserId);
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async getOnboardingStatus(ownerUserId: string) {
    const company = await this.findByOwner(ownerUserId);
    return { completed: Boolean(company?.onboardingCompletedAt) };
  }

  async updateName(
    ownerUserId: string,
    dto: z.infer<typeof updateCompanyBodySchema>,
  ) {
    const company = await this.findByOwnerOrThrow(ownerUserId);
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: { name: dto.name },
    });
    await this.audit.write({
      actorUserId: ownerUserId,
      action: 'company.update',
      resourceType: 'Company',
      resourceId: company.id,
      metadata: { name: dto.name },
    });
    return updated;
  }

  async completeOnboarding(
    ownerUserId: string,
    dto: z.infer<typeof onboardingBodySchema>,
  ) {
    const company = await this.findByOwnerOrThrow(ownerUserId);

    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: company.id },
        data: {
          name: dto.companyName,
          onboardingCompletedAt: new Date(),
        },
      });

      const existing = await tx.brandProfile.findUnique({
        where: { companyId: company.id },
      });

      if (existing) {
        await tx.brandProfile.update({
          where: { companyId: company.id },
          data: {
            brandVoice: dto.brandVoice,
            ...(dto.logoStorageKey ? { logoStorageKey: dto.logoStorageKey } : {}),
          },
        });
      } else {
        await tx.brandProfile.create({
          data: {
            companyId: company.id,
            brandVoice: dto.brandVoice,
            logoStorageKey: dto.logoStorageKey ?? null,
          },
        });
      }
    });

    await this.audit.write({
      actorUserId: ownerUserId,
      action: 'company.onboarding_completed',
      resourceType: 'Company',
      resourceId: company.id,
    });

    return this.prisma.company.findUniqueOrThrow({ where: { id: company.id } });
  }
}
```

- [ ] **Step 3: Add databaseHooks in register-better-auth.ts**

Inside `registerBetterAuth`, add `databaseHooks` to the `options` object. The prisma parameter is already available:

```typescript
// Add inside options object, after emailVerification:
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        try {
          const db = prisma.getClient();
          const existing = await db.company.findUnique({
            where: { ownerUserId: user.id },
          });
          if (existing) return;

          const settings = await db.platformCreditSettings.findUnique({
            where: { id: 'default' },
          });
          const freeTierAmount = settings?.freeTierAmount ?? 20;

          const baseSlug = user.email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 50);

          let slug = baseSlug;
          let i = 1;
          while (await db.company.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${i}`;
            i++;
          }

          await db.$transaction(async (tx) => {
            const company = await tx.company.create({
              data: {
                ownerUserId: user.id,
                name: user.name ?? user.email.split('@')[0],
                slug,
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
            await tx.user.update({
              where: { id: user.id },
              data: { userType: 'BUSINESS' },
            });
          });
        } catch (err) {
          logger.error('Failed to bootstrap company after signup', err);
        }
      },
    },
  },
},
```

- [ ] **Step 4: Verify PrismaService exposes getClient()**

```bash
grep -n "getClient" apps/api/src/prisma/prisma.service.ts
```

If not found, check how PrismaService is structured. If it extends PrismaClient directly, use `prisma` as the client. Add a `getClient()` method if needed:

```typescript
// In PrismaService — add if not present:
getClient() {
  return this;
}
```

- [ ] **Step 5: Create CompanyModule (stub — controller added in Task 6)**

```typescript
// apps/api/src/empresa/empresa.module.ts
import { Module } from '@nestjs/common';
import { CompanyService } from './empresa.service';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/empresa/ apps/api/src/auth/register-better-auth.ts
git commit -m "feat(api): company service + post-signup bootstrap (Company + CreditBalance)"
```

---

## Task 5 — BrandService (BrandProfile CRUD)

**Files:**
- Create: `apps/api/src/empresa/marca/marca.service.ts`
- Create: `apps/api/src/empresa/marca/dto/marca.dto.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// apps/api/src/empresa/marca/dto/marca.dto.ts
import { z } from 'zod';

export const updateBrandBodySchema = z.object({
  brandVoice: z.string().min(10).max(2000).optional(),
  palette: z.array(z.string()).optional(),
  typography: z.string().max(200).nullable().optional(),
  niche: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const updateLogoBodySchema = z.object({
  logoStorageKey: z.string().min(1),
});
```

- [ ] **Step 2: Create BrandService**

```typescript
// apps/api/src/empresa/marca/marca.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { z } from 'zod';
import type { updateBrandBodySchema, updateLogoBodySchema } from './dto/marca.dto';
import type { Prisma } from '../../generated/prisma';

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findByCompanyId(companyId: string) {
    return this.prisma.brandProfile.findUnique({ where: { companyId } });
  }

  async findByCompanyIdOrThrow(companyId: string) {
    const profile = await this.findByCompanyId(companyId);
    if (!profile) throw new NotFoundException('Brand profile not found');
    return profile;
  }

  async update(
    companyId: string,
    actorUserId: string,
    dto: z.infer<typeof updateBrandBodySchema>,
  ) {
    const profile = await this.findByCompanyIdOrThrow(companyId);
    const data: Prisma.BrandProfileUpdateInput = {};
    if (dto.brandVoice !== undefined) data.brandVoice = dto.brandVoice;
    if (dto.palette !== undefined) data.palette = dto.palette;
    if (dto.typography !== undefined) data.typography = dto.typography;
    if (dto.niche !== undefined) data.niche = dto.niche;
    if (dto.description !== undefined) data.description = dto.description;

    const updated = await this.prisma.brandProfile.update({
      where: { companyId },
      data,
    });
    await this.audit.write({
      actorUserId,
      action: 'brand.update',
      resourceType: 'BrandProfile',
      resourceId: profile.id,
      metadata: dto as Record<string, unknown>,
    });
    return updated;
  }

  async updateLogo(
    companyId: string,
    actorUserId: string,
    dto: z.infer<typeof updateLogoBodySchema>,
  ) {
    const profile = await this.findByCompanyIdOrThrow(companyId);
    const updated = await this.prisma.brandProfile.update({
      where: { companyId },
      data: { logoStorageKey: dto.logoStorageKey },
    });
    await this.audit.write({
      actorUserId,
      action: 'brand.logo_updated',
      resourceType: 'BrandProfile',
      resourceId: profile.id,
    });
    return updated;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/empresa/marca/
git commit -m "feat(api): brand service (BrandProfile CRUD)"
```

---

## Task 6 — Company and Brand Controllers

**Files:**
- Create: `apps/api/src/empresa/empresa.controller.ts`
- Create: `apps/api/src/empresa/marca/marca.controller.ts`
- Modify: `apps/api/src/empresa/empresa.module.ts`

- [ ] **Step 1: Create CompanyController**

```typescript
// apps/api/src/empresa/empresa.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CompanyService } from './empresa.service';
import { updateCompanyBodySchema, onboardingBodySchema } from './dto/empresa.dto';

@Controller('empresa')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @RequirePermission('company.read')
  async getCompany(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.companyService.findByOwnerOrThrow(user.id);
  }

  @Patch()
  @RequirePermission('company.update')
  async updateCompany(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateCompanyBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companyService.updateName(user.id, parsed.data);
  }

  @Get('onboarding-status')
  @RequirePermission('company.read')
  async getOnboardingStatus(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.companyService.getOnboardingStatus(user.id);
  }

  @Post('onboarding')
  @RequirePermission('company.update')
  async completeOnboarding(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = onboardingBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companyService.completeOnboarding(user.id, parsed.data);
  }
}
```

- [ ] **Step 2: Create BrandController**

```typescript
// apps/api/src/empresa/marca/marca.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../../auth/session.service';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CompanyService } from '../empresa.service';
import { BrandService } from './marca.service';
import { updateBrandBodySchema, updateLogoBodySchema } from './dto/marca.dto';

@Controller('empresa/marca')
export class BrandController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly brandService: BrandService,
  ) {}

  @Get()
  @RequirePermission('brand.read')
  async getBrand(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const company = await this.companyService.findByOwnerOrThrow(user.id);
    return this.brandService.findByCompanyId(company.id);
  }

  @Patch()
  @RequirePermission('brand.update')
  async updateBrand(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateBrandBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const company = await this.companyService.findByOwnerOrThrow(user.id);
    return this.brandService.update(company.id, user.id, parsed.data);
  }

  @Post('logo')
  @RequirePermission('brand.update')
  async updateLogo(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateLogoBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const company = await this.companyService.findByOwnerOrThrow(user.id);
    return this.brandService.updateLogo(company.id, user.id, parsed.data);
  }
}
```

- [ ] **Step 3: Update CompanyModule with controllers and BrandService**

```typescript
// apps/api/src/empresa/empresa.module.ts
import { Module } from '@nestjs/common';
import { CompanyService } from './empresa.service';
import { CompanyController } from './empresa.controller';
import { BrandService } from './marca/marca.service';
import { BrandController } from './marca/marca.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CompanyController, BrandController],
  providers: [CompanyService, BrandService],
  exports: [CompanyService, BrandService],
})
export class CompanyModule {}
```

- [ ] **Step 4: Register CompanyModule in AppModule**

Open `apps/api/src/app.module.ts`:

```typescript
import { CompanyModule } from './empresa/empresa.module';
// Inside imports: [..., CompanyModule]
```

- [ ] **Step 5: Smoke test endpoints**

```bash
# With the server running and a valid session cookie:
curl -s http://localhost:3001/api/empresa/onboarding-status \
  -H "Cookie: <session-cookie>"
# Expected: {"completed": false}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/empresa/ apps/api/src/app.module.ts
git commit -m "feat(api): company + brand controllers, CompanyModule registered"
```

---

## Task 7 — Frontend: Domain Hooks (company + brand + storage)

**Files:**
- Create: `apps/web/src/core/modules/empresa/hooks/use-company.ts`
- Create: `apps/web/src/core/modules/marca/hooks/use-brand.ts`

- [ ] **Step 1: Hook useCompany**

```typescript
// apps/web/src/core/modules/empresa/hooks/use-company.ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  CompanyResponse,
  OnboardingDto,
  UpdateCompanyDto,
  PresignedUploadResponse,
  PresignedUploadRequest,
} from "@company-os/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useCompany() {
  return useQuery<CompanyResponse>({
    queryKey: ["company"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/empresa`, {
        withCredentials: true,
      });
      return data;
    },
  });
}

export function useOnboardingStatus() {
  return useQuery<{ completed: boolean }>({
    queryKey: ["company", "onboarding-status"],
    queryFn: async () => {
      const { data } = await axios.get(
        `${API}/api/empresa/onboarding-status`,
        { withCredentials: true },
      );
      return data;
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation<CompanyResponse, Error, OnboardingDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.post(`${API}/api/empresa/onboarding`, dto, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export function usePresignedUpload() {
  return useMutation<PresignedUploadResponse, Error, PresignedUploadRequest>({
    mutationFn: async (dto) => {
      const { data } = await axios.post(
        `${API}/api/storage/presigned-upload`,
        dto,
        { withCredentials: true },
      );
      return data;
    },
  });
}
```

- [ ] **Step 2: Hook useBrand**

```typescript
// apps/web/src/core/modules/marca/hooks/use-brand.ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  BrandProfileResponse,
  UpdateBrandProfileDto,
  UpdateLogoDto,
} from "@company-os/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useBrand() {
  return useQuery<BrandProfileResponse | null>({
    queryKey: ["brand"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/empresa/marca`, {
        withCredentials: true,
      });
      return data;
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation<BrandProfileResponse, Error, UpdateBrandProfileDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.patch(`${API}/api/empresa/marca`, dto, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand"] });
    },
  });
}

export function useUpdateLogo() {
  const queryClient = useQueryClient();
  return useMutation<BrandProfileResponse, Error, UpdateLogoDto>({
    mutationFn: async (dto) => {
      const { data } = await axios.post(`${API}/api/empresa/marca/logo`, dto, {
        withCredentials: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand"] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/core/modules/empresa/ apps/web/src/core/modules/marca/hooks/
git commit -m "feat(web): hooks useCompany, useBrand, usePresignedUpload"
```

---

## Task 8 — Frontend: Onboarding Wizard

**Files:**
- Create: `apps/web/src/core/modules/onboarding/pages/onboarding-page.tsx`
- Create: `apps/web/src/core/modules/onboarding/components/step-business-info.tsx`
- Create: `apps/web/src/core/modules/onboarding/components/step-brand-voice.tsx`
- Create: `apps/web/src/app/[locale]/onboarding/page.tsx`

- [ ] **Step 1: Create StepBusinessInfo (step 1: name + logo)**

```tsx
// apps/web/src/core/modules/onboarding/components/step-business-info.tsx
"use client";
import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import axios from "axios";
import { Button } from "src/core/shared/components/ui/button";
import { Input } from "src/core/shared/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import type { OnboardingFormValues } from "../pages/onboarding-page";
import { usePresignedUpload } from "src/core/modules/empresa/hooks/use-company";

export function StepBusinessInfo({ onNext }: { onNext: () => void }) {
  const form = useFormContext<OnboardingFormValues>();
  const { mutateAsync: getPresigned } = usePresignedUpload();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const key = `logos/${Date.now()}-${file.name}`;
      const { url } = await getPresigned({ key, mimeType: file.type, sizeBytes: file.size });
      await axios.put(url, file, { headers: { "Content-Type": file.type } });
      form.setValue("logoStorageKey", key);
      setLogoPreview(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Como se chama seu negócio?</h2>
        <p className="text-sm text-[var(--fg-secondary)]">
          Esse nome aparecerá nas suas peças.
        </p>
      </div>

      <FormField
        control={form.control}
        name="companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do negócio</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Confeitaria da Ana" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-col gap-2">
        <FormLabel>Logo (opcional)</FormLabel>
        {logoPreview ? (
          <img
            src={logoPreview}
            alt="Logo preview"
            className="h-20 w-20 rounded-lg object-contain border border-[var(--border)]"
          />
        ) : (
          <div
            className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] text-xs text-[var(--fg-secondary)] hover:border-[var(--accent)] transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            + Logo
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoChange}
        />
        {logoPreview && (
          <button
            type="button"
            className="text-xs text-[var(--fg-secondary)] underline w-fit"
            onClick={() => fileRef.current?.click()}
          >
            Trocar logo
          </button>
        )}
      </div>

      <Button
        type="button"
        onClick={onNext}
        disabled={!form.watch("companyName") || uploading}
        className="w-full"
      >
        {uploading ? "Enviando..." : "Continuar"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create StepBrandVoice (step 2: brand voice)**

```tsx
// apps/web/src/core/modules/onboarding/components/step-brand-voice.tsx
"use client";
import { useFormContext } from "react-hook-form";
import { Button } from "src/core/shared/components/ui/button";
import { Textarea } from "src/core/shared/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import type { OnboardingFormValues } from "../pages/onboarding-page";

const VOICE_EXAMPLES = [
  "Descontraído, próximo, como uma conversa com amigo",
  "Profissional e direto ao ponto, sem firulas",
  "Caloroso e acolhedor, como receber alguém em casa",
];

export function StepBrandVoice({
  onBack,
  submitting,
}: {
  onBack: () => void;
  submitting: boolean;
}) {
  const form = useFormContext<OnboardingFormValues>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Como você se comunica?</h2>
        <p className="text-sm text-[var(--fg-secondary)]">
          Descreva o jeito que você fala com seus clientes.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-[var(--fg-secondary)]">Exemplos:</p>
        <div className="flex flex-col gap-1">
          {VOICE_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="text-left text-xs rounded border border-[var(--border)] px-3 py-2 hover:bg-[var(--bg-subtle)] transition-colors"
              onClick={() => form.setValue("brandVoice", example)}
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      <FormField
        control={form.control}
        name="brandVoice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tom de voz</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva como você fala com seus clientes..."
                rows={4}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={submitting}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!form.watch("brandVoice") || submitting}
        >
          {submitting ? "Salvando..." : "Começar"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create OnboardingPage**

```tsx
// apps/web/src/core/modules/onboarding/pages/onboarding-page.tsx
"use client";
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandLogo } from "src/core/shared/components/brand-logo";
import { StepBusinessInfo } from "../components/step-business-info";
import { StepBrandVoice } from "../components/step-brand-voice";
import { useCompleteOnboarding } from "src/core/modules/empresa/hooks/use-company";

const schema = z.object({
  companyName: z.string().min(2, "Mínimo 2 caracteres"),
  brandVoice: z.string().min(10, "Mínimo 10 caracteres"),
  logoStorageKey: z.string().optional(),
});

export type OnboardingFormValues = z.infer<typeof schema>;

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { mutateAsync: completeOnboarding, isPending } = useCompleteOnboarding();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { companyName: "", brandVoice: "", logoStorageKey: undefined },
  });

  async function handleSubmit(data: OnboardingFormValues) {
    try {
      await completeOnboarding(data);
      toast.success("Tudo pronto! Bem-vindo ao Blister.");
      router.push("/dashboard");
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] p-6">
      <div className="mb-8">
        <BrandLogo className="h-10 w-auto" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-8 shadow-sm">
        <div className="mb-6 flex gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                <StepBusinessInfo onNext={() => setStep(1)} />
              </div>
            )}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                <StepBrandVoice onBack={() => setStep(0)} submitting={isPending} />
              </div>
            )}
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `/onboarding` route**

```tsx
// apps/web/src/app/[locale]/onboarding/page.tsx
import { OnboardingPage } from "src/core/modules/onboarding/pages/onboarding-page";

export default function Page() {
  return <OnboardingPage />;
}
```

- [ ] **Step 5: Verify shadcn Textarea is available**

```bash
ls apps/web/src/core/shared/components/ui/textarea.tsx 2>/dev/null || echo "needs install"
# If missing: cd apps/web && npx shadcn@latest add textarea
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/onboarding/ apps/web/src/app/
git commit -m "feat(web): onboarding wizard (business info + brand voice steps)"
```

---

## Task 9 — Frontend: Onboarding Redirect in Proxy

**Files:**
- Modify: `apps/web/src/proxy.ts`

- [ ] **Step 1: Add onboarding check in proxy**

In `proxy.ts`, inside the `proxy` function, after `const isAuthenticated = ...` and before the final auth route handling, add:

```typescript
const ONBOARDING_PATH = '/onboarding';
const isOnboardingRoute = localizedPathname === ONBOARDING_PATH;

// Redirect to onboarding if dashboard route and company not onboarded
if (isAuthenticated && isDashboardRoute) {
  try {
    const onboardingRes = await fetch(
      `${API_BASE_URL}/api/empresa/onboarding-status`,
      {
        method: 'GET',
        headers: {
          cookie: request.headers.get('cookie') ?? '',
          accept: 'application/json',
        },
        cache: 'no-store',
      },
    );
    if (onboardingRes.ok) {
      const onboardingData = (await onboardingRes.json()) as { completed: boolean };
      if (!onboardingData.completed) {
        return redirect(request, ONBOARDING_PATH);
      }
    }
  } catch {
    // On failure, allow through — don't block the user
  }
}

// Redirect authenticated user away from /onboarding if already completed
if (isAuthenticated && isOnboardingRoute) {
  try {
    const onboardingRes = await fetch(
      `${API_BASE_URL}/api/empresa/onboarding-status`,
      {
        method: 'GET',
        headers: {
          cookie: request.headers.get('cookie') ?? '',
          accept: 'application/json',
        },
        cache: 'no-store',
      },
    );
    if (onboardingRes.ok) {
      const onboardingData = (await onboardingRes.json()) as { completed: boolean };
      if (onboardingData.completed) {
        return redirect(request, DASHBOARD_PREFIX);
      }
    }
  } catch {}
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/proxy.ts
git commit -m "feat(web): proxy redirects to /onboarding when company not onboarded"
```

---

## Task 10 — Frontend: Brand Brain Page

**Files:**
- Create: `apps/web/src/core/modules/marca/components/logo-uploader.tsx`
- Create: `apps/web/src/core/modules/marca/components/brand-voice-editor.tsx`
- Create: `apps/web/src/core/modules/marca/pages/brand-page.tsx`
- Create: `apps/web/src/app/[locale]/dashboard/(shell)/marca/page.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`

- [ ] **Step 1: Create LogoUploader**

```tsx
// apps/web/src/core/modules/marca/components/logo-uploader.tsx
"use client";
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { usePresignedUpload } from "src/core/modules/empresa/hooks/use-company";
import { useUpdateLogo } from "src/core/modules/marca/hooks/use-brand";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function LogoUploader({ currentKey }: { currentKey: string | null | undefined }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: getPresigned } = usePresignedUpload();
  const { mutateAsync: updateLogo } = useUpdateLogo();

  const displaySrc = preview
    ? preview
    : currentKey
      ? `${API}/api/storage/presigned-download?key=${encodeURIComponent(currentKey)}`
      : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const key = `logos/${Date.now()}-${file.name}`;
      const { url } = await getPresigned({ key, mimeType: file.type, sizeBytes: file.size });
      await axios.put(url, file, { headers: { "Content-Type": file.type } });
      await updateLogo({ logoStorageKey: key });
      setPreview(URL.createObjectURL(file));
      toast.success("Logo atualizado");
    } catch {
      toast.error("Não foi possível atualizar o logo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative h-24 w-24 cursor-pointer rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-subtle)] hover:border-[var(--accent)] transition-colors"
        onClick={() => !uploading && fileRef.current?.click()}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt="Brand logo"
            className="h-full w-full rounded-xl object-contain p-1"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--fg-secondary)]">
            + Logo
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 rounded-full bg-[var(--accent)] p-1">
          <Pencil className="h-3 w-3 text-white" />
        </div>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <p className="text-xs text-[var(--fg-secondary)]">JPG, PNG ou SVG · máx. 5MB</p>
    </div>
  );
}
```

- [ ] **Step 2: Create BrandVoiceEditor**

```tsx
// apps/web/src/core/modules/marca/components/brand-voice-editor.tsx
"use client";
import { useState } from "react";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { Button } from "src/core/shared/components/ui/button";
import { useUpdateBrand } from "src/core/modules/marca/hooks/use-brand";
import { toast } from "sonner";

export function BrandVoiceEditor({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const { mutateAsync: update, isPending } = useUpdateBrand();

  async function handleSave() {
    try {
      await update({ brandVoice: value });
      toast.success("Tom de voz salvo");
      setDirty(false);
    } catch {
      toast.error("Erro ao salvar");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        rows={5}
        placeholder="Descreva como você fala com seus clientes..."
        className="resize-none"
      />
      {dirty && (
        <Button onClick={handleSave} disabled={isPending} className="w-fit">
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create BrandPage**

```tsx
// apps/web/src/core/modules/marca/pages/brand-page.tsx
"use client";
import { Brain } from "lucide-react";
import { useBrand } from "src/core/modules/marca/hooks/use-brand";
import { LogoUploader } from "src/core/modules/marca/components/logo-uploader";
import { BrandVoiceEditor } from "src/core/modules/marca/components/brand-voice-editor";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

export function BrandPage() {
  const { data: brand, isLoading } = useBrand();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-[var(--accent)]" />
        <div>
          <h1 className="text-xl font-semibold">Cérebro da Marca</h1>
          <p className="text-sm text-[var(--fg-secondary)]">
            As informações que moldam todo conteúdo gerado
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-24 rounded-xl" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-6">
            <h2 className="text-sm font-medium text-[var(--fg-secondary)] uppercase tracking-wide">
              Logo
            </h2>
            <LogoUploader currentKey={brand?.logoStorageKey} />
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium text-[var(--fg-secondary)] uppercase tracking-wide">
                Tom de Voz
              </h2>
              <p className="text-xs text-[var(--fg-secondary)]">
                Como você se comunica com seus clientes
              </p>
            </div>
            <BrandVoiceEditor initial={brand?.brandVoice ?? ""} />
          </section>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `/dashboard/marca` route**

```tsx
// apps/web/src/app/[locale]/dashboard/(shell)/marca/page.tsx
import { BrandPage } from "src/core/modules/marca/pages/brand-page";

export default function Page() {
  return <BrandPage />;
}
```

- [ ] **Step 5: Add Brand Brain to sidebar**

In `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`, add the Brain import and a new nav group:

```typescript
import { Brain } from "lucide-react";

// Inside navGroups array, add before the settings group:
{
  label: "Marketing",
  items: [
    {
      label: "Cérebro da Marca",
      href: "/dashboard/marca",
      icon: Brain,
      match: (p: string) => p.startsWith("/dashboard/marca"),
    },
  ],
},
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/marca/ apps/web/src/app/ apps/web/src/core/modules/dashboard/
git commit -m "feat(web): Brand Brain page with logo uploader and brand voice editor"
```

---

## Sprint 1 Acceptance Checklist

- [ ] `GET /api/health` returns `{"service":"Blister API","status":"ok"}` without auth
- [ ] Signup creates Company + CreditBalance automatically (verify in DB)
- [ ] Accessing `/dashboard` as a new user redirects to `/onboarding`
- [ ] Onboarding wizard completes and redirects to `/dashboard`
- [ ] `GET /api/empresa/onboarding-status` returns `{"completed":true}` after onboarding
- [ ] `/dashboard/marca` accessible, sidebar shows "Cérebro da Marca"
- [ ] Logo upload works (with S3 configured), `PATCH /api/empresa/marca` saves brand voice

---

## Dependencies and Notes

- `packages/types` must be built before API and Web (`pnpm --filter @company-os/types build`)
- Post-signup hook uses `prisma.getClient()` — verify `PrismaService` exposes this method
- Animations `animate-in fade-in slide-in-from-right-4` require `tw-animate-css` (already in stack)
- S3 direct upload requires bucket CORS to allow the frontend origin in production
