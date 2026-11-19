#!/usr/bin/env node
/**
 * Merge helper tier JSON into report.md, summary.md, and sync FINDINGS.md F-19+ (Node 20+, no deps).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resultsRoot = path.join(repoRoot, 'helper-results');
const featurePath = path.join(repoRoot, 'tests', 'helper', 'helper.feature');
const outPath = path.join(resultsRoot, 'report.md');
const summaryPath = path.join(resultsRoot, 'summary.md');
const findingsPath = path.join(repoRoot, 'FINDINGS.md');
const FINDINGS_SYNC_START = '<!-- helper-findings-sync-start -->';
const FINDINGS_SYNC_END = '<!-- helper-findings-sync-end -->';

/** @typedef {{ num: number, groupKeys: string[], title: string, where: string, category: string, impact: string, contradicts: string, suggestedFix: string }} HelperFindingCatalog */

/** @type {HelperFindingCatalog[]} */
const HELPER_FINDINGS_CATALOG = [
  {
    num: 19,
    groupKeys: ['code:code-header-count'],
    title: 'Helper add does not refresh the header cart count',
    where: '`HelperWidget` (`web/src/components/HelperWidget.tsx`); cart link in `Layout.tsx`.',
    category: 'Pages',
    impact:
      'After the helper adds to the cart, the header still reads **Cart** with no item count until the customer reloads or visits the cart.',
    contradicts:
      'docs/features/fernly-helper.md L14, L21–22 — `add_to_cart` updates **the cart count in the header right away**.',
    suggestedFix: 'Invalidate `queryKey: [\'cart\']` (match `useCart()` in `queries.ts`) after a successful helper add.',
  },
  {
    num: 20,
    groupKeys: ['code:code-cart-size-s'],
    title: 'Helper `add_to_cart` always posts size S to the API',
    where: '`HelperWidget.run` (`web/src/components/HelperWidget.tsx`).',
    category: 'Business rules in the API',
    impact:
      'Customers who ask for medium or large sizes get small lines, wrong prices, and wrong stock checks.',
    contradicts:
      'docs/features/fernly-helper.md L13–14, L18 — `add_to_cart` takes `size` (`S`, `M`, `L`) and adds **that size** to the cart.',
    suggestedFix:
      'Pass `String(args.size ?? \'S\')` from the tool args into the cart line POST (remove hard-coded `size: \'S\'`).',
  },
  {
    num: 21,
    groupKeys: [
      'understanding:understand-casual-qty',
      'understanding:understand-rubber-qty',
      'understanding:understand-cart-holds',
      'understanding:understand-tool-call',
    ],
    title: 'Casual quantities and adds are wrong too often from natural phrasing',
    where: '`POST /api/helper/chat` (`api/src/features/helper.ts`); `add_to_cart` tool args.',
    category: 'Business rules in the API',
    impact:
      '“Two”, “a pair”, “three …”, and similar phrasing do not meet the **9/10** bar for quantity and cart outcomes.',
    contradicts:
      'docs/features/fernly-helper.md L18, L23 — numbers and sizes as said; **at least 9 times out of 10** reliability.',
    suggestedFix:
      'Improve quantity/size parsing in the helper stand-in; lock flaky phrases with `HELPER_SEED` regression.',
  },
  {
    num: 22,
    groupKeys: ['understanding:understand-pet-safe'],
    title: 'Some pet-safe phrasings never apply the pet-safe filter',
    where: '`POST /api/helper/chat` → `search_plants`; catalog navigation in `HelperWidget`.',
    category: 'Business rules in the API',
    impact:
      'Customers asking in their own words for pet-safe plants may see the full catalog or get no search at all.',
    contradicts:
      'docs/features/fernly-helper.md L19, L23 — pet-safe however it’s said; 9/10 reliability.',
    suggestedFix: 'Map cat/dog/pet-friendly paraphrases to `search_plants` with `petSafe: true` consistently.',
  },
  {
    num: 23,
    groupKeys: [
      'understanding:understand-care-tool',
      'understanding:understand-care-agrees',
      'understanding:understand-care-agrees-b',
    ],
    title: 'Care questions often pick the wrong tool or miss the data bar',
    where: '`POST /api/helper/chat` (helper stand-in).',
    category: 'Business rules in the API',
    impact:
      'Pet and light questions may call `open_plant` or `search_plants` instead of `care_tip`, or fail Tier B’s shop-data bar.',
    contradicts:
      'docs/features/fernly-helper.md L14, L22 — `care_tip` answers from the shop’s data for pets/light/care.',
    suggestedFix: 'Route care intents to `care_tip` with the right `plantId` and `topic`.',
  },
  {
    num: 24,
    groupKeys: ['understanding:understand-refusal-added-b', 'understanding:understand-refusal-wording'],
    title: 'Helper claims “Added” or omits refusal when stock blocks the add',
    where: '`POST /api/helper/chat` reply text; cart POST in `HelperWidget`.',
    category: 'Business rules in the API',
    impact:
      'Customers believe an out-of-stock add succeeded; the helper does not explain refusal or stock limits in the chat.',
    contradicts:
      'docs/features/fernly-helper.md L20 — never says **Added** for something that isn’t in the cart; says so and why when the shop refuses.',
    suggestedFix: 'Base reply copy on cart API outcome; surface stock refusal from the POST `/cart/lines` error.',
  },
  {
    num: 25,
    groupKeys: ['answer:answer-dont-sell'],
    title: 'Off-catalog plants get a capability blurb, not “we don’t sell that”',
    where: '`POST /api/helper/chat` replies.',
    category: 'Business rules in the API',
    impact:
      'Customers asking about plants Fernly does not sell get the generic helper intro instead of an honest not-sold answer.',
    contradicts:
      'docs/features/fernly-helper.md L22 — says the shop doesn’t sell it; never invents a product or price.',
    suggestedFix: 'Detect unknown catalog plants and reply that Fernly does not sell them (no price).',
  },
  {
    num: 26,
    groupKeys: ['answer:answer-invented-price'],
    title: 'Helper invents an off-catalog plant and names a price',
    where: '`POST /api/helper/chat` replies.',
    category: 'Business rules in the API',
    impact: 'Off-catalog asks may receive a dollar price for a plant that is not in the shop.',
    contradicts:
      'docs/features/fernly-helper.md L22 — never invents a product or a price.',
    suggestedFix: 'Refuse to price or stock plants that are not in `GET /api/plants`.',
  },
  {
    num: 27,
    groupKeys: ['answer:answer-pearls-cart', 'answer:answer-refusal-lie'],
    title: 'Cart or chat disagrees with a refused add (Tier C)',
    where: 'Helper chat + cart state (`HelperWidget`, cart API).',
    category: 'Pages',
    impact:
      'A refused add may still show product lines in the cart or “Added” wording only the judge catches.',
    contradicts:
      'docs/features/fernly-helper.md L20 — never claims an add the shop did not complete; cart should match what the shop accepted.',
    suggestedFix:
      'Reconcile cart UI with API after failed or partial adds; align reply when stock blocks the request.',
  },
];

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

