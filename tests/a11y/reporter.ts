import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Result, UnlabelledFrameSelector } from 'axe-core';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import {
  classifyAxeViolations,
  matchesBaselineEntry,
  nodeTargetKeyFromSelector,
  type BaselineEntry,
  type ClassifiedViolationNode,
  type ViolationClassification,
} from './baseline.js';
import type { AxeResultsAttachment } from './helpers/scan.js';

type ReporterOptions = {
  /** Folder under the repo root for index.html, summary.md, results.json */
  outputFolder?: string;
  /** Path to baseline JSON (resolved relative to the config file directory when not absolute) */
  baseline?: string;
  title?: string;
};

type ImpactKey = 'critical' | 'serious' | 'moderate' | 'minor' | 'unknown';

const IMPACT_ORDER: ImpactKey[] = ['critical', 'serious', 'moderate', 'minor', 'unknown'];
const IMPACT_RANK: Record<ImpactKey, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
  unknown: 4,
};

function impactKey(impact: string | undefined): ImpactKey {
  if (impact === 'critical' || impact === 'serious' || impact === 'moderate' || impact === 'minor') {
    return impact;
  }
  return 'unknown';
}

function getProjectName(test: TestCase): string | undefined {
  let s: Suite | undefined = test.parent;
  while (s) {
    if (s.type === 'project') return s.title;
    s = s.parent;
  }
  return undefined;
}

function configDir(config: FullConfig): string {
  return config.configFile ? path.dirname(config.configFile) : config.rootDir;
}

function resolveFromConfig(config: FullConfig, p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(configDir(config), p);
}

