import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { DeleteObjectCommand, PutBucketCorsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  let send: jest.Mock;

  beforeEach(async () => {
    send = jest.fn();
    (getSignedUrl as jest.Mock).mockResolvedValue('https://uploads.test/signed');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const values: Record<string, string> = {
                AWS_REGION: 'us-east-2',
                AWS_S3_BUCKET: 'workana-ai-bucket',
                AWS_ACCESS_KEY_ID: 'test',
                AWS_SECRET_ACCESS_KEY: 'test',
                AWS_S3_ENDPOINT: 'http://localhost:4566',
                AWS_S3_FORCE_PATH_STYLE: 'true',
              };
              return values[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(StorageService);
    service.setClientForTesting({ send });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds deterministic object keys for context, design artifacts, and design assets', () => {
    expect(service.buildContextArtifactKey('org-1')).toBe('organizations/org-1/context/context.md');
    expect(service.buildDesignArtifactKey('org-1')).toBe(
      'organizations/org-1/design-system/design-system.md',
    );
    expect(service.buildDesignAssetKey('org-1', 'logo', 'Brand Logo.png')).toBe(
      'organizations/org-1/design-system/assets/logo/Brand Logo.png',
    );
    expect(service.buildPublicObjectUrl('organizations/org-1/design-system/assets/logo/Brand Logo.png')).toBe(
      'http://localhost:4566/workana-ai-bucket/organizations/org-1/design-system/assets/logo/Brand%20Logo.png',
    );
  });

  it('creates a presigned upload URL with content metadata', async () => {
    const result = await service.createPresignedUploadUrl({
      key: 'organizations/org-1/design-system/assets/asset-1/logo.png',
      contentType: 'image/png',
      size: 1024,
    });

    expect(result).toEqual({ url: 'https://uploads.test/signed' });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(PutObjectCommand),
      { expiresIn: 900 },
    );
    expect(send).toHaveBeenCalledWith(expect.any(PutBucketCorsCommand));
  });

  it('configures local browser upload CORS only once before signing upload URLs', async () => {
    await service.createPresignedUploadUrl({
      key: 'organizations/org-1/design-system/assets/asset-1/logo.png',
      contentType: 'image/png',
      size: 1024,
    });
    await service.createPresignedUploadUrl({
      key: 'organizations/org-1/design-system/assets/asset-2/logo.png',
      contentType: 'image/png',
      size: 1024,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(PutBucketCorsCommand));
  });

  it('writes markdown artifacts as text/markdown objects', async () => {
    await service.putMarkdownArtifact({ key: 'organizations/org-1/context/context.md', body: '# Context' });

    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
  });

  it('deletes objects from the configured bucket', async () => {
    await service.deleteObject('organizations/org-1/design-system/assets/asset-1/logo.png');

    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });
});
