#!/usr/bin/env node
/**
 * Deterministic PR QA report (Node 22+, no dependencies).
 * Usage:
 *   node scripts/qa-report.mjs build
 *   node scripts/qa-report.mjs publish [--dry-run]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'qa-report');
const MARKER = '<!-- fernly-qa-report -->';
const FINDING_KEY = '<!-- qa-finding-key:';

const PLAYWRIGHT_JSON = path.join(ROOT, 'reports', 'playwright.json');
const CYPRESS_RESULTS_DIR = path.join(ROOT, 'web', 'cypress', 'results');
const A11Y_SUMMARY = path.join(ROOT, 'a11y-report', 'summary.md');
const FINDINGS_FILE = path.join(ROOT, 'FINDINGS.md');

const ANSI_RE = /\u001b\[[0-9;]*m/g;
const FINDING_SECTION_START = /^##\s+Findings\s*$/m;

function stripAnsi(s) {
  return s.replace(ANSI_RE, '');
}

function firstLine(s) {
  const t = stripAnsi(s).trim();
  const i = t.indexOf('\n');
  return i === -1 ? t : t.slice(0, i);
}

function decodeXmlText(s) {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** @returns {{ title: string, body: string, id: string }[]} */
function parseFindings(md) {
  const start = md.search(FINDING_SECTION_START);
  if (start === -1) return [];
  const rest = md.slice(start);
  const lines = rest.split(/\r?\n/);
  /** @type {{ title: string, body: string, id: string }[]} */
  const entries = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^###\s+(F-\d+):\s+(.+)\s*$/);
    if (m) {
      const id = m[1];
      const title = m[2].trim();
      const bodyLines = [line];
      i += 1;
      while (i < lines.length) {
        if (/^###\s+F-\d+:/.test(lines[i]) || /^##\s+/.test(lines[i])) break;
        bodyLines.push(lines[i]);
        i += 1;
      }
      entries.push({ id, title, body: bodyLines.join('\n').trim() });
      continue;
    }
    i += 1;
  }
  return entries;
}

/** @param {string} baseRef */
function loadBaseFindingTitles(baseRef) {
  if (!baseRef) return null;
  try {
    const ref = `origin/${baseRef}`;
    const out = execFileSync('git', ['show', `${ref}:FINDINGS.md`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return new Set(parseFindings(out).map((e) => e.title));
  } catch {
    return null;
  }
}

/** @typedef {{ passed: number, failed: number, knownBugs: number, skipped: number, notRun?: boolean }} SuiteTotals */

/**
 * @param {string} xml
 * @returns {{ passed: number, failed: number, skipped: number, failures: { name: string, file: string, line: number, message: string }[] }}
 */
function parseJUnit(xml) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  /** @type {{ name: string, file: string, line: number, message: string }[]} */
  const failures = [];
  const testcaseRe =
    /<testcase\b[^>]*\bname="([^"]*)"[^>]*>([\s\S]*?)<\/testcase>|<testcase\b[^>]*\bname="([^"]*)"[^>]*\/>/g;
  let m;
  while ((m = testcaseRe.exec(xml)) !== null) {
    const name = m[1] ?? m[3] ?? '';
    const inner = m[2] ?? '';
    if (!name) continue;
    if (/<skipped\b/.test(inner)) {
      skipped += 1;
      continue;
    }
    const failM = inner.match(/<failure\b[^>]*\bmessage="([^"]*)"[^>]*>([\s\S]*?)<\/failure>/);
    if (failM) {
      failed += 1;
      let file = '';
      let line = 0;
      const cdata = failM[2] ?? '';
      const stackM = cdata.match(/\(([^)]+):(\d+):\d+\)/);
      if (stackM) {
        file = stackM[1].replace(/\\/g, '/');
        line = Number(stackM[2]) || 0;
      }
      const msg = decodeXmlText(firstLine(failM[1] || cdata));
      const relFile = file.replace(/\\/g, '/');
      const rootNorm = ROOT.replace(/\\/g, '/');
      const shortFile = relFile.startsWith(rootNorm)
        ? relFile.slice(rootNorm.length + 1)
        : relFile.includes('/web/cypress/')
          ? relFile.slice(relFile.indexOf('web/cypress/'))
          : relFile;
      failures.push({ name, file: shortFile, line, message: msg });
    } else if (inner.trim() === '') {
      passed += 1;
    } else if (!/<failure\b/.test(inner)) {
      passed += 1;
    }
  }
  return { passed, failed, skipped, failures };
}