function loadBaselineFile(filePath: string): BaselineEntry[] {
  const raw = readFileSync(filePath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Baseline file must be a JSON array');
  }
  const out: BaselineEntry[] = [];
  for (const item of parsed) {
    if (item === null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const rule = o.rule;
    const page = o.page;
    const target = o.target;
    const owner = o.owner;
    const expires = o.expires;
    const reason = o.reason;
    if (typeof rule !== 'string' || typeof page !== 'string' || typeof target !== 'string') {
      throw new Error('Each baseline entry needs string rule, page, and target');
    }
    if (typeof owner !== 'string' || typeof expires !== 'string' || typeof reason !== 'string') {
      throw new Error('Each baseline entry needs string owner, expires, and reason');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
      throw new Error(`Invalid expires date (expected YYYY-MM-DD): ${expires}`);
    }
    out.push({ rule, page, target, owner, expires, reason });
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s);
}

function escapeMdCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function pickAttachmentBody(att: { path?: string; body?: Buffer }): Buffer | undefined {
  if (att.body?.length) return att.body;
  if (att.path) {
    try {
      return readFileSync(att.path);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function pickResultWithAxeResults(test: TestCase): TestResult | undefined {
  for (let i = test.results.length - 1; i >= 0; i--) {
    const r = test.results[i];
    if (r.attachments.some((a) => a.name === 'axe-results')) return r;
  }
  return undefined;
}

function parseAxeResultsAttachment(buf: Buffer): AxeResultsAttachment {
  const text = buf.toString('utf8');
  const parsed = JSON.parse(text) as AxeResultsAttachment;
  if (!parsed || typeof parsed.page !== 'string' || !Array.isArray(parsed.violations)) {
    throw new Error('Invalid axe-results attachment shape');
  }
  return parsed;
}

function shotKey(pageName: string, ruleId: string, nodeIndex: number): string {
  return `${pageName}:${ruleId}:${nodeIndex}`;
}

/** Map shotKey -> data URL (index = position among nodes under that rule, same as scan.ts) */
function collectScreenshots(result: TestResult, pageName: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const att of result.attachments) {
    if (!att.name.startsWith('axe-shot:')) continue;
    const rest = att.name.slice('axe-shot:'.length);
    const parts = rest.split(':');
    if (parts.length < 3) continue;
    const index = Number(parts[parts.length - 1]);
    const ruleId = parts[parts.length - 2];
    const shotPage = parts.slice(0, parts.length - 2).join(':');
    if (shotPage !== pageName || Number.isNaN(index)) continue;
    const buf = pickAttachmentBody(att);
    if (!buf) continue;
    const b64 = buf.toString('base64');
    map.set(shotKey(pageName, ruleId, index), `data:image/png;base64,${b64}`);
  }
  return map;
}

function findBaselineMeta(
  ruleId: string,
  pageName: string,
  target: UnlabelledFrameSelector,
  baseline: BaselineEntry[],
): { owner?: string; expires?: string; reason?: string } {
  const today = new Date().toISOString().slice(0, 10);
  const matches = baseline.filter((e) => matchesBaselineEntry(ruleId, pageName, target, e));
  const active = matches.filter((e) => e.expires >= today);
  if (active.length === 0) return {};
  const e = active[0];
  return { owner: e.owner, expires: e.expires, reason: e.reason };
}

function nodeTargetStr(target: string[]): string {
  return target.join(' >> ');
}

function targetKeyFromClassified(target: string[]): string {
  return nodeTargetKeyFromSelector(target as unknown as UnlabelledFrameSelector);
}

type PageAgg = {
  page: string;
  url: string;
  elementCount: number;
  impacts: Record<ImpactKey, number>;
  rulesPassed: number;
};

type EnrichedNode = ClassifiedViolationNode & {
  url: string;
  testTitle: string;
  ruleTags: string[];
  nodeImpact: ImpactKey;
  failureSummary?: string;
  screenshotDataUrl?: string;
  baselineOwner?: string;
  baselineExpires?: string;
  baselineReason?: string;
  nodeIndexInRule: number;
};

function isBlockingNode(n: EnrichedNode): boolean {
  if (n.classification === 'expired') return true;
  if (n.classification === 'new' && (n.nodeImpact === 'serious' || n.nodeImpact === 'critical')) return true;
  return false;
}

export default class A11yReporter implements Reporter {
  private readonly outputFolder: string;
  private readonly baselinePath: string;
  private readonly title: string;
  private rootSuite: Suite | undefined;
  private fullConfig!: FullConfig;

  constructor(options: ReporterOptions = {}) {
    this.outputFolder = options.outputFolder ?? 'a11y-report';
    this.baselinePath = options.baseline ?? path.join('tests', 'a11y', 'a11y-baseline.json');
    this.title = options.title ?? 'Accessibility report';
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.fullConfig = config;
    this.rootSuite = suite;
  }

  onEnd(result: FullResult): void {
    if (!this.rootSuite) return;
    const baselineAbs = resolveFromConfig(this.fullConfig, this.baselinePath);
    const baselineDisk = loadBaselineFile(baselineAbs);

    const outDir = path.isAbsolute(this.outputFolder)
      ? this.outputFolder
      : path.resolve(configDir(this.fullConfig), this.outputFolder);
    mkdirSync(outDir, { recursive: true });

    const tests = this.rootSuite.allTests().filter((t) => getProjectName(t) === 'a11y');
    const pages = new Map<string, PageAgg>();
    const allNodes: EnrichedNode[] = [];

    for (const test of tests) {
      const tr = pickResultWithAxeResults(test);
      if (!tr) continue;
      const axeAtt = tr.attachments.find((a) => a.name === 'axe-results');
      if (!axeAtt) continue;
      const buf = pickAttachmentBody(axeAtt);
      if (!buf) continue;
      let attachment: AxeResultsAttachment;
      try {
        attachment = parseAxeResultsAttachment(buf);
      } catch {
        continue;
      }
      const classified = classifyAxeViolations(attachment.page, attachment.violations, baselineDisk);
      const shots = collectScreenshots(tr, attachment.page);
      const ruleById = new Map(attachment.violations.map((r) => [r.id, r]));

      for (const c of classified) {
        const rule = ruleById.get(c.ruleId);
        const nodeIndexInRule = rule
          ? rule.nodes.findIndex(
              (n) => n.html === c.html && nodeTargetKeyFromSelector(n.target) === targetKeyFromClassified(c.target),
            )
          : -1;
        const idx = nodeIndexInRule >= 0 ? nodeIndexInRule : 0;
        const nodeInRule = rule && nodeIndexInRule >= 0 ? rule.nodes[nodeIndexInRule] : undefined;
        const summary = nodeInRule?.failureSummary ?? '';
        const tags = rule?.tags?.map(String) ?? [];
        const shot =
          nodeIndexInRule >= 0 && nodeIndexInRule < 3 ? shots.get(shotKey(attachment.page, c.ruleId, nodeIndexInRule)) : undefined;
        const meta = findBaselineMeta(c.ruleId, attachment.page, c.target, baselineDisk);
        const nodeImpact = impactKey(nodeInRule?.impact ?? rule?.impact ?? c.impact);

        allNodes.push({
          ...c,
          url: attachment.url,
          testTitle: test.title,
          ruleTags: tags,
          nodeImpact,
          failureSummary: summary,
          screenshotDataUrl: shot,
          baselineOwner: meta.owner,
          baselineExpires: meta.expires,
          baselineReason: meta.reason,
          nodeIndexInRule: idx,
        });
      }

      const impacts: Record<ImpactKey, number> = {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
        unknown: 0,
      };
      for (const c of classified) {
        const r = ruleById.get(c.ruleId);
        const ni = r
          ? r.nodes.findIndex(
              (n) => n.html === c.html && nodeTargetKeyFromSelector(n.target) === targetKeyFromClassified(c.target),
            )
          : -1;
        const nodeInRule = r && ni >= 0 ? r.nodes[ni] : undefined;
        impacts[impactKey(nodeInRule?.impact ?? r?.impact ?? c.impact)] += 1;
      }
      const existing = pages.get(attachment.page);
      const passes = attachment.passes?.length ?? 0;
      if (!existing) {
        pages.set(attachment.page, {
          page: attachment.page,
          url: attachment.url,
          elementCount: classified.length,
          impacts,
          rulesPassed: passes,
        });
      } else {
        existing.elementCount += classified.length;
        existing.rulesPassed = Math.max(existing.rulesPassed, passes);
        for (const k of IMPACT_ORDER) {
          existing.impacts[k] += impacts[k];
        }
        if (!existing.url && attachment.url) existing.url = attachment.url;
      }
    }

    const pagesScanned = pages.size;
    const ruleIds = new Set(allNodes.map((n) => n.ruleId));
    const rulesViolated = ruleIds.size;
    const elementsAffected = allNodes.length;
    const blockingCount = allNodes.filter((n) => isBlockingNode(n)).length;

    const matchedBaselineKeys = new Set<string>();
    for (const n of allNodes) {
      for (const e of baselineDisk) {
        if (matchesBaselineEntry(n.ruleId, n.page, n.target, e)) {
          matchedBaselineKeys.add(`${e.rule}\0${e.page}\0${e.target}`);
        }
      }
    }
    const orphanBaseline = baselineDisk.filter(
      (e) => !matchedBaselineKeys.has(`${e.rule}\0${e.page}\0${e.target}`),
    );

    const byImpactStatus: Record<ImpactKey, Record<ViolationClassification, number>> = {} as Record<
      ImpactKey,
      Record<ViolationClassification, number>
    >;
    for (const ik of IMPACT_ORDER) {
      byImpactStatus[ik] = { new: 0, baselined: 0, expired: 0 };
    }
    for (const n of allNodes) {
      byImpactStatus[n.nodeImpact][n.classification] += 1;
    }

    const blockingNodes = allNodes.filter((n) => isBlockingNode(n));
    const blockingByRulePage = new Map<
      string,
      { ruleId: string; page: string; count: number; exampleSelector: string }
    >();
    for (const n of blockingNodes) {
      const key = `${n.ruleId}\0${n.page}`;
      const sel = nodeTargetStr(n.target);
      const cur = blockingByRulePage.get(key);
      if (!cur) {
        blockingByRulePage.set(key, { ruleId: n.ruleId, page: n.page, count: 1, exampleSelector: sel });
      } else {
        cur.count += 1;
      }
    }

    const resultsPayload = {
      generatedAt: new Date().toISOString(),
      title: this.title,
      totals: {
        pagesScanned,
        rulesViolated,
        elementsAffected,
        blocking: blockingCount,
      },
      pages: [...pages.values()].map((p) => ({
        page: p.page,
        url: p.url,
        elementCount: p.elementCount,
        impacts: p.impacts,
        rulesPassed: p.rulesPassed,
      })),
      violations: allNodes.map((n) => ({
        ruleId: n.ruleId,
        page: n.page,
        url: n.url,
        testTitle: n.testTitle,
        help: n.help,
        helpUrl: n.helpUrl,
        impact: n.impact,
        nodeImpact: n.nodeImpact,
        tags: n.ruleTags,
        target: n.target,
        targetSelector: nodeTargetStr(n.target),
        html: n.html,
        failureSummary: n.failureSummary ?? '',
        classification: n.classification,
        blocking: isBlockingNode(n),
        baselineOwner: n.baselineOwner,
        baselineExpires: n.baselineExpires,
        baselineReason: n.baselineReason,
        hasScreenshot: Boolean(n.screenshotDataUrl),
      })),
      baselineOrphans: orphanBaseline,
      baselinePath: baselineAbs,
    };

    writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(resultsPayload, null, 2), 'utf8');

    const summaryMd = this.buildSummaryMd({
      totals: resultsPayload.totals,
      byImpactStatus,
      blockingByRulePage: [...blockingByRulePage.values()].sort((a, b) =>
        a.ruleId === b.ruleId ? a.page.localeCompare(b.page) : a.ruleId.localeCompare(b.ruleId),
      ),
      orphanBaseline,
    });
    writeFileSync(path.join(outDir, 'summary.md'), summaryMd, 'utf8');

    const html = this.buildHtml({
      title: this.title,
      totals: resultsPayload.totals,
      pages: [...pages.values()],
      allNodes,
      orphanBaseline,
    });
    writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

    const indexPath = path.join(outDir, 'index.html');
    console.log(
      `a11y report: ${pagesScanned} pages, ${rulesViolated} rules, ${elementsAffected} elements, ${blockingCount} blocking → ${indexPath}`,
    );
  }

  private buildSummaryMd(args: {
    totals: { pagesScanned: number; rulesViolated: number; elementsAffected: number; blocking: number };
    byImpactStatus: Record<ImpactKey, Record<ViolationClassification, number>>;
    blockingByRulePage: Array<{ ruleId: string; page: string; count: number; exampleSelector: string }>;
    orphanBaseline: BaselineEntry[];
  }): string {
    const { totals, byImpactStatus, blockingByRulePage, orphanBaseline } = args;
    const lines: string[] = [];
    lines.push('## Accessibility scan summary');
    lines.push('');
    lines.push(
      `- **Pages scanned:** ${totals.pagesScanned} — **Rules violated:** ${totals.rulesViolated} — **Elements affected:** ${totals.elementsAffected} — **Blocking:** ${totals.blocking}`,
    );
    lines.push('');
    lines.push('### By impact and status');
    lines.push('');
    lines.push('| Impact | New | Baselined | Expired |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const ik of IMPACT_ORDER) {
      const row = byImpactStatus[ik];
      lines.push(
        `| ${ik} | ${row.new} | ${row.baselined} | ${row.expired} |`,
      );
    }
    lines.push('');
    lines.push('### Blocking violations (by rule and page)');
    lines.push('');
    if (blockingByRulePage.length === 0) {
      lines.push('_None._');
    } else {
      lines.push('| Rule | Page | Count | Example selector |');
      lines.push('| --- | --- | ---: | --- |');
      for (const b of blockingByRulePage) {
        lines.push(
          `| ${escapeMdCell(b.ruleId)} | ${escapeMdCell(b.page)} | ${b.count} | \`${escapeMdCell(b.exampleSelector)}\` |`,
        );
      }
    }
    lines.push('');
    lines.push('### Baseline entries with no matching failures (candidates for removal)');
    lines.push('');
    if (orphanBaseline.length === 0) {
      lines.push('_None._');
    } else {
      for (const o of orphanBaseline) {
        lines.push(
          `- \`${escapeMdCell(o.rule)}\` / ${escapeMdCell(o.page)} / \`${escapeMdCell(o.target)}\` — ${escapeMdCell(o.reason)}`,
        );
      }
    }
    lines.push('');
    return lines.join('\n');
  }

  private buildHtml(args: {
    title: string;
    totals: { pagesScanned: number; rulesViolated: number; elementsAffected: number; blocking: number };
    pages: PageAgg[];
    allNodes: EnrichedNode[];
    orphanBaseline: BaselineEntry[];
  }): string {
    const { title, totals, pages, allNodes, orphanBaseline } = args;

    const ruleGroups = new Map<
      string,
      {
        ruleId: string;
        help: string;
        helpUrl: string;
        impact: ImpactKey;
        tags: string[];
        nodes: EnrichedNode[];
      }
    >();
    for (const n of allNodes) {
      let g = ruleGroups.get(n.ruleId);
      const ik = n.nodeImpact;
      if (!g) {
        g = {
          ruleId: n.ruleId,
          help: n.help,
          helpUrl: n.helpUrl,
          impact: ik,
          tags: [...new Set(n.ruleTags)].filter(Boolean),
          nodes: [],
        };
        ruleGroups.set(n.ruleId, g);
      }
      g.nodes.push(n);
      if (IMPACT_RANK[ik] < IMPACT_RANK[g.impact]) {
        g.impact = ik;
      }
      g.tags = [...new Set([...g.tags, ...n.ruleTags])].sort();
    }
    const rulesSorted = [...ruleGroups.values()].sort((a, b) => {
      const r = IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
      return r !== 0 ? r : a.ruleId.localeCompare(b.ruleId);
    });

    const impactCounts: Record<ImpactKey, number> = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      unknown: 0,
    };
    for (const n of allNodes) {
      impactCounts[n.nodeImpact] += 1;
    }

    const statusCounts = { new: 0, baselined: 0, expired: 0 };
    for (const n of allNodes) {
      statusCounts[n.classification] += 1;
    }

    const pageOptions = [...new Set(pages.map((p) => p.page))].sort();

    const reportData = {
      title,
      totals,
      pages: pages.map((p) => ({
        page: p.page,
        url: p.url,
        elementCount: p.elementCount,
        impacts: p.impacts,
        rulesPassed: p.rulesPassed,
      })),
      impactCounts,
      statusCounts,
      pageOptions,
      rules: rulesSorted.map((r) => ({
        ruleId: r.ruleId,
        help: r.help,
        helpUrl: r.helpUrl,
        impact: r.impact,
        tags: r.tags,
        nodes: r.nodes.map((n) => ({
          page: n.page,
          url: n.url,
          nodeImpact: n.nodeImpact,
          target: nodeTargetStr(n.target),
          html: n.html,
          failureSummary: n.failureSummary ?? '',
          classification: n.classification,
          baselineOwner: n.baselineOwner ?? '',
          baselineExpires: n.baselineExpires ?? '',
          baselineReason: n.baselineReason ?? '',
          screenshotDataUrl: n.screenshotDataUrl ?? '',
        })),
      })),
      orphans: orphanBaseline.map((o) => ({
        rule: o.rule,
        page: o.page,
        target: o.target,
        owner: o.owner,
        expires: o.expires,
        reason: o.reason,
      })),
    };

    const dataJson = JSON.stringify(reportData);

    const css = `
:root { font-family: system-ui, Segoe UI, Roboto, sans-serif; color: #1a1a1a; background: #f6f7f9; }
body { margin: 0; }
.wrap { max-width: 1200px; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
.sub { color: #555; margin-bottom: 1.25rem; font-size: 0.95rem; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
.metric { background: #fff; border-radius: 8px; padding: 0.85rem 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.metric .n { font-size: 1.6rem; font-weight: 700; }
.metric .l { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
.filters { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; align-items: flex-end; background: #fff; padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.filters .field { font-size: 0.8rem; color: #444; display: flex; flex-direction: column; gap: 0.25rem; }
.filters input[type="search"], .filters select { min-width: 180px; padding: 0.35rem 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem; }
.imp-checks { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
.imp-checks span { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; }
table.pages { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; margin-bottom: 1.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.06); font-size: 0.88rem; }
table.pages th, table.pages td { text-align: left; padding: 0.55rem 0.65rem; border-bottom: 1px solid #eee; }
table.pages th { background: #f0f2f5; font-weight: 600; }
.bar { display: flex; height: 10px; border-radius: 4px; overflow: hidden; background: #e8e8e8; min-width: 120px; }
.bar span { height: 100%; }
.b-crit { background: #8b0000; }
.b-ser { background: #c6302c; }
.b-mod { background: #c98a00; }
.b-min { background: #2e7d4a; }
.b-unk { background: #666; }
.cards { display: flex; flex-direction: column; gap: 1rem; }
.card { background: #fff; border-radius: 8px; padding: 1rem 1.1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.card h2 { font-size: 1.05rem; margin: 0 0 0.35rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.badge { font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 999px; font-weight: 600; text-transform: uppercase; }
.badge-critical { background: #fde2e2; color: #7a0000; }
.badge-serious { background: #ffe5e0; color: #9c2c1a; }
.badge-moderate { background: #fff3d6; color: #7a5b00; }
.badge-minor { background: #e6f4ea; color: #1b5e20; }
.badge-unknown { background: #eceff1; color: #444; }
.meta { font-size: 0.82rem; color: #555; margin-bottom: 0.6rem; }
.meta code { font-size: 0.8rem; background: #f2f4f7; padding: 0.1rem 0.3rem; border-radius: 3px; }
.meta a { color: #1565c0; }
.nodes-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.node { border: 1px solid #e4e4e4; border-radius: 6px; padding: 0.65rem; background: #fafafa; }
.node img { max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 0.4rem; }
.st-new { color: #b00020; font-weight: 600; }
.st-base { color: #1565c0; font-weight: 600; }
.st-exp { color: #bf360c; font-weight: 600; }
.pre { white-space: pre-wrap; word-break: break-word; font-size: 0.78rem; background: #fff; border: 1px solid #e0e0e0; padding: 0.35rem; border-radius: 4px; margin: 0.25rem 0; }
.orphan-list { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 0.85rem 1rem; margin-top: 1.5rem; }
.orphan-list h3 { margin: 0 0 0.5rem; font-size: 1rem; }
.hidden { display: none !important; }
`;

    const js = `
(function(){
  var DATA = JSON.parse(document.getElementById('__data').textContent);

  function esc(s){
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function impactClass(i){
    if (i === 'critical') return 'badge-critical';
    if (i === 'serious') return 'badge-serious';
    if (i === 'moderate') return 'badge-moderate';
    if (i === 'minor') return 'badge-minor';
    return 'badge-unknown';
  }

  function barSegments(imp){
    var total = (imp.critical||0)+(imp.serious||0)+(imp.moderate||0)+(imp.minor||0)+(imp.unknown||0);
    if (!total) return '<div class="bar"></div>';
    function pct(n){ return total ? ((n/total)*100).toFixed(2)+'%' : '0%'; }
    return '<div class="bar">' +
      (imp.critical ? '<span class="b-crit" style="width:'+pct(imp.critical)+'"></span>' : '') +
      (imp.serious ? '<span class="b-ser" style="width:'+pct(imp.serious)+'"></span>' : '') +
      (imp.moderate ? '<span class="b-mod" style="width:'+pct(imp.moderate)+'"></span>' : '') +
      (imp.minor ? '<span class="b-min" style="width:'+pct(imp.minor)+'"></span>' : '') +
      (imp.unknown ? '<span class="b-unk" style="width:'+pct(imp.unknown)+'"></span>' : '') +
    '</div>';
  }

  function renderPages(){
    var tbody = document.getElementById('pages-body');
    tbody.innerHTML = DATA.pages.map(function(p){
      return '<tr data-page="'+esc(p.page)+'">' +
        '<td><strong>'+esc(p.page)+'</strong><div style="font-size:0.8rem;color:#666;word-break:break-all">'+esc(p.url)+'</div></td>' +
        '<td>'+esc(String(p.elementCount))+'</td>' +
        '<td>'+barSegments(p.impacts)+'</td>' +
        '<td>'+esc(String(p.rulesPassed))+'</td>' +
      '</tr>';
    }).join('');
  }

  function nodeMatchesFilters(node, rule, f){
    var ni = node.nodeImpact || rule.impact;
    if (f.impacts.length && f.impacts.indexOf(ni) === -1) return false;
    if (f.page !== 'all' && node.page !== f.page) return false;
    if (f.status !== 'all' && node.classification !== f.status) return false;
    if (f.q) {
      var hay = (node.page+' '+node.url+' '+node.target+' '+node.html+' '+(node.failureSummary||'')+' '+rule.ruleId+' '+rule.help).toLowerCase();
      if (hay.indexOf(f.q) === -1) return false;
    }
    return true;
  }

  function renderCards(){
    var container = document.getElementById('cards');
    var f = getFilters();
    container.innerHTML = DATA.rules.map(function(rule){
      var showNodes = rule.nodes.filter(function(n){ return nodeMatchesFilters(n, rule, f); });
      if (!showNodes.length) return '';
      return '<article class="card" data-rule-id="'+esc(rule.ruleId)+'">' +
        '<h2><span class="badge '+impactClass(rule.impact)+'">'+esc(rule.impact)+'</span> '+esc(rule.help)+
        '</h2>' +
        '<div class="meta"><code>'+esc(rule.ruleId)+'</code> · WCAG: '+esc(rule.tags.join(', '))+
        ' · <a href="'+esc(rule.helpUrl)+'" target="_blank" rel="noopener">How to fix it</a></div>' +
        '<div class="nodes-grid">' + showNodes.map(function(n){
          var st = n.classification === 'new' ? 'st-new' : (n.classification === 'baselined' ? 'st-base' : 'st-exp');
          var stLabel = n.classification === 'new' ? 'New' : (n.classification === 'baselined' ? 'Baselined' : 'Expired');
          var img = n.screenshotDataUrl ? '<img src="'+esc(n.screenshotDataUrl)+'" alt="">' : '<div style="font-size:0.8rem;color:#888">No screenshot</div>';
          var baseLine = '';
          if (n.classification === 'baselined' && n.baselineOwner) {
            baseLine = '<div style="font-size:0.78rem;margin-top:0.25rem">Owner: '+esc(n.baselineOwner)+', ends '+esc(n.baselineExpires)+'</div>';
          }
          return '<div class="node" data-page="'+esc(n.page)+'" data-status="'+esc(n.classification)+'" data-impact="'+esc(n.nodeImpact)+'">' +
            img +
            '<div><strong>Page:</strong> '+esc(n.page)+'</div>' +
            '<div style="font-size:0.78rem;word-break:break-all;color:#555">'+esc(n.url)+'</div>' +
            '<div><strong>Selector:</strong> <code class="pre">'+esc(n.target)+'</code></div>' +
            '<div><strong>HTML:</strong> <code class="pre">'+esc(n.html)+'</code></div>' +
            '<div><strong>Summary:</strong> <span class="pre">'+esc(n.failureSummary)+'</span></div>' +
            '<div class="'+st+'">'+esc(stLabel)+'</div>' +
            baseLine +
          '</div>';
        }).join('') + '</div>' +
      '</article>';
    }).join('');
  }

  function getFilters(){
    var impacts = [];
    ['critical','serious','moderate','minor','unknown'].forEach(function(k){
      var el = document.getElementById('imp-'+k);
      if (el && el.checked) impacts.push(k);
    });
    return {
      impacts: impacts,
      page: document.getElementById('filter-page').value,
      status: document.getElementById('filter-status').value,
      q: (document.getElementById('filter-search').value || '').toLowerCase().trim()
    };
  }

  function filterPageRows(){
    var q = (document.getElementById('filter-search').value || '').toLowerCase().trim();
    var pageF = document.getElementById('filter-page').value;
    [].forEach.call(document.querySelectorAll('#pages-body tr'), function(tr){
      var p = tr.getAttribute('data-page') || '';
      var show = (pageF === 'all' || p === pageF);
      if (show && q) {
        var t = tr.textContent.toLowerCase();
        show = t.indexOf(q) !== -1;
      }
      tr.classList.toggle('hidden', !show);
    });
  }

  function refresh(){
    renderCards();
    filterPageRows();
  }

  document.getElementById('filter-search').addEventListener('input', refresh);
  document.getElementById('filter-page').addEventListener('change', refresh);
  document.getElementById('filter-status').addEventListener('change', refresh);
  ['critical','serious','moderate','minor','unknown'].forEach(function(k){
    var el = document.getElementById('imp-'+k);
    if (el) el.addEventListener('change', refresh);
  });

  renderPages();
  refresh();
})();
`;

    const impactChecksHtml = IMPACT_ORDER.map((ik) => {
      const c = impactCounts[ik];
      const id = `imp-${ik}`;
      return `<span><input type="checkbox" id="${escapeHtmlAttr(id)}" checked data-impact="${escapeHtmlAttr(ik)}"> <label for="${escapeHtmlAttr(id)}">${escapeHtml(ik)} (${c})</label></span>`;
    }).join('');

    const pageSelectOpts =
      `<option value="all">All pages</option>` +
      pageOptions.map((p) => `<option value="${escapeHtmlAttr(p)}">${escapeHtml(p)}</option>`).join('');

    const orphanSection =
      orphanBaseline.length === 0
        ? ''
        : `<section class="orphan-list">
      <h3>Baseline entries that matched nothing (consider deleting)</h3>
      <ul>
        ${orphanBaseline
          .map(
            (o) =>
              `<li><code>${escapeHtml(o.rule)}</code> / ${escapeHtml(o.page)} / <code>${escapeHtml(o.target)}</code> — ${escapeHtml(o.reason)} (owner ${escapeHtml(o.owner)}, expires ${escapeHtml(o.expires)})</li>`,
          )
          .join('')}
      </ul>
    </section>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">Interactive report (offline). Use filters to narrow failures.</p>
  <div class="metrics">
    <div class="metric"><div class="l">Pages scanned</div><div class="n">${escapeHtml(String(totals.pagesScanned))}</div></div>
    <div class="metric"><div class="l">Rules violated</div><div class="n">${escapeHtml(String(totals.rulesViolated))}</div></div>
    <div class="metric"><div class="l">Elements affected</div><div class="n">${escapeHtml(String(totals.elementsAffected))}</div></div>
    <div class="metric"><div class="l">Blocking</div><div class="n">${escapeHtml(String(totals.blocking))}</div></div>
  </div>
  <div class="filters">
    <div class="field"><span>Impact</span><div class="imp-checks">${impactChecksHtml}</div></div>
    <label class="field">Page <select id="filter-page">${pageSelectOpts}</select></label>
    <label class="field">Status <select id="filter-status">
      <option value="all">All (${escapeHtml(String(allNodes.length))})</option>
      <option value="new">New (${escapeHtml(String(statusCounts.new))})</option>
      <option value="baselined">Baselined (${escapeHtml(String(statusCounts.baselined))})</option>
      <option value="expired">Expired (${escapeHtml(String(statusCounts.expired))})</option>
    </select></label>
    <label class="field">Search <input type="search" id="filter-search" placeholder="Rule, selector, HTML…"></label>
  </div>
  <table class="pages">
    <thead><tr><th>Page</th><th>Elements</th><th>Impact mix</th><th>Rules passed</th></tr></thead>
    <tbody id="pages-body"></tbody>
  </table>
  <div id="cards" class="cards"></div>
  ${orphanSection}
</div>
<script type="application/json" id="__data">${dataJson}</script>
<script>${js}</script>
</body>
</html>`;
  }
}
