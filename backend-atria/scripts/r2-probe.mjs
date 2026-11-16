/**
 * Upload one probe object through the same R2 settings the backend uses,
 * then read it back from the public URL. Deletes the probe afterwards.
 * Does not write to the database.
 *
 * Usage: node scripts/r2-probe.mjs
 */
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const accountId = required('R2_ACCOUNT_ID');
const accessKeyId = required('R2_ACCESS_KEY_ID');
const secretAccessKey = required('R2_SECRET_ACCESS_KEY');
const bucket = required('R2_BUCKET');
const publicBaseUrl = required('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
const logicalBucket = 'probes';
const objectPath = `localhost-cutover-${Date.now()}.txt`;
const key = `${logicalBucket}/${objectPath}`;
const body = Buffer.from(`azuz r2 probe ${new Date().toISOString()}\n`);

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const publicUrl = `${publicBaseUrl}/${encodeURIComponent(logicalBucket)}/${encodeURIComponent(objectPath)}`;

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'text/plain; charset=utf-8',
    CacheControl: '3600',
  }),
);

const response = await fetch(publicUrl);
const text = await response.text();
if (!response.ok || text !== body.toString('utf8')) {
  console.error(`Probe failed: status=${response.status} url=${publicUrl}`);
  console.error(text.slice(0, 300));
  process.exit(1);
}

await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
console.log(`Probe ok: ${publicUrl}`);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in backend-atria/.env`);
  return value;
}
