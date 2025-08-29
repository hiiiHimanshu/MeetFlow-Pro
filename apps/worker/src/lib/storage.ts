import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { loadEnv } from '@repo/config';

const env = loadEnv(process.env);

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  forcePathStyle: true
});

export async function putObject(key: string, body: Uint8Array, contentType = 'application/pdf') {
  const cmd = new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType });
  await s3.send(cmd);
  return key;
}
