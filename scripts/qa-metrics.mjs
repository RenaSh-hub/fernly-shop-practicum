#!/usr/bin/env node
/**
 * QA pipeline metrics (Node 22+, no dependencies). Read-only via `gh`.
 * Usage: node scripts/qa-metrics.mjs [--out docs/QA-METRICS.md]
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const QA_MARKER = '<!-- fernly-qa-report -->';
const PLAN_REVIEW_RE = /^Plan review:\s*(\d+)\s*\/\s*(\d+)\b/i;
const BOT_LOGIN = 'github-actions[bot]';
const WORKFLOW_NAME = 'PR triage';

/** @param {string[]} args */
function runGh(args) {
  const r = spawnSync('gh', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    throw new Error(`gh ${args.join(' ')} failed: ${err}`);
  }
  return (r.stdout || '').trim();
}

/** @param {string} json */
function parseJson(json, label) {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error(`Failed to parse JSON from ${label}`);
  }
}

/** @param {string} iso */
function parseTime(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/** @param {number | null} ms */
function toMinutes(ms) {
  if (ms == null || ms < 0) return null;
  return Math.round((ms / 60_000) * 10) / 10;
}

/** @param {number | null | undefined} n */
function fmtNum(n) {
  if (n == null) return '—';
  return String(n);
}

/** @param {number | null | undefined} n */
function fmtMin(n) {
  if (n == null) return '—';
  return `${n}`;
}

/** @param {{ type?: string, login?: string } | null | undefined} user */
function isPerson(user) {
  if (!user) return false;
  if (user.type === 'Bot') return false;
  if (user.login === BOT_LOGIN) return false;
  if ((user.login || '').endsWith('[bot]')) return false;
  return true;
}

/** @param {string | null | undefined} body */
function isQaReport(body) {
  return (body || '').trimStart().startsWith(QA_MARKER);
}

/**
 * @param {{ created_at: string, body?: string, user?: { login?: string, type?: string } }[]} comments
 * @param {number} openedAt
 */
function minutesToPlan(comments, openedAt) {
  const sorted = [...comments].sort(
    (a, b) => (parseTime(a.created_at) ?? 0) - (parseTime(b.created_at) ?? 0),
  );
  for (const c of sorted) {
    if (c.user?.login !== BOT_LOGIN) continue;
    if (isQaReport(c.body)) continue;
    const created = parseTime(c.created_at);
    if (created == null) continue;
    return toMinutes(created - openedAt);
  }
  return null;
}

/**
 * @param {{ created_at: string, body?: string }[]} comments
 * @param {number} openedAt
 */
function minutesToQaReport(comments, openedAt) {
  const sorted = [...comments].sort(
    (a, b) => (parseTime(a.created_at) ?? 0) - (parseTime(b.created_at) ?? 0),
  );
  for (const c of sorted) {
    if (!isQaReport(c.body)) continue;
    const created = parseTime(c.created_at);
    if (created == null) continue;
    return toMinutes(created - openedAt);
  }
  return null;
}

/**
 * @param {{ created_at: string, body?: string, user?: { login?: string, type?: string } }[]} comments
 */
function parsePlanReview(comments) {
  const sorted = [...comments].sort(
    (a, b) => (parseTime(a.created_at) ?? 0) - (parseTime(b.created_at) ?? 0),
  );
  /** @type {{ right: number, total: number, note: string } | null} */
  let last = null;
  for (const c of sorted) {
    if (!isPerson(c.user)) continue;
    const body = (c.body || '').trim();
    const m = body.match(PLAN_REVIEW_RE);
    if (!m) continue;
    const right = Number(m[1]);
    const total = Number(m[2]);
    let note = '';
    const rest = body.slice((m.index ?? 0) + m[0].length);
    const noteMatch = rest.match(/^\s*[—–-]\s*(.+)/s);
    if (noteMatch) note = noteMatch[1].trim().split(/\r?\n/)[0];
    last = { right, total, note };
  }
  return last;
}

/**
 * @param {{ headBranch: string, conclusion: string | null, createdAt: string, updatedAt: string }[]} runs
 * @param {string} branch
 */
function agentMinutesForBranch(runs, branch) {
  let totalMs = 0;
  for (const run of runs) {
    if (run.headBranch !== branch) continue;
    const conclusion = run.conclusion;
    if (!conclusion || conclusion === 'action_required' || conclusion === 'stale') continue;
    if (conclusion === 'cancelled' || conclusion === 'skipped') continue;
    const start = parseTime(run.createdAt);
    const end = parseTime(run.updatedAt);
    if (start == null || end == null) continue;
    totalMs += end - start;
  }
  return toMinutes(totalMs);
}

/**
 * @param {string} body
 * @param {string} repoWithOwner
 * @param {number} prNumber
 */
function issueLinksToPr(body, repoWithOwner, prNumber) {
  const text = body || '';
  const [owner, name] = repoWithOwner.split('/');
  const patterns = [
    new RegExp(`https://github\\.com/${owner}/${name}/pull/${prNumber}\\b`, 'i'),
    new RegExp(`github\\.com/[^/]+/[^/]+/pull/${prNumber}\\b`, 'i'),
    new RegExp(`\\bpull/${prNumber}\\b`),
    new RegExp(`\\bPR\\s*#?${prNumber}\\b`, 'i'),
  ];
  return patterns.some((re) => re.test(text));
}

function pct(num, den) {
  if (!den) return '—';
  return `${Math.round((num / den) * 1000) / 10}%`;
}

function main() {
  const outIdx = process.argv.indexOf('--out');
  const outPath = path.resolve(
    ROOT,
    outIdx !== -1 && process.argv[outIdx + 1]
      ? process.argv[outIdx + 1]
      : 'docs/QA-METRICS.md',
  );

  const repoJson = runGh(['repo', 'view', '--json', 'nameWithOwner']);
  const repoWithOwner = parseJson(repoJson, 'repo view').nameWithOwner;
  const [owner, repo] = repoWithOwner.split('/');

  const prsJson = runGh([
    'pr',
    'list',
    '--label',
    'plan-approved',
    '--state',
    'all',
    '--json',
    'number,title,createdAt,headRefName,url',
    '--limit',
    '200',
  ]);
  /** @type {{ number: number, title: string, createdAt: string, headRefName: string, url: string }[]} */
  const prs = parseJson(prsJson, 'pr list');

  const runsJson = runGh([
    'run',
    'list',
    '--workflow',
    WORKFLOW_NAME,
    '--limit',
    '500',
    '--json',
    'headBranch,conclusion,createdAt,updatedAt',
  ]);
  /** @type {{ headBranch: string, conclusion: string | null, createdAt: string, updatedAt: string }[]} */
  const triageRuns = parseJson(runsJson, 'workflow runs');

  const issuesJson = runGh([
    'issue',
    'list',
    '--label',
    'qa-finding',
    '--state',
    'all',
    '--json',
    'number,body,state,stateReason',
    '--limit',
    '500',
  ]);
  /** @type {{ number: number, body: string, state: string, stateReason: string }[]} */
  const allFindings = parseJson(issuesJson, 'issue list');

  /** @type {Record<string, unknown>[]} */
  const rows = [];

  let sumRight = 0;
  let sumReviewed = 0;
  let sumFindings = 0;
  let sumFalseAlarms = 0;

  for (const pr of prs) {
    const commentsJson = runGh([
      'api',
      `repos/${owner}/${repo}/issues/${pr.number}/comments`,
      '--paginate',
    ]);
    /** @type {{ created_at: string, body?: string, user?: { login?: string, type?: string } }[]} */
    const comments = parseJson(commentsJson, `PR ${pr.number} comments`);

    const openedAt = parseTime(pr.createdAt);
    const planReview = parsePlanReview(comments);
    const minPlan =
      openedAt != null ? minutesToPlan(comments, openedAt) : null;
    const minQa =
      openedAt != null ? minutesToQaReport(comments, openedAt) : null;
    const agentMin = agentMinutesForBranch(triageRuns, pr.headRefName);

    const linked = allFindings.filter((issue) =>
      issueLinksToPr(issue.body, repoWithOwner, pr.number),
    );
    const findings = linked.length;
    const falseAlarms = linked.filter(
      (i) => i.state === 'CLOSED' && i.stateReason === 'NOT_PLANNED',
    ).length;

    if (planReview) {
      sumRight += planReview.right;
      sumReviewed += planReview.total;
    }
    sumFindings += findings;
    sumFalseAlarms += falseAlarms;

    const planReviewCol = planReview
      ? `${planReview.right}/${planReview.total}${planReview.note ? ` — ${planReview.note}` : ''}`
      : '—';

    rows.push({
      pr: `[#${pr.number}](${pr.url})`,
      title: pr.title.replace(/\|/g, '\\|'),
      planReview: planReviewCol,
      minPlan,
      minQa,
      agentMin,
      findings,
      falseAlarms,
    });
  }

  const generated = new Date().toISOString();
  const lines = [
    '# QA metrics',
    '',
    `_Generated ${generated} by \`node scripts/qa-metrics.mjs\` (read-only; data from GitHub via \`gh\`)._`,
    '',
    `**Totals:** routing accuracy = ${sumRight}/${sumReviewed} (${pct(sumRight, sumReviewed)}); false-alarm rate = ${sumFalseAlarms}/${sumFindings} (${pct(sumFalseAlarms, sumFindings)}). **Agent spend** is not available in GitHub — see the [Cursor usage dashboard](https://cursor.com/dashboard?tab=usage).`,
    '',
    '| PR | Title | Plan review | Min to plan | Min to QA report | Agent min | Findings | False alarms |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const r of rows) {
    lines.push(
      `| ${r.pr} | ${r.title} | ${r.planReview} | ${fmtMin(r.minPlan)} | ${fmtMin(r.minQa)} | ${fmtMin(r.agentMin)} | ${fmtNum(r.findings)} | ${fmtNum(r.falseAlarms)} |`,
    );
  }

  if (rows.length === 0) {
    lines.push('| _none_ | — | — | — | — | — | — | — |');
  }

  lines.push(
    '',
    '## How each number is measured',
    '',
    '- **Pull requests:** open and closed PRs labelled `plan-approved`.',
    '- **Plan review (N/M):** the latest PR comment by a person (not a bot) whose body starts with `Plan review: N/M`. Text after an em dash on that line is the routing gap summary. N counts plan rows whose change was sent to the right test level; M is rows reviewed.',
    '- **Min to plan:** minutes from PR open to the first `github-actions[bot]` PR comment that is not the QA report (`<!-- fernly-qa-report -->`).',
    '- **Min to QA report:** minutes from PR open to the first comment whose body starts with `<!-- fernly-qa-report -->`.',
    `- **Agent min:** sum of run durations for finished **${WORKFLOW_NAME}** workflow runs on the PR head branch (\`updatedAt − createdAt\`; successes and failures; excludes cancelled/skipped).`,
    '- **Findings:** issues labelled `qa-finding` whose body links to the PR (`Pull request:` URL, `/pull/N`, or `PR #N`).',
    '- **False alarms:** those findings with `stateReason` **not planned** (closed as not planned).',
    '- **Routing accuracy:** Σ(plan rows right) ÷ Σ(plan rows reviewed) across PRs with a plan review comment.',
    '- **False-alarm rate:** false alarms ÷ findings across the same PR set.',
    '- **Money:** not stored in GitHub; use the Cursor dashboard for API/agent cost.',
    '',
  );

  const markdown = lines.join('\n');
  writeFileSync(outPath, markdown, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, outPath)} (${prs.length} plan-approved PRs)`);
}

main();
