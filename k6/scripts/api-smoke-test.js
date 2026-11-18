import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8100';

export const options = {
  vus: 2,
  duration: '15s',
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    'health status is 200': (r) => r.status === 200,
    'health body is ok': (r) => r.json('status') === 'ok',
  });

  const catalog = http.get(`${BASE_URL}/api/plants?sort=name&pageSize=5`);
  check(catalog, {
    'plants status is 200': (r) => r.status === 200,
    'plants returns items': (r) => Array.isArray(r.json('items')) && r.json('items').length > 0,
  });

  sleep(1);
}