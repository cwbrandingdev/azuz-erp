/**
 * Temporary logged-in sessions for the app-open load test.
 * Creates ADMIN users in the current DATABASE_URL schema, signs access tokens,
 * and deletes those users on `delete`. Does not migrate.
 *
 * Usage:
 *   node load-tests/app-open-sessions.mjs create
 *   node load-tests/app-open-sessions.mjs trace
 *   node load-tests/app-open-sessions.mjs delete
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const ENV_FILE = process.env.LOAD_ENV_FILE || '/tmp/atria-load.env';
const TOKEN_FILE = process.env.K6_TOKENS_FILE || '/tmp/atria-load-tokens.json';
const ID_FILE = process.env.LOAD_USER_IDS_FILE || '/tmp/atria-load-user-ids.json';
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:18080';
const COUNT = Number(process.env.LOAD_USER_COUNT || '80');
const EMAIL_DOMAIN = 'loadtest.invalid';

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnv(ENV_FILE);
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.DIRECT_URL = env.DIRECT_URL || env.DATABASE_URL;

const prisma = new PrismaClient();

function emailFor(index) {
  return `lt${String(index).padStart(3, '0')}@${EMAIL_DOMAIN}`;
}

async function createSessions() {
  const role = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
    select: { id: true },
  });
  if (!role) throw new Error('ADMIN role is missing');

  const company = await prisma.company.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!company) throw new Error('No active company');

  await prisma.user.deleteMany({
    where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
  });

  const rows = Array.from({ length: COUNT }, (_, index) => ({
    email: emailFor(index + 1),
    passwordHash: 'loadtest-not-a-login',
    name: 'Load Test',
    roleId: role.id,
    companyId: company.id,
    category: 'MEMBER',
    isActive: true,
    mustChangePassword: false,
  }));

  await prisma.user.createMany({ data: rows });

  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    select: { id: true, email: true, companyId: true },
    orderBy: { email: 'asc' },
  });

  const tokens = users.map((user) =>
    jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: 'ADMIN',
        category: 'MEMBER',
        clientId: null,
        companyId: user.companyId,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' },
    ),
  );

  writeFileSync(TOKEN_FILE, JSON.stringify(tokens), { mode: 0o600 });
  writeFileSync(
    ID_FILE,
    JSON.stringify(users.map((user) => user.id)),
    { mode: 0o600 },
  );
  console.log(`sessions=${tokens.length} schema_host_ok=1`);
}

async function deleteSessions() {
  const result = await prisma.user.deleteMany({
    where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
  });
  console.log(`deleted=${result.count}`);
}

const FULL_REFRESH = [
  ['/public/company', false],
  ['/settings/branding', true],
  ['/settings/appearance', true],
  ['/notifications', true],
  ['/notifications/unread-count', true],
  ['/app-updates/access', true],
  ['/site-leads', true],
  ['/api/finances/due-today-alerts', true],
  ['/dashboard/overview', true],
  ['/client-requests?status=pending', true],
];

const OPEN_POLL = [
  ['/notifications', true],
  ['/notifications/unread-count', true],
  ['/app-updates/access', true],
  ['/site-leads', true],
  ['/api/finances/due-today-alerts', true],
];

async function hit(token, path, authed, forwardedFor) {
  const started = Date.now();
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...(authed ? { Authorization: `Bearer ${token}` } : {}),
      'X-Forwarded-For': forwardedFor,
      Accept: 'application/json',
    },
  });
  await response.arrayBuffer();
  return {
    path: path.split('?')[0],
    status: response.status,
    ms: Date.now() - started,
  };
}

async function runSet(token, label, calls, mode) {
  const ip = '10.88.0.1';
  if (mode === 'serial') {
    const rows = [];
    for (const [path, authed] of calls) {
      rows.push(await hit(token, path, authed, ip));
    }
    console.log(label, 'serial', JSON.stringify(rows));
    return;
  }

  const started = Date.now();
  const rows = await Promise.all(
    calls.map(([path, authed]) => hit(token, path, authed, ip)),
  );
  console.log(
    label,
    'parallel',
    JSON.stringify({ wall_ms: Date.now() - started, calls: rows }),
  );
}

async function trace() {
  const tokens = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  const token = tokens[0];
  if (!token) throw new Error('No tokens. Run create first.');
  await runSet(token, 'poll', OPEN_POLL, 'serial');
  await runSet(token, 'refresh', FULL_REFRESH, 'serial');
  await runSet(token, 'poll', OPEN_POLL, 'parallel');
  await runSet(token, 'refresh', FULL_REFRESH, 'parallel');
}

const command = process.argv[2];
try {
  if (command === 'create') await createSessions();
  else if (command === 'delete') await deleteSessions();
  else if (command === 'trace') await trace();
  else throw new Error('Use create, trace, or delete');
} finally {
  await prisma.$disconnect();
}