/** @param {string} dir @param {RegExp} pattern */
function readJUnitSuites(dir, pattern, suiteName) {
  if (!existsSync(dir)) {
    return {
      name: suiteName,
      totals: { passed: 0, failed: 0, knownBugs: 0, skipped: 0, notRun: true },
      failures: [],
    };
  }
  const files = readdirSync(dir).filter((f) => pattern.test(f));
  if (files.length === 0) {
    return {
      name: suiteName,
      totals: { passed: 0, failed: 0, knownBugs: 0, skipped: 0, notRun: true },
      failures: [],
    };
  }
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  /** @type {{ name: string, file: string, line: number, message: string }[]} */
  const failures = [];
  for (const f of files) {
    const xml = readFileSync(path.join(dir, f), 'utf8');
    const p = parseJUnit(xml);
    passed += p.passed;
    failed += p.failed;
    skipped += p.skipped;
    failures.push(...p.failures);
  }
  return {
    name: suiteName,
    totals: { passed, failed, knownBugs: 0, skipped },
    failures,
  };
}

/**
 * @typedef {{ project: string, title: string, file: string, line: number, message: string, kind: 'failed' | 'known' | 'visual' }} PwCase
 */

/** @param {unknown} report */
function parsePlaywright(report) {
  /** @type {Map<string, SuiteTotals & { failures: PwCase[], known: PwCase[], visual: PwCase[] }>} */
  const byProject = new Map();

  /** @param {string} project */
  function ensure(project) {
    if (!byProject.has(project)) {
      byProject.set(project, {
        passed: 0,
        failed: 0,
        knownBugs: 0,
        skipped: 0,
        failures: [],
        known: [],
        visual: [],
      });
    }
    return byProject.get(project);
  }

  /** @param {string | undefined} desc */
  function findingRef(desc) {
    if (!desc) return null;
    const m = desc.match(/FINDING-(\d+)\s*:\s*(.+)/);
    if (!m) return null;
    return { num: m[1], title: m[2].trim() };
  }

  function isVisualFailure(errMsg, project, title) {
    const e = (errMsg || '').toLowerCase();
    return (
      project === 'visual' ||
      e.includes('tohavescreenshot') ||
      e.includes('snapshot') ||
      e.includes('screenshot')
    );
  }

  /** @param {any[]} suites @param {string[]} titlePath */
  function walk(suites, titlePath) {
    if (!Array.isArray(suites)) return;
    for (const suite of suites) {
      const nextPath = suite.title ? [...titlePath, suite.title] : titlePath;
      if (Array.isArray(suite.specs)) {
        for (const spec of suite.specs) {
          const specTitle = spec.title || '';
          if (!Array.isArray(spec.tests)) continue;
          for (const test of spec.tests) {
            const project = test.projectName || test.projectId || 'unknown';
            const bucket = ensure(project);
            const testTitle = [...nextPath, specTitle].filter(Boolean).join(' › ');
            const ann = test.annotations || [];
            const failAnn = ann.find((a) => a.type === 'fail' && /FINDING-\d+/.test(a.description || ''));
            const expectedStatus = test.expectedStatus || 'passed';
            const lastResult = (test.results || [])[test.results.length - 1];
            const status = lastResult?.status || 'skipped';
            const testStatus = test.status;

            if (status === 'skipped' || testStatus === 'skipped') {
              bucket.skipped += 1;
              continue;
            }

            const isKnown =
              failAnn &&
              expectedStatus === 'failed' &&
              (testStatus === 'expected' || (lastResult?.status === 'failed' && testStatus === 'expected'));

            if (isKnown) {
              bucket.knownBugs += 1;
              const ref = findingRef(failAnn.description);
              const loc = failAnn.location || lastResult?.errorLocation || lastResult?.error?.location;
              bucket.known.push({
                project,
                title: testTitle,
                file: (loc?.file || spec.file || '').replace(/\\/g, '/'),
                line: loc?.line || spec.line || 0,
                message: ref ? `${ref.title}` : firstLine(failAnn.description || ''),
                kind: 'known',
              });
              continue;
            }

            const unexpected =
              testStatus === 'unexpected' ||
              (lastResult?.status === 'failed' && expectedStatus === 'passed') ||
              spec.ok === false;

            if (unexpected || lastResult?.status === 'failed') {
              bucket.failed += 1;
              const err = lastResult?.error || lastResult?.errors?.[0];
              const loc = err?.location || lastResult?.errorLocation || { file: spec.file, line: spec.line };
              const msg = firstLine(err?.message || 'Test failed');
              const row = {
                project,
                title: testTitle,
                file: (loc?.file || '').replace(/\\/g, '/'),
                line: loc?.line || 0,
                message: msg,
                kind: /** @type {'failed' | 'visual'} */ ('failed'),
              };
              if (isVisualFailure(msg, project, testTitle)) {
                row.kind = 'visual';
                bucket.visual.push(row);
              } else {
                bucket.failures.push(row);
              }
              continue;
            }

            bucket.passed += 1;
          }
        }
      }
      if (Array.isArray(suite.suites)) walk(suite.suites, nextPath);
    }
  }

  walk(report.suites || [], []);

  const configProjects = (report.config?.projects || []).map((p) => p.name);
  for (const name of configProjects) ensure(name);

  /** @type {{ name: string, totals: SuiteTotals, failures: PwCase[], known: PwCase[], visual: PwCase[] }[]} */
  const suites = [];
  const order = configProjects.length ? configProjects : [...byProject.keys()];
  for (const name of order) {
    const b = byProject.get(name);
    if (!b) {
      suites.push({
        name,
        totals: { passed: 0, failed: 0, knownBugs: 0, skipped: 0, notRun: true },
        failures: [],
        known: [],
        visual: [],
      });
    } else {
      const ran = b.passed + b.failed + b.knownBugs + b.skipped > 0;
      suites.push({
        name,
        totals: ran
          ? { passed: b.passed, failed: b.failed, knownBugs: b.knownBugs, skipped: b.skipped }
          : { passed: 0, failed: 0, knownBugs: 0, skipped: 0, notRun: true },
        failures: b.failures,
        known: b.known,
        visual: b.visual,
      });
    }
  }
  return suites;
}

