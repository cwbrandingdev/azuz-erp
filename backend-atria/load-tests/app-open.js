/**
 * Logged-in "app open" load.
 *
 * One iteration is one refresh: the HTTP calls the shell and the admin home
 * fire together. Site leads are omitted here because this machine has no
 * CWBRANDING_API_KEY (production does); that call is a fixed 503 and is not
 * capacity. Health is not called.
 *
 * Env:
 *   BASE_URL          default http://127.0.0.1:18082
 *   K6_TOKENS_FILE    JSON array of bearer tokens
 *   K6_MODE           parallel (default) or single
 *   K6_SINGLE_PATH    used when K6_MODE=single, default /app/session
 *   K6_SLEEP_SECONDS  pause after each refresh, default 5
 */
import http from 'k6/http';
import exec from 'k6/execution';
import { sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:18082';
const MODE = __ENV.K6_MODE || 'parallel';
const SINGLE_PATH = __ENV.K6_SINGLE_PATH || '/app/session';
const SLEEP_SECONDS = Number(__ENV.K6_SLEEP_SECONDS || '5');
const tokens = JSON.parse(open(__ENV.K6_TOKENS_FILE || '/tmp/atria-load-tokens.json'));

const PARALLEL_PATHS = [
  '/public/company',
  '/settings/branding',
  '/settings/appearance',
  '/notifications',
  '/notifications/unread-count',
  '/app-updates/access',
  '/api/finances/due-today-alerts',
  '/dashboard/overview',
  '/client-requests?status=pending',
];

const timeouts = new Counter('refresh_timeouts');
const limited = new Counter('refresh_429');
const serverErrors = new Counter('refresh_5xx');
const otherErrors = new Counter('refresh_other_errors');

const PEOPLE = [1, 5, 10, 20, 40, 60, 80];
const STAGE_SECONDS = 45;
const GAP_SECONDS = 25;

export const options = {
  scenarios: Object.fromEntries(
    PEOPLE.map((people, index) => [
      `people_${people}`,
      {
        executor: 'constant-vus',
        vus: people,
        duration: `${STAGE_SECONDS}s`,
        startTime: `${index * (STAGE_SECONDS + GAP_SECONDS)}s`,
        gracefulStop: '22s',
        tags: { people: String(people) },
      },
    ]),
  ),
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'count'],
  thresholds: {},
};

function classify(response) {
  if (response.status === 0) {
    timeouts.add(1);
    return;
  }
  if (response.status === 429) {
    limited.add(1);
    return;
  }
  if (response.status >= 500) {
    serverErrors.add(1);
    return;
  }
  if (response.status < 200 || response.status >= 300) {
    otherErrors.add(1);
  }
}

export default function () {
  if (__ITER === 0) {
    sleep(Math.random());
  }

  const slot = (exec.vu.idInInstance - 1) % tokens.length;
  const token = tokens[slot];
  const forwardedFor = `10.88.0.${(slot % 250) + 1}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Forwarded-For': forwardedFor,
    Accept: 'application/json',
  };
  const timeout = '20s';

  if (MODE === 'single') {
    const response = http.get(`${BASE_URL}${SINGLE_PATH}`, { headers, timeout });
    classify(response);
  } else {
    const responses = http.batch(
      PARALLEL_PATHS.map((path) => ({
        method: 'GET',
        url: `${BASE_URL}${path}`,
        params: { headers, timeout, tags: { endpoint: path.split('?')[0] } },
      })),
    );
    for (const response of responses) classify(response);
  }

  sleep(SLEEP_SECONDS);
}
