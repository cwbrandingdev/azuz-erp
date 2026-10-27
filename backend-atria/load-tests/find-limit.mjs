#!/usr/bin/env node
/**
 * Zero-cloud capacity probe: Docker Postgres + local Nest (Supabase disabled).
 * Ramps constant VU levels until SLO breach, then writes limit-report.txt/json.
 */
import { spawnSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTAINER = 'atria-k6-pg';
const PG_URL =
  'postgresql://postgres:loadtest@127.0.0.1:5433/atria?schema=public';
const BASE_URL = 'http://127.0.0.1:3001';
const K6_EMAIL = 'e2e-admin@atria.test';
const K6_PASSWORD = 'E2eAdmin!Pass123';

const FAIL_ERROR_RATE = 0.02;
const FAIL_P95_MS = 3000;
const FAIL_CHECK_RATE = 0.98;
const STEP_SECONDS = 35;
const VU_STEPS = [
  15, 30, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 600, 700, 800,
  900, 1000,
];

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, {
    shell: true,
    cwd: ROOT,
    encoding: 'utf8',
    ...opts,
  });
  if (result.status !== 0 && !opts.allowFail) {
    throw new Error(
      `Command failed (${result.status}): ${cmd}\n${result.stderr || result.stdout}`,
    );
  }
  return result;
}

function dockerOk() {
  return spawnSync('docker', ['info'], { encoding: 'utf8' }).status === 0;
}

function waitPg() {
  for (let i = 0; i < 45; i++) {
    const r = spawnSync(
      `docker exec ${CONTAINER} pg_isready -U postgres`,
      { shell: true, encoding: 'utf8' },
    );
    if (r.status === 0) return;
    execSync('sleep 1');
  }
  throw new Error('Postgres did not become ready');
}

function startStack() {
  if (!dockerOk()) throw new Error('Docker is required for find-limit (local Postgres).');

  spawnSync('docker', ['rm', '-f', CONTAINER], { encoding: 'utf8' });
  run(
    `docker run -d --name ${CONTAINER} -e POSTGRES_PASSWORD=loadtest -e POSTGRES_DB=atria -p 5433:5432 postgres:16-alpine`,
  );
  waitPg();

  const env = {
    ...process.env,
    DATABASE_URL: PG_URL,
    DIRECT_URL: PG_URL,
  };
  run('npx prisma db push --accept-data-loss', { env, allowFail: false });
  run('npx prisma db seed', { env, allowFail: false });
  run('npx ts-node test/scripts/seed-e2e-credentials.ts', { env, allowFail: false });
  run('npm run build', { env, allowFail: false });

  run(
    `DATABASE_URL="${PG_URL}" DIRECT_URL="${PG_URL}" SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= SUPABASE_ANON_KEY= K6_LOAD_TEST=1 NODE_ENV=development PORT=3001 node dist/main.js > /tmp/atria-k6-server.log 2>&1 & echo $! > /tmp/atria-k6-server.pid`,
  );

  for (let i = 0; i < 60; i++) {
    const probe = spawnSync(`curl -sf ${BASE_URL}/health`, {
      shell: true,
      encoding: 'utf8',
    });
    if (probe.status === 0) return;
    execSync('sleep 1');
  }
  throw new Error('API did not start; see /tmp/atria-k6-server.log');
}

function stopStack() {
  try {
    if (existsSync('/tmp/atria-k6-server.pid')) {
      const pid = readFileSync('/tmp/atria-k6-server.pid', 'utf8').trim();
      run(`kill ${pid} 2>/dev/null || true`, { allowFail: true });
    }
  } catch {
    /* ignore */
  }
  run(`docker rm -f ${CONTAINER} 2>/dev/null || true`, { allowFail: true });
}

