import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const createS3Client = (): S3Client => {
  const endpoint = process.env.AWS_S3_ENDPOINT;
  const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === 'true';

  return new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
    ...(endpoint ? { endpoint, forcePathStyle } : {}),
  });
};

export const getObjectBufferFromEnv = async (key: string): Promise<Buffer> => {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET is required');
  }

  const client = createS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`Object not found: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
};
