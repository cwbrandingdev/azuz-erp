import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';
const maxVus = Number(__ENV.K6_VUS_MAX || 20);

export const options = {
  scenarios: {
    health: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: maxVus },
        { duration: '45s', target: maxVus },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health status 200': (r) => r.status === 200,
    'health body ok': (r) => {
      try {
        return r.json('status') === 'ok';
      } catch {
        return false;
      }
    },
  });
  sleep(0.5);
}
