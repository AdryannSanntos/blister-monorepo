import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('AWS_S3_ENDPOINT');
    const forcePathStyle = this.config.get<string>('AWS_S3_FORCE_PATH_STYLE') === 'true';

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

  async onModuleInit(): Promise<void> {
    await this.ensureBucketCors();
  }

  async ensureBucketCors(): Promise<void> {
    const configuredOrigins = process.env.CORS_ORIGIN?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!configuredOrigins?.length) {
      return;
    }

    try {
      await this.client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
                AllowedOrigins: configuredOrigins,
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.debug(`Configured S3 bucket CORS for origins: ${configuredOrigins.join(', ')}`);
    } catch (error) {
      this.logger.warn(
        `Could not configure S3 bucket CORS automatically: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
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

  async uploadObject(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async uploadObjectStream(
    key: string,
    body: Readable,
    mimeType: string,
    contentLength?: number,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
      }),
    );
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    // CopySource must be URL-encoded per segment while keeping the path slashes,
    // otherwise keys containing spaces or accents fail.
    const encodedSource = sourceKey.split('/').map(encodeURIComponent).join('/');
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${encodedSource}`,
        Key: destinationKey,
      }),
    );
  }

  /** Streams an object to a local file without loading it fully into memory. */
  async downloadObjectToPath(key: string, destPath: string): Promise<void> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }

    await pipeline(response.Body as Readable, createWriteStream(destPath));
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /** Lists every object key under a prefix, following pagination. */
  async listObjectKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const item of response.Contents ?? []) {
        if (item.Key) keys.push(item.Key);
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return keys;
  }

  /** Deletes many objects, batching to the S3 limit of 1000 keys per call. */
  async deleteObjects(keys: string[]): Promise<void> {
    const unique = [...new Set(keys)].filter(Boolean);
    for (let i = 0; i < unique.length; i += 1000) {
      const batch = unique.slice(i, i + 1000);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })) },
        }),
      );
    }
  }

  /** Writes a zero-byte object (used for folder placeholder markers). */
  async putEmptyObject(key: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: '',
      }),
    );
  }
}
