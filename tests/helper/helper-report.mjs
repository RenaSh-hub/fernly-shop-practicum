#!/usr/bin/env node
/**
 * Merge helper tier JSON artifacts into helper-results/report.md (Node 20+, no deps).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resultsRoot = path.join(repoRoot, 'helper-results');
const featurePath = path.join(repoRoot, 'tests', 'helper', 'helper.feature');
const outPath = path.join(resultsRoot, 'report.md');

const TIERS = ['a', 'b', 'c'];
const ANSI_RE = /\u001b\[[0-9;]*m/g;

function stripAnsi(s) {
  return String(s).replace(ANSI_RE, '');
}

function escapeTableCell(s) {
  return stripAnsi(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function rowKey(scenario, example, then) {
  return `${scenario}\0${example}\0${then}`;
}

function parsePipeTable(lines) {
  const rows = [];
  let headers = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed
      .slice(1, trimmed.endsWith('|') ? -1 : undefined)
      .split('|')
      .map((cell) => cell.trim());
    if (!headers) {
      headers = cells;
      continue;
    }
    if (cells.every((cell) => /^-+$/.test(cell))) continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function fillPlaceholders(text, row) {
  return text.replace(/<([^>]+)>/g, (_, key) => row[key] ?? `<${key}>`);
}

/** @returns {{ scenario: string, example: string, then: string }[]} */
function featureRowOrder() {
  const source = fs.readFileSync(featurePath, 'utf8');
  const lines = source.split(/\r?\n/);
  const ordered = [];
  let scenario = '';
  let whenTemplate = '';
  let thenTemplates = [];
  let tableLines = [];
  let inExamples = false;

  function flushScenario() {
    if (!scenario || !whenTemplate) return;
    const rows = tableLines.length > 0 ? parsePipeTable(tableLines) : [{}];
    for (const row of rows) {
      const example =
        row.phrase ??
        row.plantId ??
        row.plant ??
        fillPlaceholders(whenTemplate, row).replace(/^I ask the helper "/, '').replace(/"$/, '');
      for (const then of thenTemplates.map((t) => fillPlaceholders(t, row))) {
        ordered.push({ scenario, example, then });
      }
    }
    whenTemplate = '';
    thenTemplates = [];
    tableLines = [];
    inExamples = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('@')) continue;
    if (trimmed.startsWith('Feature:')) continue;
    if (trimmed.startsWith('Background:')) continue;
    if (trimmed.startsWith('Given ') || trimmed.startsWith('And my cart')) continue;

    if (trimmed.startsWith('Scenario') || trimmed.startsWith('Scenario Outline:')) {
      flushScenario();
      scenario = trimmed.replace(/^Scenario(?: Outline)?:\s*/, '');
      continue;
    }
    if (trimmed.startsWith('When ')) {
      whenTemplate = trimmed.replace(/^When\s+/, '');
      continue;
    }
    if (trimmed.startsWith('Then ') || trimmed.startsWith('And ')) {
      thenTemplates.push(trimmed.replace(/^(?:Then|And)\s+/, ''));
      continue;
    }
    if (trimmed.startsWith('Examples:')) {
      inExamples = true;
      tableLines = [];
      continue;
    }
    if (inExamples && trimmed.startsWith('|')) {
      tableLines.push(line);
    }
  }
  flushScenario();
  return ordered;
}

function readJsonFilesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(dir, name);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      console.error(`Skipping unreadable JSON: ${file}`);
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    out.push(...parsed);
  }
  return out;
}

/** @param {'a'|'b'|'c'} tier */
function tierLetter(tier) {
  return tier.toLowerCase();
}

/** @returns {Map<string, Map<string, object>>} */
function loadByTier() {
  /** @type {Map<string, Map<string, object>>} */
  const map = new Map();
  for (const tier of TIERS) {
    const dir = path.join(resultsRoot, `tier-${tier}`);
    const entries = readJsonFilesIn(dir);
    const byKey = new Map();
    for (const entry of entries) {
      const key = rowKey(entry.scenario, entry.example, entry.then);
      const normalized = { ...entry, tier: tierLetter(entry.tier ?? tier) };
      byKey.set(key, normalized);
    }
    map.set(tier, byKey);
  }
  return map;
}

function checkedOutcome(entry) {
  if (!entry) return null;
  if (entry.result === 'pass' || entry.result === 'fail') return entry.result;
  return null;
}

function formatTierCell(tier, entry) {
  if (!entry) return '—';
  if (entry.result === 'skip' || entry.result === 'judge') return '—';
  if (entry.result !== 'pass' && entry.result !== 'fail') return '—';
  if (tier === 'b' && entry.passRate) {
    return `${entry.result} (${entry.passRate})`;
  }
  return entry.result;
}