function runK6Level(vus) {
  const summaryPath = join(__dirname, `.k6-summary-${vus}.json`);
  const result = spawnSync(
    'k6',
    [
      'run',
      '--vus',
      String(vus),
      '--duration',
      `${STEP_SECONDS}s`,
      '--summary-export',
      summaryPath,
      '-e',
      `BASE_URL=${BASE_URL}`,
      '-e',
      `K6_EMAIL=${K6_EMAIL}`,
      '-e',
      `K6_PASSWORD=${K6_PASSWORD}`,
      '-e',
      'K6_SLEEP_SEC=0.15',
      'load-tests/inbox-stress.js',
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  if (!existsSync(summaryPath)) {
    return {
      vus,
      ok: false,
      reason: 'k6 did not produce summary',
      exitCode: result.status,
    };
  }
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  return parseSummary(summary, vus, result.status);
}

function parseSummary(summary, vus, exitCode = 0) {
  const m = summary.metrics ?? {};
  const failed =
    m.http_req_failed?.value ??
    m.http_req_failed?.values?.rate ??
    1;
  const p95 =
    m.http_req_duration?.['p(95)'] ??
    m.http_req_duration?.values?.['p(95)'] ??
    1e9;
  const checksRate = m.checks?.value ?? m.checks?.values?.rate ?? 0;
  const rps = m.http_reqs?.rate ?? m.http_reqs?.values?.rate ?? 0;
  const iterations = m.iterations?.count ?? m.iterations?.values?.count ?? 0;

  const sloOk =
    failed <= FAIL_ERROR_RATE &&
    p95 <= FAIL_P95_MS &&
    checksRate >= FAIL_CHECK_RATE;

  let reason = 'ok';
  if (!sloOk) {
    if (failed > FAIL_ERROR_RATE) reason = `error rate ${(failed * 100).toFixed(2)}%`;
    else if (p95 > FAIL_P95_MS) reason = `p95 ${p95.toFixed(0)}ms`;
    else reason = `checks ${(checksRate * 100).toFixed(2)}%`;
  }

  return {
    vus,
    ok: sloOk,
    reason,
    failedRate: failed,
    p95Ms: p95,
    checksRate,
    httpRps: rps,
    iterations,
    exitCode,
  };
}

function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    environment:
      'Local Docker Postgres, Nest on localhost:3001, Supabase disabled, inbox-stress (~0.15s think time)',
    slo: {
      maxErrorRate: FAIL_ERROR_RATE,
      maxP95Ms: FAIL_P95_MS,
      minCheckPassRate: FAIL_CHECK_RATE,
      stepDurationSec: STEP_SECONDS,
    },
    steps: [],
    sustainedConcurrentUsers: null,
    firstFailureAtVus: null,
    notes: [
      'Concurrent users ≈ VUs in this test (each VU loops inbox API with short pause).',
      'Not identical to Fly 1GB + Supabase latency; use as relative capacity signal.',
    ],
  };

  try {
    startStack();
    let lastGood = null;
    for (const vus of VU_STEPS) {
      console.log(`\n>>> Probing ${vus} VUs for ${STEP_SECONDS}s...\n`);
      const step = runK6Level(vus);
      report.steps.push(step);
      console.log(
        `    ${step.ok ? 'PASS' : 'FAIL'} — ${step.reason} | p95=${step.p95Ms?.toFixed?.(1)}ms | err=${(step.failedRate * 100).toFixed(2)}% | ~${step.httpRps?.toFixed?.(1)} req/s`,
      );
      if (step.ok) {
        lastGood = step;
      } else {
        report.firstFailureAtVus = vus;
        break;
      }
    }

    if (lastGood) {
      report.sustainedConcurrentUsers = lastGood.vus;
      report.atLastGood = {
        vus: lastGood.vus,
        httpRps: lastGood.httpRps,
        p95Ms: lastGood.p95Ms,
        errorRate: lastGood.failedRate,
      };
    }
  } finally {
    stopStack();
  }

  mkdirSync(__dirname, { recursive: true });
  const txtPath = join(__dirname, 'limit-report.txt');
  const jsonPath = join(__dirname, 'limit-report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const lines = [
    '=== Inbox API capacity (local, zero cloud) ===',
    `Generated: ${report.generatedAt}`,
    '',
    `SLO per step: errors ≤ ${FAIL_ERROR_RATE * 100}%, p95 ≤ ${FAIL_P95_MS}ms, checks ≥ ${FAIL_CHECK_RATE * 100}%`,
    `Step duration: ${STEP_SECONDS}s each`,
    '',
    'Steps:',
    ...report.steps.map(
      (s) =>
        `  ${s.ok ? 'OK' : 'FAIL'} ${s.vus} VUs — ${s.reason} | p95 ${s.p95Ms?.toFixed?.(1)}ms | errors ${(s.failedRate * 100).toFixed(2)}% | ${s.httpRps?.toFixed?.(1)} HTTP req/s`,
    ),
    '',
  ];

  if (report.sustainedConcurrentUsers != null) {
    lines.push(
      `Estimated limit (last passing level): ~${report.sustainedConcurrentUsers} concurrent inbox users (this workload).`,
    );
    if (report.firstFailureAtVus != null) {
      lines.push(
        `First failing level: ${report.firstFailureAtVus} VUs (degradation begins around here).`,
      );
    } else {
      lines.push(
        `Did not hit failure below ${VU_STEPS[VU_STEPS.length - 1]} VUs — raise VU_STEPS for a higher ceiling.`,
      );
    }
    if (report.atLastGood) {
      lines.push(
        `At last good level: ~${report.atLastGood.httpRps?.toFixed?.(1)} HTTP req/s, p95 ${report.atLastGood.p95Ms?.toFixed?.(1)}ms.`,
      );
    }
  } else {
    lines.push('No passing level recorded — check server logs.');
  }

  lines.push('', ...report.notes.map((n) => `• ${n}`));
  writeFileSync(txtPath, lines.join('\n'));
  console.log('\n' + lines.join('\n'));
}

main();
