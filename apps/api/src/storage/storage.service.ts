import {
  GetObjectCommand,
  DeleteObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type S3ClientLike = Pick<S3Client, 'send'>;

export type CreatePresignedUploadUrlInput = {
  key: string;
  contentType: string;
  size: number;
  expiresInSeconds?: number;
};

export type PutMarkdownArtifactInput = {
  key: string;
  body: string;
};

export type PutObjectInput = {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
};

@Injectable()
export class StorageService {
  private client: S3ClientLike;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private browserUploadCorsConfigured = false;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('AWS_S3_BUCKET', 'workana-ai-bucket');
    this.endpoint = this.config.get<string>('AWS_S3_ENDPOINT');
    this.client = new S3Client({
      region: this.config.get<string>('AWS_REGION', 'us-east-2'),
      endpoint: this.endpoint,
      forcePathStyle: this.config.get<string>('AWS_S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID', 'test'),
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY', 'test'),
      },
    });
  }

  setClientForTesting(client: S3ClientLike) {
    this.client = client;
  }

  buildContextArtifactKey(organizationId: string) {
    return `organizations/${organizationId}/context/context.md`;
  }

  buildContextSourceKey(organizationId: string, sourceId: string, fileName: string) {
    const sanitized = fileName.replace(/[\\/]/g, '-');
    return `organizations/${organizationId}/context/sources/${sourceId}/${sanitized}`;
  }

  buildDesignArtifactKey(organizationId: string) {
    return `organizations/${organizationId}/design-system/design-system.md`;
  }

  buildDesignAssetKey(organizationId: string, assetRole: string, fileName: string) {
    return `organizations/${organizationId}/design-system/assets/${assetRole}/${fileName.replace(/[\\/]/g, '-')}`;
  }

  buildAgentRunArtifactKey(organizationId: string, runId: string, fileName: string) {
    return `organizations/${organizationId}/agent-runs/${runId}/${fileName.replace(/[\\/]/g, '-')}`;
  }

  buildPublicObjectUrl(key: string) {
    const publicBaseUrl = this.config.get<string>('AWS_S3_PUBLIC_BASE_URL')?.replace(/\/$/, '');
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');

    if (publicBaseUrl) return `${publicBaseUrl}/${encodedKey}`;
    if (this.endpoint) return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${encodedKey}`;
    return undefined;
  }

  private isLocalS3Endpoint() {
    return Boolean(this.endpoint?.includes('localhost') || this.endpoint?.includes('127.0.0.1'));
  }

  private getAllowedBrowserOrigins() {
    return (
      this.config
        .get<string>('CORS_ORIGIN')
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? ['http://localhost:3000']
    );
  }

  private async ensureLocalBrowserUploadCors() {
    if (!this.isLocalS3Endpoint() || this.browserUploadCorsConfigured) return;

    await this.client.send(
      new PutBucketCorsCommand({
        Bucket: this.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['PUT', 'GET', 'HEAD'],
              AllowedOrigins: this.getAllowedBrowserOrigins(),
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      }),
    );
    this.browserUploadCorsConfigured = true;
  }

  async createPresignedUploadUrl(input: CreatePresignedUploadUrlInput) {
    await this.ensureLocalBrowserUploadCors();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
    });

    const url = await getSignedUrl(this.client as S3Client, command, {
      expiresIn: input.expiresInSeconds ?? 900,
    });

    return { url };
  }

  async putMarkdownArtifact(input: PutMarkdownArtifactInput) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: 'text/markdown; charset=utf-8',
      }),
    );
  }

  async putObject(input: PutObjectInput) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await response.Body?.transformToByteArray?.();
    return Buffer.from(bytes ?? []);
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
