import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';
const maxVus = Number(__ENV.K6_VUS_MAX || 10);

export const options = {
  scenarios: {
    inbox_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: maxVus },
        { duration: '2m', target: maxVus },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
    'http_req_duration{endpoint:conversations}': ['p(95)<3000'],
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
    throw new Error(
      'Set K6_EMAIL and K6_PASSWORD (or K6_ACCESS_TOKEN) before running inbox-browse.',
    );
  }

  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'setup login 200': (r) => r.status === 200 });

  if (res.status !== 200) {
    throw new Error(
      `Login failed (${res.status}): ${String(res.body).slice(0, 200)}`,
    );
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

    const body = conversations.json();
    const list = Array.isArray(body)
      ? body
      : body?.items ?? body?.data ?? [];
    const firstPhone =
      list[0]?.phone ??
      list[0]?.contactPhone ??
      list[0]?.waId ??
      null;

    if (firstPhone) {
      const thread = http.get(
        `${BASE_URL}/whatsapp/conversations/${encodeURIComponent(firstPhone)}`,
        { headers, tags: { endpoint: 'conversation_detail' } },
      );
      check(thread, {
        'conversation detail 200': (r) => r.status === 200,
      });

      const messages = http.get(
        `${BASE_URL}/whatsapp/messages/${encodeURIComponent(firstPhone)}`,
        { headers, tags: { endpoint: 'messages' } },
      );
      check(messages, { 'messages 200': (r) => r.status === 200 });
    }
  });

  sleep(1 + Math.random() * 2);
}
