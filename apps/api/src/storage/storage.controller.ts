import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { CompanyService } from '../company/company.service';
import { StorageService } from './storage.service';
import {
  presignedDownloadQuerySchema,
  presignedUploadBodySchema,
} from './dto/storage.dto';
import {
  companyScopePrefix,
  extractCompanySlugFromKey,
  isKeyInCompanyScope,
  isKeyInPendingScope,
  pendingCompanyScopePrefix,
  sanitizeKeyHint,
} from './storage-path.util';

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly companyService: CompanyService,
  ) {}

  private async resolveUploadScope(userId: string, req: Request) {
    const companies = await this.companyService.listByOwner(userId);
    const activeCompanyId = req.cookies?.['blister-active-company-id'] as
      | string
      | undefined;
    const headerCompanyId = req.headers['x-blister-company-id'];
    const requestedId =
      typeof headerCompanyId === 'string'
        ? headerCompanyId
        : activeCompanyId;

    if (requestedId) {
      const selected = companies.find((company) => company.id === requestedId);
      if (selected) {
        return { slug: selected.slug, isPending: !selected.onboardingCompletedAt };
      }
    }

    const incomplete = companies.find(
      (company) => !company.onboardingCompletedAt,
    );
    if (incomplete) {
      return { slug: incomplete.slug, isPending: true };
    }

    if (companies.length === 1) {
      return {
        slug: companies[0].slug,
        isPending: !companies[0].onboardingCompletedAt,
      };
    }

    return { slug: `_pending/${userId}`, isPending: true };
  }

  private async assertKeyAccess(userId: string, key: string) {
    const slug = extractCompanySlugFromKey(key);
    if (!slug) {
      throw new ForbiddenException('Invalid storage key');
    }

    if (slug.startsWith('_pending/')) {
      const pendingUserId = slug.slice('_pending/'.length);
      if (pendingUserId !== userId) {
        throw new ForbiddenException('Key does not belong to the current user');
      }
      return;
    }

    const companies = await this.companyService.listByOwner(userId);
    const ownsCompany = companies.some((company) => company.slug === slug);
    if (!ownsCompany) {
      throw new ForbiddenException('Key does not belong to the current user');
    }
  }

  @Post('presigned-upload')
  async getPresignedUpload(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = presignedUploadBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);

    const scope = await this.resolveUploadScope(user.id, req);
    const scopedKey = `${companyScopePrefix(scope.slug)}${sanitizeKeyHint(parsed.data.key)}`;

    return this.storageService.getPresignedUploadUrl(
      scopedKey,
      parsed.data.mimeType,
    );
  }

  /** Browser upload via API — avoids S3 CORS configuration on the client. */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async uploadFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('keyHint') keyHint?: string,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;

    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    const scope = await this.resolveUploadScope(user.id, req);
    const hint = keyHint
      ? sanitizeKeyHint(keyHint)
      : `assets/${Date.now()}-${file.originalname}`;
    const scopedKey = `${companyScopePrefix(scope.slug)}${hint}`;

    await this.storageService.uploadObject(scopedKey, file.buffer, file.mimetype);

    return { key: scopedKey };
  }

  @Get('presigned-download')
  async getPresignedDownload(@Req() req: Request, @Query() query: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = presignedDownloadQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);

    await this.assertKeyAccess(user.id, parsed.data.key);

    const url = await this.storageService.getPresignedDownloadUrl(
      parsed.data.key,
    );
    return { url };
  }
}

export {
  companyScopePrefix,
  pendingCompanyScopePrefix,
  isKeyInCompanyScope,
  isKeyInPendingScope,
} from './storage-path.util';
