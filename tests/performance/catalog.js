import http from 'k6/http';
import { check, sleep } from 'k6';

// Paths from GET /openapi.json: /api/plants (query `search`) and /api/plants/{plantId}.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8100';
const ENDPOINTS = ['catalog', 'search', 'plant'];
const LIMIT_FLOOR_MS = 50;
const LIMIT_CEILING_MS = 300;

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

// Placeholder until someone owns a target. No document sets a speed target
// for these endpoints, so each p95 limit is three times today's p95 from
// tests/performance/baseline.json, never below 50 ms and never above 300 ms.
// Until that file exists, the ceiling is used.
function latencyLimit(p95) {
  if (typeof p95 !== 'number' || !Number.isFinite(p95)) return LIMIT_CEILING_MS;
  const scaled = Math.min(LIMIT_CEILING_MS, Math.max(LIMIT_FLOOR_MS, p95 * 3));
  return Math.round(scaled * 100) / 100;
}

function loadBaseline() {
  const candidates = ['tests/performance/baseline.json'];
  try {
    candidates.unshift(import.meta.resolve('./baseline.json'));
  } catch (error) {
    // The script can be validated from a string, with no module URL.
  }
  for (const path of candidates) {
    try {
      return JSON.parse(open(path));
    } catch (error) {
      // Missing or unreadable baseline: fall through to the ceiling.
    }
  }
  return null;
}

function baselineP95(baseline, endpoint) {
  if (!baseline || typeof baseline !== 'object') return null;
  const recorded = baseline.p95 && baseline.p95[endpoint];
  return typeof recorded === 'number' ? recorded : null;
}

const baseline = loadBaseline();
const limits = Object.fromEntries(
  ENDPOINTS.map((endpoint) => [endpoint, latencyLimit(baselineP95(baseline, endpoint))]),
);

export const options = {
  scenarios: {
    [scenarioName]: scenarios[scenarioName],
  },
  summaryTrendStats: ['p(50)', 'p(95)', 'p(99)', 'avg', 'min', 'med', 'max'],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{endpoint:catalog}': [`p(95)<${limits.catalog}`],
    'http_req_duration{endpoint:search}': [`p(95)<${limits.search}`],
    'http_req_duration{endpoint:plant}': [`p(95)<${limits.plant}`],
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
  const catalog = http.get(`${BASE_URL}/api/plants`, {
    tags: { endpoint: 'catalog', name: 'GET /api/plants' },
  });
  check(catalog, {
    'catalog status is 200': (response) => response.status === 200,
    'catalog returns items': (response) => plantItems(response).length > 0,
  });

  const first = plantItems(catalog)[0] || {};
  const searchTerm = typeof first.name === 'string' && first.name.trim() ? first.name.split(/\s+/)[0] : 'monstera';
  const plantId = typeof first.id === 'string' && first.id ? first.id : 'pl-monstera';

  const search = http.get(`${BASE_URL}/api/plants?search=${encodeURIComponent(searchTerm)}`, {
    tags: { endpoint: 'search', name: 'GET /api/plants?search' },
  });
  check(search, {
    'search status is 200': (response) => response.status === 200,
    'search returns matches': (response) => plantItems(response).length > 0,
    'search includes catalog plant': (response) => plantItems(response).some((item) => item.id === plantId),
  });

  const plant = http.get(`${BASE_URL}/api/plants/${encodeURIComponent(plantId)}`, {
    tags: { endpoint: 'plant', name: 'GET /api/plants/{plantId}' },
  });
  check(plant, {
    'plant status is 200': (response) => response.status === 200,
    'plant id matches request': (response) => {
      if (response.status !== 200) return false;
      try {
        return response.json('id') === plantId;
      } catch (error) {
        return false;
      }
    },
  });

  // Shoppers read the page before the next click. Smoke stays a short functional pass.
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
  const summary = {
    stdout: `${markdown}\n`,
    [`reports/k6/catalog-${scenarioName}.md`]: `${markdown}\n`,
    [`reports/k6/catalog-${scenarioName}.json`]: `${JSON.stringify(report, null, 2)}\n`,
  };

  if (__ENV.SAVE_BASELINE === '1') {
    const p95 = {};
    for (const row of rows) {
      if (typeof row.p95 === 'number') p95[row.endpoint] = row.p95;
    }
    summary['tests/performance/baseline.json'] = `${JSON.stringify({ p95 }, null, 2)}\n`;
  }

  return summary;
}
