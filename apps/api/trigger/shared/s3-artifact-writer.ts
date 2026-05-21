import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-2',
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
    },
  });
}

export async function writeMarkdownArtifact(key: string, body: string) {
  const bucket = process.env.AWS_S3_BUCKET ?? 'workana-ai-bucket';
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'text/markdown; charset=utf-8',
    }),
  );
}
