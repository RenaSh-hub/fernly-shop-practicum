import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Result, UnlabelledFrameSelector } from 'axe-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type BaselineEntry = {
  rule: string;
  page: string;
  /** CSS-style selector chain (`iframe >> descendant`) or `*` for every element. */
  target: string;
  owner: string;
  expires: string;
  reason: string;
};

export type ViolationClassification = 'new' | 'baselined' | 'expired';

export interface ClassifiedViolationNode {
  ruleId: string;
  page: string;
  help: string;
  helpUrl: string;
  impact?: string;
  target: string[];
  html: string;
  classification: ViolationClassification;
}

let cachedBaseline: BaselineEntry[] | undefined;

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadBaselineFromDisk(): BaselineEntry[] {
  const filePath = path.join(__dirname, 'a11y-baseline.json');
  const raw = readFileSync(filePath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('a11y-baseline.json must be a JSON array');
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

export function getBaseline(): BaselineEntry[] {
  if (!cachedBaseline) cachedBaseline = loadBaselineFromDisk();
  return cachedBaseline;
}

export function clearBaselineCache(): void {
  cachedBaseline = undefined;
}

/** axe's selector type is wider than string[]; we normalize for baseline matching */
export function nodeTargetKeyFromSelector(target: UnlabelledFrameSelector): string {
  const parts = target as unknown as string[];
  return parts.join(' >> ');
}

export function matchesBaselineEntry(
  ruleId: string,
  pageName: string,
  nodeTarget: UnlabelledFrameSelector,
  entry: BaselineEntry,
): boolean {
  if (entry.rule !== ruleId || entry.page !== pageName) return false;
  if (entry.target === '*') return true;
  return nodeTargetKeyFromSelector(nodeTarget) === entry.target;
}

function classifyNode(
  rule: Result,
  pageName: string,
  nodeTarget: UnlabelledFrameSelector,
  baseline: BaselineEntry[],
): ViolationClassification {
  const today = todayYmd();
  const matching = baseline.filter((entry) => matchesBaselineEntry(rule.id, pageName, nodeTarget, entry));

  const hasExpired = matching.some((entry) => entry.expires < today);
  if (hasExpired) return 'expired';

  const hasActive = matching.some((entry) => entry.expires >= today);
  if (hasActive) return 'baselined';

  return 'new';
}

export function isBlockingClassification(classification: ViolationClassification, impact: string | undefined): boolean {
  if (classification === 'expired') return true;
  if (classification === 'new' && (impact === 'serious' || impact === 'critical')) return true;
  return false;
}

export function classifyAxeViolations(pageName: string, violations: Result[], baseline: BaselineEntry[]): ClassifiedViolationNode[] {
  const classified: ClassifiedViolationNode[] = [];
  for (const rule of violations) {
    for (const node of rule.nodes) {
      const impact = node.impact ?? rule.impact ?? undefined;
      const classification = classifyNode(rule, pageName, node.target, baseline);
      classified.push({
        ruleId: rule.id,
        page: pageName,
        help: rule.help,
        helpUrl: rule.helpUrl,
        impact,
        target: node.target as unknown as string[],
        html: node.html,
        classification,
      });
    }
  }
  return classified;
}

export function filterBlocking(classified: ClassifiedViolationNode[]): ClassifiedViolationNode[] {
  return classified.filter((item) => isBlockingClassification(item.classification, item.impact));
}
