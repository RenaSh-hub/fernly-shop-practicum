import { expect, test } from '@playwright/test';
import { readFeature } from './feature.js';
import { freshCustomer, HelperPage, type ToolName } from './helper-page.js';
import { writeEntries, type ResultEntry } from './manifest.js';
import { expectedCall, runUiCheck, thenSortKey } from './thens.js';

function callKey(call: { name: ToolName; args: Record<string, unknown> }): string {
  return JSON.stringify({ name: call.name, args: call.args });
}

function testTitleFor(call: { name: ToolName; args: Record<string, unknown> }): string {
  if (call.name === 'add_to_cart') {
    const { plantId, size, quantity } = call.args;
    return `add_to_cart ${plantId} ${String(size)} ×${quantity}`;
  }
  if (call.name === 'search_plants') {
    return 'search_plants petSafe';
  }
  return `care_tip ${String(call.args.plantId)} ${String(call.args.topic)}`;
}

const examples = readFeature();
const groups = new Map<string, { call: { name: ToolName; args: Record<string, unknown> }; rows: typeof examples }>();

for (const example of examples) {
  const callThen = example.thens.find((then) => expectedCall(then));
  if (!callThen) continue;
  const call = expectedCall(callThen);
  if (!call) continue;
  const key = callKey(call);
  const bucket = groups.get(key) ?? { call, rows: [] };
  bucket.rows.push(example);
  groups.set(key, bucket);
}

for (const { call, rows } of groups.values()) {
  const title = testTitleFor(call);
  test(title, { tag: '@helper' }, async ({ page, request }) => {
    await freshCustomer(page, request);
    const helper = new HelperPage(page);
    await helper.open();
    await helper.run(call.name, call.args);

    const entries: ResultEntry[] = [];
    const failedThens: string[] = [];

    for (const example of rows) {
      const exampleLabel =
        example.row.phrase ??
        example.row.plantId ??
        example.row.plant ??
        example.when.replace(/^I ask the helper "/, '').replace(/"$/, '');

      const sortedThens = [...example.thens].sort((a, b) => thenSortKey(a) - thenSortKey(b));
      for (const then of sortedThens) {
        const outcome = await runUiCheck(then, { page, helper, row: example.row });
        entries.push({
          tier: 'a',
          scenario: example.scenario,
          example: exampleLabel,
          then,
          result: outcome.result,
          evidence: outcome.evidence,
        });
        if (outcome.result === 'fail') {
          failedThens.push(`${exampleLabel} → ${then} (${outcome.evidence})`);
        }
      }
    }

    writeEntries('a', title, entries);

    if (failedThens.length > 0) {
      expect(failedThens, `Failed Thens for ${title}`).toEqual([]);
    }
  });
}