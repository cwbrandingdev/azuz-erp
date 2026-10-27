import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.50'],
  },
};

function jsonHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export function setup() {
  const tokenFromEnv = __ENV.K6_ACCESS_TOKEN;
  if (tokenFromEnv) {
    return { accessToken: tokenFromEnv };
  }

  const email = __ENV.K6_EMAIL;
  const password = __ENV.K6_PASSWORD;
  if (!email || !password) {
    throw new Error('Set K6_EMAIL and K6_PASSWORD (or K6_ACCESS_TOKEN).');
  }

  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status})`);
  }

  const accessToken = res.json('accessToken');
  if (!accessToken) {
    throw new Error('Login response missing accessToken');
  }

  return { accessToken };
}

export default function (data) {
  const headers = jsonHeaders(data.accessToken);

  group('inbox browse', () => {
    const me = http.get(`${BASE_URL}/auth/me`, { headers, tags: { endpoint: 'me' } });
    check(me, { 'me 200': (r) => r.status === 200 });

    const counts = http.get(`${BASE_URL}/whatsapp/inbox/counts`, {
      headers,
      tags: { endpoint: 'inbox_counts' },
    });
    check(counts, { 'inbox counts 200': (r) => r.status === 200 });

    const conversations = http.get(
      `${BASE_URL}/whatsapp/conversations?tab=OPEN&assignee=all`,
      { headers, tags: { endpoint: 'conversations' } },
    );
    check(conversations, {
      'conversations 200': (r) => r.status === 200,
    });
  });

  sleep(Number(__ENV.K6_SLEEP_SEC || 0.15));
}