function envRunUrl() {
  const explicit = process.env.RUN_URL || process.env.GITHUB_RUN_URL;
  if (explicit) return explicit;
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (repo && runId) return `${server}/${repo}/actions/runs/${runId}`;
  return '';
}

function envPrUrl() {
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  if (repo && pr) return `https://github.com/${repo}/pull/${pr}`;
  return '';
}

function build() {
  const baseRef = process.env.BASE_REF || 'init';
  const prNumber = process.env.PR_NUMBER || '';
  const sha = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const runUrl = envRunUrl();
  const prUrl = envPrUrl();

  const cypressComponent = readJUnitSuites(
    CYPRESS_RESULTS_DIR,
    /^component-.+\.xml$/,
    'Cypress component',
  );
  const cypressUi = readJUnitSuites(CYPRESS_RESULTS_DIR, /^ui-.+\.xml$/, 'Cypress UI');

  let pwSuites = [];
  let pwInput = 'not run';
  if (existsSync(PLAYWRIGHT_JSON)) {
    pwInput = 'reports/playwright.json';
    try {
      const report = JSON.parse(readFileSync(PLAYWRIGHT_JSON, 'utf8'));
      pwSuites = parsePlaywright(report);
    } catch (e) {
      pwInput = `reports/playwright.json (parse error: ${e.message})`;
    }
  }

  let a11ySummary = 'not run';
  if (existsSync(A11Y_SUMMARY)) {
    a11ySummary = readFileSync(A11Y_SUMMARY, 'utf8').trim();
  }

  let findings = [];
  let findingsInput = 'not run';
  if (existsSync(FINDINGS_FILE)) {
    findingsInput = 'FINDINGS.md';
    findings = parseFindings(readFileSync(FINDINGS_FILE, 'utf8'));
  }

  const baseTitles = loadBaseFindingTitles(baseRef);
  const newFindings =
    baseTitles === null
      ? []
      : findings.filter((f) => !baseTitles.has(f.title));

  const allSuites = [cypressComponent, cypressUi, ...pwSuites];

  const lines = [];
  lines.push(MARKER);
  lines.push('');
  lines.push('## QA summary');
  lines.push('');
  if (runUrl) lines.push(`[Workflow run](${runUrl})`);
  if (prUrl) lines.push(`[Pull request](${prUrl})`);
  if (sha) lines.push(`Commit: \`${sha.slice(0, 7)}\``);
  lines.push('');
  lines.push('| Suite | Passed | Failed | Known bugs | Skipped |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const s of allSuites) {
    const t = s.totals;
    if (t.notRun) {
      lines.push(`| ${s.name} | not run | not run | not run | not run |`);
    } else {
      lines.push(
        `| ${s.name} | ${t.passed} | ${t.failed} | ${t.knownBugs} | ${t.skipped} |`,
      );
    }
  }
  lines.push('');

  const hardFailures = [];
  for (const s of allSuites) {
    for (const f of s.failures) {
      if (f.kind === 'known') continue;
      hardFailures.push({ suite: s.name, ...f });
    }
  }

  lines.push('### Failed tests');
  lines.push('');
  if (hardFailures.length === 0) {
    lines.push('_None._');
  } else {
    for (const f of hardFailures) {
      const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '—';
      const label = f.title || f.name || 'test';
      lines.push(`- **${f.suite}** — ${label}`);
      lines.push(`  - \`${loc}\` — ${f.message}`);
    }
  }
  lines.push('');

  const visual = pwSuites.flatMap((s) => s.visual.map((v) => ({ suite: s.name, ...v })));
  lines.push('### Visual diffs');
  lines.push('');
  lines.push('_A person decides: defect, intended, or noise._');
  lines.push('');
  if (visual.length === 0) {
    lines.push('_None._');
  } else {
    lines.push('Compare images in the **playwright-report** workflow artifact.');
    lines.push('');
    for (const v of visual) {
      const loc = v.file ? `${v.file}${v.line ? `:${v.line}` : ''}` : '—';
      lines.push(`- **${v.suite}** — ${v.title}`);
      lines.push(`  - \`${loc}\` — ${v.message}`);
    }
  }
  lines.push('');

  const known = pwSuites.flatMap((s) => s.known.map((k) => ({ suite: s.name, ...k })));
  lines.push('### Known bugs (expected failures)');
  lines.push('');
  if (known.length === 0) {
    lines.push('_None._');
  } else {
    for (const k of known) {
      lines.push(`- **${k.suite}** — ${k.title}: ${k.message}`);
    }
  }
  lines.push('');

  lines.push('### New findings');
  lines.push('');
  if (findingsInput === 'not run') {
    lines.push('_FINDINGS.md not available._');
  } else if (baseTitles === null) {
    lines.push(`_Could not load base FINDINGS.md from \`origin/${baseRef}\`._`);
  } else if (newFindings.length === 0) {
    lines.push('_No new finding titles since the base branch._');
  } else {
    for (const f of newFindings) {
      lines.push(`- **${f.id}:** ${f.title}`);
    }
  }
  lines.push('');

  lines.push('<details>');
  lines.push('<summary>Accessibility summary</summary>');
  lines.push('');
  if (a11ySummary === 'not run') {
    lines.push('_not run_');
  } else {
    lines.push(a11ySummary);
  }
  lines.push('');
  lines.push('</details>');
  lines.push('');

  lines.push('---');
  lines.push(`Inputs: Playwright \`${pwInput}\`, Cypress \`web/cypress/results/\`, a11y \`${existsSync(A11Y_SUMMARY) ? 'a11y-report/summary.md' : 'not run'}\`, findings \`${findingsInput}\`.`);

  mkdirSync(OUT_DIR, { recursive: true });
  const commentMd = lines.join('\n');
  writeFileSync(path.join(OUT_DIR, 'comment.md'), commentMd, 'utf8');

  const issues = newFindings.map((f) => {
    const key = slugify(f.title);
    const footer = [
      '',
      prUrl ? `Pull request: ${prUrl}` : '',
      runUrl ? `Workflow run: ${runUrl}` : '',
      `${FINDING_KEY} ${key} -->`,
    ]
      .filter(Boolean)
      .join('\n');
    return {
      key,
      title: `[QA] ${f.title}`,
      body: `${f.body}\n${footer}`,
    };
  });
  writeFileSync(path.join(OUT_DIR, 'issues.json'), JSON.stringify(issues, null, 2), 'utf8');

  const totals = {};
  for (const s of allSuites) {
    totals[s.name] = s.totals;
  }

  const runJson = {
    sha,
    pr: prNumber ? Number(prNumber) : null,
    runUrl,
    prUrl,
    time: new Date().toISOString(),
    inputs: {
      playwright: pwInput,
      cypress: existsSync(CYPRESS_RESULTS_DIR) ? 'web/cypress/results' : 'not run',
      a11y: existsSync(A11Y_SUMMARY) ? 'a11y-report/summary.md' : 'not run',
      findings: findingsInput,
    },
    suites: totals,
    failed: hardFailures.length,
    knownBugs: known.length,
    visualChanges: visual.length,
    findings: findings.length,
    newFindings: newFindings.map((f) => ({ id: f.id, title: f.title, key: slugify(f.title) })),
  };
  writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(runJson, null, 2), 'utf8');

  console.log(`Wrote ${OUT_DIR}/comment.md, issues.json, run.json`);
}

