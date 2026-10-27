import { readFileSync } from 'node:fs';

const path = process.argv[2];
const vus = Number(process.argv[3]);
const summary = JSON.parse(readFileSync(path, 'utf8'));
const m = summary.metrics ?? {};
const failed = m.http_req_failed?.value ?? 1;
const p95 = m.http_req_duration?.['p(95)'] ?? 1e9;
const checks = m.checks?.value ?? 0;
const rps = m.http_reqs?.rate ?? 0;
const ok = failed <= 0.02 && p95 <= 3000 && checks >= 0.98;
console.log(
  JSON.stringify({
    vus,
    ok,
    failedRate: failed,
    p95Ms: p95,
    checksRate: checks,
    httpRps: rps,
  }),
);
process.exit(ok ? 0 : 1);