function tiersDisagree(byTier) {
  const outcomes = TIERS.map((t) => checkedOutcome(byTier.get(t))).filter(Boolean);
  if (outcomes.length < 2) return false;
  return new Set(outcomes).size > 1;
}

function buildReport() {
  const byTier = loadByTier();
  const order = featureRowOrder();
  const orderIndex = new Map();
  order.forEach((row, i) => {
    orderIndex.set(rowKey(row.scenario, row.example, row.then), i);
  });

  const allKeys = new Set();
  for (const tierMap of byTier.values()) {
    for (const key of tierMap.keys()) allKeys.add(key);
  }

  const keys = [...allKeys].sort((a, b) => {
    const ai = orderIndex.get(a);
    const bi = orderIndex.get(b);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.localeCompare(b);
  });

  /** @type {{ scenario: string, example: string, then: string, cells: Record<string, string>, disagree: boolean, byTier: Map<string, object | undefined> }[]} */
  const rows = [];

  for (const key of keys) {
    const [scenario, example, then] = key.split('\0');
    const rowTiers = new Map();
    for (const tier of TIERS) {
      rowTiers.set(tier, byTier.get(tier)?.get(key));
    }
    const cells = Object.fromEntries(TIERS.map((t) => [t, formatTierCell(t, rowTiers.get(t))]));
    rows.push({
      scenario,
      example,
      then,
      cells,
      disagree: tiersDisagree(rowTiers),
      byTier: rowTiers,
    });
  }

  const lines = [];
  lines.push('# Fernly Helper tier report');
  lines.push('');
  lines.push(
    `Generated ${new Date().toISOString().slice(0, 19)}Z from \`helper-results/tier-{a,b,c}/*.json\`.`,
  );
  lines.push('');
  lines.push(
    'Tier A = deterministic UI checks after a scripted tool call; tier B = 10-run pass rate on natural phrases; tier C = agent judge.',
  );
  lines.push('');
  lines.push('— means that tier did not check the Then (skip, judge, or no run).');
  lines.push('');

  const disagreeRows = rows.filter((r) => r.disagree);
  lines.push(`## Tier disagreements (${disagreeRows.length})`);
  lines.push('');
  if (disagreeRows.length === 0) {
    lines.push('_No rows where two or more tiers disagreed on pass vs fail._');
  } else {
    lines.push('| Scenario | Example | Then | A | B | C |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const r of disagreeRows) {
      lines.push(
        `| ${escapeTableCell(r.scenario)} | ${escapeTableCell(r.example)} | ${escapeTableCell(r.then)} | ${r.cells.a} | ${r.cells.b} | ${r.cells.c} |`,
      );
    }
  }
  lines.push('');

  lines.push('## All Thens');
  lines.push('');
  lines.push('| Scenario | Example | Then | A | B | C | ! |');
  lines.push('| --- | --- | --- | --- | --- | --- | :---: |');
  for (const r of rows) {
    const mark = r.disagree ? '**!**' : '';
    lines.push(
      `| ${escapeTableCell(r.scenario)} | ${escapeTableCell(r.example)} | ${escapeTableCell(r.then)} | ${r.cells.a} | ${r.cells.b} | ${r.cells.c} | ${mark} |`,
    );
  }
  lines.push('');

  const failureRows = rows.filter((r) =>
    TIERS.some((t) => {
      const e = r.byTier.get(t);
      return e?.result === 'fail';
    }),
  );

  lines.push(`## Failures (${failureRows.length} rows with at least one tier failing)`);
  lines.push('');
  if (failureRows.length === 0) {
    lines.push('_None._');
  } else {
    for (const r of failureRows) {
      lines.push(`### ${r.example}`);
      lines.push('');
      lines.push(`- **Scenario:** ${r.scenario}`);
      lines.push(`- **Then:** ${r.then}`);
      lines.push(`- **A:** ${r.cells.a} · **B:** ${r.cells.b} · **C:** ${r.cells.c}`);
      lines.push('');
      for (const tier of TIERS) {
        const e = r.byTier.get(tier);
        if (!e || e.result !== 'fail') continue;
        const evidence = escapeTableCell(e.evidence || '(no evidence)');
        lines.push(`**Tier ${tier.toUpperCase()}** — ${evidence}`);
        lines.push('');
      }
    }
  }

  fs.mkdirSync(resultsRoot, { recursive: true });
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');

  return { rows, disagreeRows, outPath };
}

const { disagreeRows, outPath: written } = buildReport();
console.log(`Wrote ${written}`);

if (disagreeRows.length > 0) {
  console.log('');
  console.log('Rows where tiers disagree:');
  for (const r of disagreeRows) {
    console.log(`  ${r.example} — ${r.then}`);
    console.log(`    A: ${r.cells.a}  B: ${r.cells.b}  C: ${r.cells.c}`);
  }
}