function runGh(args, input) {
  const r = spawnSync('gh', args, {
    cwd: ROOT,
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    throw new Error(`gh ${args.join(' ')} failed: ${err}`);
  }
  return r.stdout;
}

function publish(dryRun) {
  const commentPath = path.join(OUT_DIR, 'comment.md');
  const issuesPath = path.join(OUT_DIR, 'issues.json');
  if (!existsSync(commentPath) || !existsSync(issuesPath)) {
    throw new Error('Run build first (missing qa-report/comment.md or issues.json)');
  }
  const body = readFileSync(commentPath, 'utf8');
  const issues = JSON.parse(readFileSync(issuesPath, 'utf8'));

  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  if (!repo || !pr) {
    throw new Error('GITHUB_REPOSITORY and PR_NUMBER are required for publish');
  }
  const [owner, name] = repo.split('/');

  if (dryRun) {
    console.log('--- dry-run: PR comment ---');
    console.log(body);
    console.log('--- dry-run: would upsert PR comment on', repo, 'PR', pr);
  } else {
    const listJson = runGh([
      'api',
      `repos/${owner}/${name}/issues/${pr}/comments`,
      '--paginate',
    ]);
    /** @type {{ id: number, body: string }[]} */
    let comments = [];
    try {
      comments = JSON.parse(listJson);
    } catch {
      comments = [];
    }
    const existing = comments.find((c) => (c.body || '').trimStart().startsWith(MARKER));
    if (existing) {
      runGh([
        'api',
        '-X',
        'PATCH',
        `repos/${owner}/${name}/issues/comments/${existing.id}`,
        '-F',
        `body@${commentPath}`,
      ]);
      console.log(`Updated PR comment ${existing.id}`);
    } else {
      runGh(['pr', 'comment', pr, '--repo', repo, '--body-file', commentPath]);
      console.log('Created PR comment');
    }
  }

  const filedKeys = new Set();
  if (dryRun) {
    console.log('--- dry-run: would list issues labelled qa-finding (all states) ---');
  } else {
    const listed = runGh([
      'issue',
      'list',
      '--repo',
      repo,
      '--label',
      'qa-finding',
      '--state',
      'all',
      '--json',
      'body',
      '--limit',
      '500',
    ]);
    /** @type {{ body: string }[]} */
    const existingIssues = JSON.parse(listed);
    for (const item of existingIssues) {
      const m = (item.body || '').match(/<!-- qa-finding-key:\s*([^\s]+)\s*-->/);
      if (m) filedKeys.add(m[1]);
    }
  }

  for (const issue of issues) {
    if (filedKeys.has(issue.key)) {
      console.log(`Skip issue (already filed): ${issue.key}`);
      continue;
    }
    if (dryRun) {
      console.log('--- dry-run: would create issue ---');
      console.log('Title:', issue.title);
      console.log('Label: qa-finding');
      console.log('Body:', issue.body);
      continue;
    }
    const bodyFile = path.join(OUT_DIR, `.issue-${issue.key}.md`);
    writeFileSync(bodyFile, issue.body, 'utf8');
    runGh([
      'issue',
      'create',
      '--repo',
      repo,
      '--title',
      issue.title,
      '--label',
      'qa-finding',
      '--body-file',
      bodyFile,
    ]);
    console.log(`Created issue for key ${issue.key}`);
  }
}

const cmd = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (cmd === 'build') {
  build();
} else if (cmd === 'publish') {
  publish(dryRun);
} else {
  console.error('Usage: node scripts/qa-report.mjs build | publish [--dry-run]');
  process.exit(1);
}
