import http from 'k6/http';
import { check, sleep } from 'k6';

// docs/features/popular-plants.md — How fast it must be:
// ~20 shoppers browsing at once; 95% of GET /api/popular within 300 ms and no failures;
// at the same load, 95% of GET /api/plants still within 300 ms.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8100';
const ENDPOINTS = ['popular', 'catalog'];
const POPULAR_P95_MS = 300;
const CATALOG_P95_MS = 300;

const scenarioName = __ENV.SCENARIO || 'smoke';

const scenarios = {
  smoke: {
    executor: 'per-vu-iterations',
    vus: 1,
    iterations: 10,
    maxDuration: '1m',
  },
  load: {
    executor: 'constant-vus',
    vus: 20,
    duration: '30s',
  },
};

if (!scenarios[scenarioName]) {
  throw new Error(`Unknown SCENARIO "${scenarioName}". Use smoke or load.`);
}

const limits = {
  popular: POPULAR_P95_MS,
  catalog: CATALOG_P95_MS,
};

export const options = {
  scenarios: {
    [scenarioName]: scenarios[scenarioName],
  },
  summaryTrendStats: ['p(50)', 'p(95)', 'p(99)', 'avg', 'min', 'med', 'max'],
  thresholds: {
    // 0% failed requests on popular (and catalog must not spike errors under the same load).
    'http_req_failed{endpoint:popular}': ['rate==0'],
    'http_req_failed{endpoint:catalog}': ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{endpoint:popular}': [`p(95)<${limits.popular}`],
    'http_req_duration{endpoint:catalog}': [`p(95)<${limits.catalog}`],
  },
};

function plantItems(response) {
  if (response.status !== 200) return [];
  try {
    const items = response.json('items');
    return Array.isArray(items) ? items : [];
  } catch (error) {
    return [];
  }
}

export default function () {
  const popular = http.get(`${BASE_URL}/api/popular`, {
    tags: { endpoint: 'popular', name: 'GET /api/popular' },
  });
  check(popular, {
    'popular status is 200': (response) => response.status === 200,
    'popular returns items': (response) => plantItems(response).length > 0,
  });

  const catalog = http.get(`${BASE_URL}/api/plants`, {
    tags: { endpoint: 'catalog', name: 'GET /api/plants' },
  });
  check(catalog, {
    'catalog status is 200': (response) => response.status === 200,
    'catalog returns items': (response) => plantItems(response).length > 0,
  });

  if (scenarioName === 'load') sleep(1);
}

function findMetric(data, endpoint) {
  const metrics = data && data.metrics;
  if (!metrics) return null;
  const matches = (name) =>
    typeof name === 'string' && name.startsWith('http_req_duration') && name.includes(`endpoint:${endpoint}`);

  if (!Array.isArray(metrics)) {
    return Object.keys(metrics)
      .filter(matches)
      .map((name) => metrics[name])[0] || null;
  }

  for (const metric of metrics) {
    if (matches(metric.name)) return metric;
    const subs = metric.submetrics || metric.sub_metrics || [];
    for (const sub of subs) {
      if (matches(sub.name)) return sub;
    }
  }
  return null;
}

function normalizeValues(values) {
  if (!values) return {};
  if (!Array.isArray(values)) return values;
  const out = {};
  for (const entry of values) {
    const key = entry.name || entry.stat;
    if (key) out[key] = entry.value;
  }
  return out;
}

function percentile(values, name) {
  if (typeof values[name] === 'number') return values[name];
  if (name === 'p(50)' && typeof values.med === 'number') return values.med;
  return null;
}

function thresholdEntries(metric) {
  const thresholds = metric && metric.thresholds;
  if (!thresholds) return [];
  if (Array.isArray(thresholds)) {
    return thresholds.map((entry) => ({
      expression: entry.threshold || entry.source || entry.name || '',
      ok: entry.ok,
    }));
  }
  return Object.entries(thresholds).map(([expression, entry]) => ({
    expression,
    ok: entry && entry.ok,
  }));
}

function rowFor(data, endpoint) {
  const metric = findMetric(data, endpoint);
  const values = normalizeValues(metric && metric.values);
  const p50 = percentile(values, 'p(50)');
  const p95 = percentile(values, 'p(95)');
  const p99 = percentile(values, 'p(99)');
  const limit = limits[endpoint];
  const entry = thresholdEntries(metric).find((item) => /p\(95\)/.test(item.expression));
  const passed = entry && typeof entry.ok === 'boolean' ? entry.ok : typeof p95 === 'number' && p95 < limit;
  return {
    endpoint,
    p50,
    p95,
    p99,
    limit,
    result: passed ? 'pass' : 'fail',
  };
}

function fmt(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'n/a';
}

function renderMarkdown(scenario, rows) {
  const lines = [
    `scenario: ${scenario}`,
    '',
    '| endpoint | p50 (ms) | p95 (ms) | p99 (ms) | limit (ms) | result |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    ...rows.map(
      (row) => `| ${row.endpoint} | ${fmt(row.p50)} | ${fmt(row.p95)} | ${fmt(row.p99)} | ${fmt(row.limit)} | ${row.result} |`,
    ),
  ];
  return lines.join('\n');
}

export function handleSummary(data) {
  const rows = ENDPOINTS.map((endpoint) => rowFor(data, endpoint));
  const markdown = renderMarkdown(scenarioName, rows);
  const report = { scenario: scenarioName, unit: 'ms', endpoints: rows };
  return {
    stdout: `${markdown}\n`,
    [`reports/k6/popular-plants-${scenarioName}.md`]: `${markdown}\n`,
    [`reports/k6/popular-plants-${scenarioName}.json`]: `${JSON.stringify(report, null, 2)}\n`,
  };
}