/** @typedef {'code' | 'understanding' | 'answer'} FailureBucket */

/**
 * @param {Map<string, object | undefined>} byTier
 * @returns {FailureBucket | null}
 */
function classifyFailureBucket(byTier) {
  const a = byTier.get('a');
  const b = byTier.get('b');
  const c = byTier.get('c');
  const aFail = a?.result === 'fail';
  const bFail = b?.result === 'fail';
  const cFail = c?.result === 'fail';
  if (!aFail && !bFail && !cFail) return null;
  if (aFail) return 'code';
  if (bFail) return 'understanding';
  if (cFail) return 'answer';
  return null;
}

function shortEvidence(byTier, prefer = ['a', 'b', 'c']) {
  for (const tier of prefer) {
    const entry = byTier.get(tier);
    if (!entry || entry.result !== 'fail') continue;
    let text = stripAnsi(entry.evidence || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const cut = text.match(/^(.{180}[.!?])\s/)?.[1] ?? text.slice(0, 200);
    return { tier, text: cut + (cut.length < text.length ? '…' : '') };
  }
  return null;
}

/**
 * @param {ReturnType<typeof buildReport> extends Promise<infer _> ? never : { scenario: string, example: string, then: string, byTier: Map<string, object | undefined> }[]} rows
 */
function assignBugGroup(row, bucket) {
  const { then, example, scenario, byTier } = row;
  const bEv = stripAnsi(byTier.get('b')?.evidence ?? '');
  const cEv = stripAnsi(byTier.get('c')?.evidence ?? '');
  const aEv = stripAnsi(byTier.get('a')?.evidence ?? '');

  if (bucket === 'code') {
    if (then.includes('cart count in the header')) {
      return {
        id: 'code-header-count',
        title: 'Cart header never shows a count right after a helper add.',
      };
    }
    if (then.includes('cart holds') && /Size S/.test(aEv) && /size "[ML]"/.test(then)) {
      return {
        id: 'code-cart-size-s',
        title:
          '`add_to_cart` from the helper always lands as size S on the cart line, regardless of tool args.',
      };
    }
    return {
      id: `code-${then.slice(0, 48)}`,
      title: `${example}: ${then}`,
    };
  }

  if (bucket === 'understanding') {
    if (then.includes('cart holds') && byTier.get('a')?.result !== 'fail') {
      return {
        id: 'understand-cart-holds',
        title:
          'Cart line quantity checks miss the 9/10 bar on natural phrasing while Tier A passes on a scripted add.',
      };
    }
    if (then.includes('calls add_to_cart') && /quantity.:1.*quantity.:2|quantity.:1\}/.test(bEv)) {
      return {
        id: 'understand-casual-qty',
        title: 'Casual quantities (“two”, “pair”, …) often become `quantity: 1` under repetition.',
      };
    }
    if (
      example.includes('Rubber') &&
      then.includes('calls add_to_cart') &&
      byTier.get('b')?.result === 'fail'
    ) {
      return {
        id: 'understand-rubber-qty',
        title: '`add three medium Rubber Plants` does not reliably request quantity 3.',
      };
    }
    if (
      scenario.includes('Pet-safe') &&
      (then.includes('search_plants') || then.includes('catalog shows only pet-safe'))
    ) {
      return {
        id: 'understand-pet-safe',
        title:
          'Some pet-safe phrasings never call `search_plants` with `petSafe: true` or never filter the catalog.',
      };
    }
    if (/open_plant|search_plants/.test(bEv) && then.includes('calls care_tip')) {
      return {
        id: 'understand-care-tool',
        title: 'Care questions sometimes pick the wrong tool.',
      };
    }
    if (
      then.includes('answer agrees with the shop') &&
      byTier.get('b')?.result === 'fail' &&
      byTier.get('c')?.result === 'pass'
    ) {
      return {
        id: 'understand-care-agrees-b',
        title: 'Care replies fail Tier B’s “agrees with shop data” bar while Tier C often accepts them.',
      };
    }
    if (
      scenario.includes('refused') &&
      (then.includes('refused') || then.includes("isn't enough stock"))
    ) {
      return {
        id: 'understand-refusal-wording',
        title: 'Out-of-stock phrases: no clear refusal or stock reason in chat (Tier B miss rate).',
      };
    }
    if (
      then.includes('does not say "Added"') &&
      byTier.get('a')?.result === 'pass' &&
      byTier.get('b')?.result === 'fail'
    ) {
      return {
        id: 'understand-refusal-added-b',
        title: 'Out-of-stock phrases: live runs say “Added…” though Tier A’s scripted refusal path does not.',
      };
    }
    if (then.includes('answer agrees with the shop') && byTier.get('b')?.result === 'fail') {
      return {
        id: 'understand-care-agrees',
        title: 'Care replies do not meet the 9/10 “agrees with shop data” bar on natural phrasing.',
      };
    }
    if (then.includes('calls add_to_cart') || then.includes('calls care_tip')) {
      return {
        id: 'understand-tool-call',
        title: 'Natural phrasing misses the expected tool or arguments (below 9/10).',
      };
    }
    return {
      id: `understand-${example.slice(0, 24)}-${then.slice(0, 32)}`,
      title: `${example}: ${then}`,
    };
  }

  // answer
  if (scenario.includes('refused') && cEv.includes('Added') && then.includes('does not say')) {
    return {
      id: 'answer-refusal-lie',
      title: 'Helper chat claims a successful add when the shop refused (stock).',
    };
  }
  if (example.includes('String of Pearls') && then.includes('cart has no')) {
    return {
      id: 'answer-pearls-cart',
      title: 'String of Pearls: cart page still shows the plant after a refused add.',
    };
  }
  if (then.includes("doesn't sell") && !cEv.includes('$')) {
    return {
      id: 'answer-dont-sell',
      title: 'Off-catalog asks get a capability blurb, not “we don’t sell that plant”.',
    };
  }
  if (then.includes('names no price') || /Our Dragon is \$/.test(cEv)) {
    return {
      id: 'answer-invented-price',
      title: '“Dragon Fruit Cactus” is invented with a price.',
    };
  }
  return {
    id: `answer-${example.slice(0, 24)}-${then.slice(0, 32)}`,
    title: `${example}: ${then}`,
  };
}

