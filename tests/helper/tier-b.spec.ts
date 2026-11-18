import { expect, test } from '@playwright/test';
import { readFeature } from './feature.js';
import { freshCustomer, HelperPage, type RecordedCall } from './helper-page.js';
import { writeEntries, type ResultEntry } from './manifest.js';
import { expectedCall, runUiCheck, thenSortKey, type ExpectedCall } from './thens.js';

const RUNS = Number(process.env.HELPER_RUNS ?? '10');
const MIN_PASSES = Math.ceil(0.9 * RUNS);

function exampleLabel(example: { when: string; row: Record<string, string> }): string {
  return (
    example.row.phrase ??
    example.row.plantId ??
    example.row.plant ??
    example.when.replace(/^I ask the helper "/, '').replace(/"$/, '')
  );
}

function formatCall(call: RecordedCall | undefined): string {
  if (!call) return '(no model call)';
  return JSON.stringify({ name: call.name, args: call.args });
}

function modelCallMatches(expected: ExpectedCall, actual: RecordedCall | undefined): boolean {
  if (!actual || actual.name !== expected.name) return false;
  for (const [key, value] of Object.entries(expected.args)) {
    if (actual.args[key] !== value) return false;
  }
  return true;
}

const examples = readFeature().filter((example) => example.thens.some((then) => expectedCall(then)));

for (const example of examples) {
  const label = exampleLabel(example);
  test(label, { tag: '@helper' }, async ({ page, request }) => {
    test.setTimeout(RUNS * 15_000);
    const sortedThens = [...example.thens].sort((a, b) => thenSortKey(a) - thenSortKey(b));
    const passCounts = new Map<string, number>();
    const distinctCalls = new Map<string, Set<string>>();

    for (const then of sortedThens) {
      passCounts.set(then, 0);
      if (expectedCall(then)) distinctCalls.set(then, new Set());
    }

    for (let run = 0; run < RUNS; run += 1) {
      await freshCustomer(page, request);
      const helper = new HelperPage(page);
      await helper.open();
      await helper.ask(label);

      const call = await helper.lastModelCall();

      for (const then of sortedThens) {
        const expected = expectedCall(then);
        if (expected) {
          distinctCalls.get(then)?.add(formatCall(call));
          if (modelCallMatches(expected, call)) {
            passCounts.set(then, (passCounts.get(then) ?? 0) + 1);
          }
          continue;
        }

        const outcome = await runUiCheck(then, { page, helper, row: example.row });
        if (outcome.result === 'pass') {
          passCounts.set(then, (passCounts.get(then) ?? 0) + 1);
        }
      }
    }

    const entries: ResultEntry[] = [];
    const failedThens: string[] = [];

    for (const then of sortedThens) {
      const passes = passCounts.get(then) ?? 0;
      const passRate = `${passes}/${RUNS}`;
      const passedBar = passes >= MIN_PASSES;

      let evidence = passRate;
      const expected = expectedCall(then);
      if (expected) {
        const seen = [...(distinctCalls.get(then) ?? [])].sort();
        evidence = `${passRate}; calls: ${seen.join(' | ')}`;
      }

      entries.push({
        tier: 'b',
        scenario: example.scenario,
        example: label,
        then,
        result: passedBar ? 'pass' : 'fail',
        passRate,
        evidence,
      });

      if (!passedBar) {
        failedThens.push(`${then} (${evidence})`);
      }
    }

    writeEntries('b', label, entries);

    if (failedThens.length > 0) {
      expect(failedThens, `Below ${MIN_PASSES}/${RUNS} for "${label}"`).toEqual([]);
    }
  });
}