/**
 * Copy every Supabase Storage object into the R2 bucket.
 *
 * Safe while the office is using the app: it does not update database URLs
 * and it does not delete Supabase objects. Re-run it to pick up files uploaded
 * after the first pass; objects already on R2 with the same size are skipped.
 *
 * Usage: node scripts/copy-supabase-storage-to-r2.mjs
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const supabaseUrl = required('SUPABASE_URL').replace(/\/+$/, '');
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
const accountId = required('R2_ACCOUNT_ID');
const accessKeyId = required('R2_ACCESS_KEY_ID');
const secretAccessKey = required('R2_SECRET_ACCESS_KEY');
const r2Bucket = required('R2_BUCKET');
const concurrency = 3;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const stats = { copied: 0, skipped: 0, failed: 0 };

const buckets = await listBucketNames();
const objects = [];
for (const bucket of buckets) {
  objects.push(...(await listObjects(bucket)));
}

console.error(`Found ${objects.length} objects in ${buckets.length} buckets`);

let cursor = 0;
async function worker() {
  while (cursor < objects.length) {
    const index = cursor;
    cursor += 1;
    const object = objects[index];
    try {
      await copyObject(object, index + 1, objects.length);
    } catch (error) {
      stats.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAIL ${object.bucket}/${object.path}: ${message}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.error(
  `Done. copied=${stats.copied} skipped=${stats.skipped} failed=${stats.failed}`,
);
if (stats.failed > 0) process.exit(1);

async function copyObject(object, index, total) {
  const key = `${object.bucket}/${object.path}`;
  if (await sameSizeOnR2(key, object.size)) {
    stats.skipped += 1;
    if (index % 100 === 0 || index === total) {
      console.error(`[${index}/${total}] skip ${key}`);
    }
    return;
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${encodeKey(key)}`;
  let response = await fetch(publicUrl);
  let body;
  let contentType = object.mime;
  if (response.ok) {
    body = Buffer.from(await response.arrayBuffer());
    contentType = response.headers.get('content-type') || object.mime;
  } else {
    const downloaded = await supabase.storage.from(object.bucket).download(object.path);
    if (downloaded.error || !downloaded.data) {
      throw new Error(
        downloaded.error?.message || `download failed (${response.status})`,
      );
    }
    body = Buffer.from(await downloaded.data.arrayBuffer());
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
      CacheControl: '3600',
    }),
  );
  stats.copied += 1;
  console.error(
    `[${index}/${total}] copied ${key} (${body.length} bytes) copied=${stats.copied} skipped=${stats.skipped}`,
  );
}

async function sameSizeOnR2(key, size) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
    return size > 0 && Number(head.ContentLength) === Number(size);
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    const name = error?.name;
    if (status === 404 || name === 'NotFound' || name === 'NoSuchKey') return false;
    throw error;
  }
}

async function listBucketNames() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Failed to list buckets: ${error.message}`);
  return (data ?? []).map((bucket) => bucket.name);
}

async function listObjects(bucket, prefix = '') {
  if (!prefix) console.error(`Listing ${bucket}`);
  const files = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Failed to list ${bucket}/${prefix}: ${error.message}`);
    if (!data?.length) break;

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (!item.id && !item.metadata) {
        files.push(...(await listObjects(bucket, itemPath)));
        continue;
      }
      files.push({
        bucket,
        path: itemPath,
        size: Number(item.metadata?.size ?? 0),
        mime: item.metadata?.mimetype || 'application/octet-stream',
      });
    }

    if (data.length < 1000) break;
    offset += data.length;
  }
  return files;
}

function encodeKey(key) {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in backend-atria/.env`);
  return value;
}