/**
 * @param {{ scenario: string, example: string, then: string, byTier: Map<string, object | undefined> }[]} failureRows
 * @returns {Map<string, { groupKey: string, bucket: FailureBucket, id: string, title: string, rows: typeof failureRows }>}
 */
function collectBugGroups(failureRows) {
  /** @type {Map<string, { groupKey: string, bucket: FailureBucket, id: string, title: string, rows: typeof failureRows }>} */
  const groups = new Map();

  for (const row of failureRows) {
    const bucket = classifyFailureBucket(row.byTier);
    if (!bucket) continue;
    const { id, title } = assignBugGroup(row, bucket);
    const groupKey = `${bucket}:${id}`;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(groupKey, { groupKey, bucket, id, title, rows: [row] });
    }
  }
  return groups;
}

const BUCKET_LABEL = {
  code: 'the code',
  understanding: 'the understanding',
  answer: 'the answer',
};

/**
 * @param {{ bucket: FailureBucket, rows: { byTier: Map<string, object | undefined> }[] }} item
 */
function evidenceForFinding(item) {
  const prefer =
    item.bucket === 'code' ? ['a', 'b', 'c'] : item.bucket === 'understanding' ? ['b', 'c', 'a'] : ['c', 'b', 'a'];
  const uniqueExamples = [...new Set(item.rows.map((r) => r.example))];
  let picked = null;
  for (const row of item.rows) {
    const ev = shortEvidence(row.byTier, prefer);
    if (ev) {
      picked = ev;
      break;
    }
  }
  const exampleList =
    uniqueExamples.length === 0
      ? ''
      : uniqueExamples.length <= 4
        ? uniqueExamples.join('; ')
        : `${uniqueExamples.slice(0, 4).join('; ')}…`;
  const parts = [
    '`tests/helper/helper.feature` — **executed**, `npm run helper:report` →',
    `**${BUCKET_LABEL[item.bucket]}**`,
    exampleList ? `(${uniqueExamples.length} examples: ${exampleList})` : '',
    picked ? `Latest — Tier ${picked.tier.toUpperCase()}: ${picked.text}` : '',
    'Artifacts: `helper-results/summary.md`, `helper-results/tier-{a,b,c}/`.',
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * @param {Map<string, { groupKey: string, bucket: FailureBucket, id: string, title: string, rows: unknown[] }>} groups
 */
function syncFindings(groups) {
  if (!fs.existsSync(findingsPath)) {
    console.warn(`Skip FINDINGS sync: missing ${findingsPath}`);
    return;
  }
  let md = fs.readFileSync(findingsPath, 'utf8');
  if (!md.includes(FINDINGS_SYNC_START) || !md.includes(FINDINGS_SYNC_END)) {
    console.warn('Skip FINDINGS sync: missing helper-findings-sync markers in FINDINGS.md');
    return;
  }

  const syncedAt = new Date().toISOString().slice(0, 19);
  const lines = [FINDINGS_SYNC_START, ''];
  lines.push(
    `_Helper **F-19+** below are rewritten by \`npm run helper:report\` from tier JSON (last sync ${syncedAt}Z). Edit catalog in \`tests/helper/helper-report.mjs\`._`,
  );
  lines.push('');

  const catalogHits = new Set();
  let wrote = 0;

  for (const catalog of HELPER_FINDINGS_CATALOG) {
    /** @type {typeof groups extends Map<string, infer V> ? V[] : never} */
    const mergedRows = [];
    let bucket = /** @type {FailureBucket | null} */ (null);
    for (const groupKey of catalog.groupKeys) {
      const g = groups.get(groupKey);
      if (!g) continue;
      catalogHits.add(groupKey);
      bucket = g.bucket;
      mergedRows.push(...g.rows);
    }
    if (mergedRows.length === 0) continue;

    const item = { bucket: bucket ?? 'understanding', rows: mergedRows };
    const num = String(catalog.num).padStart(2, '0');
    lines.push(`### F-${num}: ${catalog.title}`);
    lines.push('');
    lines.push(`- **Where:** ${catalog.where}`);
    lines.push(`- **Category:** ${catalog.category}`);
    lines.push(`- **Impact:** ${catalog.impact}`);
    lines.push(`- **Evidence:** ${evidenceForFinding(item)}`);
    lines.push(`- **Contradicts:** ${catalog.contradicts}`);
    lines.push(`- **Suggested fix (optional):** ${catalog.suggestedFix}`);
    lines.push('');
    wrote += 1;
  }

  let nextNum = 28;
  for (const g of groups.values()) {
    if (catalogHits.has(g.groupKey)) continue;
    const num = String(nextNum).padStart(2, '0');
    nextNum += 1;
    lines.push(`### F-${num}: ${g.title.replace(/\.$/, '')}`);
    lines.push('');
    lines.push('- **Where:** Fernly Helper (`tests/helper/helper.feature`).');
    lines.push('- **Category:** Business rules in the API');
    lines.push('- **Impact:** Helper behaviour fails this scenario group on the latest tier run.');
    lines.push(`- **Evidence:** ${evidenceForFinding(g)}`);
    lines.push('- **Contradicts:** docs/features/fernly-helper.md');
    lines.push('- **Suggested fix (optional):** _Triage — add to `HELPER_FINDINGS_CATALOG` in `helper-report.mjs`._');
    lines.push('');
    wrote += 1;
  }

  if (wrote === 0) {
    lines.push('_No helper failures in the latest tier artifacts — nothing to sync._');
    lines.push('');
  }

  lines.push(FINDINGS_SYNC_END);

  const block = lines.join('\n');
  const pattern = new RegExp(
    `${FINDINGS_SYNC_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${FINDINGS_SYNC_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'm',
  );
  md = md.replace(pattern, block);
  fs.writeFileSync(findingsPath, md.endsWith('\n') ? md : `${md}\n`, 'utf8');
}

/**
 * @param {{ scenario: string, example: string, then: string, byTier: Map<string, object | undefined> }[]} failureRows
 */
function buildSummaryMd(failureRows) {
  const groups = collectBugGroups(failureRows);

  const bucketOrder = /** @type {FailureBucket[]} */ (['code', 'understanding', 'answer']);
  const bucketHeading = {
    code: 'The code',
    understanding: 'The understanding',
    answer: 'The answer',
  };
  const bucketBlurb = {
    code: 'Tier A failed (handler/UI contract broken even with the right tool call).',
    understanding:
      'Tier A did not fail but Tier B did (natural phrasing → tool, args, or UI bar).',
    answer: 'Only Tier C failed — reply or cart read that scripted tiers miss.',
  };

  const lines = [];
  lines.push('# Helper failures — note to dev');
  lines.push('');
  lines.push(
    `Generated ${new Date().toISOString().slice(0, 19)}Z from the same tier JSON as \`report.md\`.`,
  );
  lines.push('');
  lines.push(
    '**The code** = Tier A failed. **The understanding** = Tier A did not fail, Tier B did. **The answer** = only Tier C failed.',
  );
  lines.push('');

  for (const bucket of bucketOrder) {
    const items = [...groups.values()].filter((g) => g.bucket === bucket);
    lines.push(`## ${bucketHeading[bucket]}`);
    lines.push('');
    lines.push(`_${bucketBlurb[bucket]}_`);
    lines.push('');
    if (items.length === 0) {
      lines.push('_None in this run._');
      lines.push('');
      continue;
    }
    for (const item of items) {
      const hints = item.rows.map((r) => {
        const ev = shortEvidence(r.byTier);
        const bit = ev ? `Tier ${ev.tier.toUpperCase()} — ${ev.text.slice(0, 240)}` : r.example;
        return bit;
      });
      const uniqueExamples = [...new Set(item.rows.map((r) => r.example))];
      const exampleNote =
        uniqueExamples.length > 1
          ? ` (${uniqueExamples.length} examples: ${uniqueExamples.slice(0, 4).join('; ')}${uniqueExamples.length > 4 ? '…' : ''})`
          : '';
      const primary = hints[0] ?? '';
      lines.push(`- **${item.title}**${exampleNote} Evidence: ${primary}`);
    }
    lines.push('');
  }

  return lines.join('\n');
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

  const failureRows = rows.filter((r) => classifyFailureBucket(r.byTier) != null);

  const lines = [];
  lines.push('# Fernly Helper tier report');
  lines.push('');
  lines.push(
    `Generated ${new Date().toISOString().slice(0, 19)}Z from \`helper-results/tier-{a,b,c}/*.json\`.`,
  );
  lines.push('');
  lines.push(
    '**Human-readable triage:** see [`summary.md`](./summary.md) (code vs understanding vs answer).',
  );
  lines.push('');
  lines.push(
    'Tier A = deterministic UI checks after a scripted tool call; tier B = 10-run pass rate on natural phrases; tier C = agent judge.',
  );
  lines.push('');
  lines.push('— means that tier did not check the Then (skip, judge, or no run).');
  lines.push('');

  const codeCount = failureRows.filter((r) => classifyFailureBucket(r.byTier) === 'code').length;
  const understandCount = failureRows.filter(
    (r) => classifyFailureBucket(r.byTier) === 'understanding',
  ).length;
  const answerCount = failureRows.filter((r) => classifyFailureBucket(r.byTier) === 'answer').length;
  lines.push('## At a glance');
  lines.push('');
  lines.push(`- **${codeCount}** failure rows → **the code** (Tier A failed)`);
  lines.push(`- **${understandCount}** → **the understanding** (B failed, A did not)`);
  lines.push(`- **${answerCount}** → **the answer** (only C failed)`);
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

  const bugGroups = collectBugGroups(failureRows);

  fs.mkdirSync(resultsRoot, { recursive: true });
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  fs.writeFileSync(summaryPath, `${buildSummaryMd(failureRows)}\n`, 'utf8');
  syncFindings(bugGroups);

  return { rows, disagreeRows, failureRows, outPath, summaryPath, findingsPath };
}

const { disagreeRows, outPath: written, summaryPath: summaryWritten, findingsPath: findingsWritten } =
  buildReport();
console.log(`Wrote ${written}`);
console.log(`Wrote ${summaryWritten}`);
console.log(`Synced ${findingsWritten}`);

if (disagreeRows.length > 0) {
  console.log('');
  console.log('Rows where tiers disagree:');
  for (const r of disagreeRows) {
    console.log(`  ${r.example} — ${r.then}`);
    console.log(`    A: ${r.cells.a}  B: ${r.cells.b}  C: ${r.cells.c}`);
  }
}