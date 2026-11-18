import { expect, type Page } from '@playwright/test';
import { CartPage } from '../pages/CartPage.js';
import type { HelperPage, ToolName } from './helper-page.js';

export interface ExpectedCall {
  name: ToolName;
  args: Record<string, unknown>;
}

const PLANT_NAMES: Record<string, string> = {
  'pl-monstera': 'Monstera Deliciosa',
  'pl-snake': 'Snake Plant',
  'pl-boston-fern': 'Boston Fern',
  'pl-rubber': 'Rubber Plant',
  'pl-spider': 'Spider Plant',
  'pl-bird': 'Bird of Paradise',
  'pl-parlor': 'Parlor Palm',
  'pl-zz': 'ZZ Plant',
  'pl-peace-lily': 'Peace Lily',
  'pl-calathea': 'Calathea Orbifolia',
  'pl-fiddle': 'Fiddle Leaf Fig',
  'pl-pothos': "Pothos 'Golden'",
  'pl-pearls': 'String of Pearls',
  'pl-hoya': 'Hoya Carnosa',
  'pl-pilea': 'Chinese Money Plant',
};

export function expectedCall(then: string): ExpectedCall | undefined {
  let match = /^the helper calls add_to_cart with plantId "([^"]+)", size "([^"]+)" and quantity (\d+)$/.exec(then);
  if (match) {
    return {
      name: 'add_to_cart',
      args: { plantId: match[1], size: match[2], quantity: Number(match[3]) },
    };
  }
  if (then === 'the helper calls search_plants with petSafe true') {
    return { name: 'search_plants', args: { petSafe: true } };
  }
  match = /^the helper calls care_tip with plantId "([^"]+)" and topic "([^"]+)"$/.exec(then);
  if (match) {
    return { name: 'care_tip', args: { plantId: match[1], topic: match[2] } };
  }
  return undefined;
}

export type UiCheckContext = {
  page: Page;
  helper: HelperPage;
  row: Record<string, string>;
};

export type UiCheck = (ctx: UiCheckContext) => Promise<{ pass: boolean; evidence: string }>;

function loadsCartPage(then: string): boolean {
  return (
    /^the cart holds \d+ of /.test(then) ||
    /^the cart has no /.test(then)
  );
}

/** Lower number runs earlier; cart navigation runs last. */
export function thenSortKey(then: string): number {
  if (loadsCartPage(then)) return 20;
  if (then === 'the catalog shows only pet-safe plants') return 5;
  return 0;
}

function plantName(plantId: string): string {
  return PLANT_NAMES[plantId] ?? plantId;
}

function buildUiCheck(then: string): UiCheck | undefined {
  let match = /^the cart holds (\d+) of "([^"]+)" in size "([^"]+)"$/.exec(then);
  if (match) {
    const quantity = Number(match[1]);
    const plantId = match[2];
    const size = match[3];
    const name = plantName(plantId);
    return async ({ page }) => {
      const cart = new CartPage(page);
      await cart.goto();
      const line = page.getByRole('listitem').filter({ hasText: name });
      await expect(line).toBeVisible();
      await expect(line).toContainText(`Size ${size}`);
      await expect(page.getByRole('group', { name: `Quantity of ${name}` })).toContainText(String(quantity));
      return { pass: true, evidence: `Cart line for ${name} size ${size} qty ${quantity}` };
    };
  }

  match = /^the cart count in the header shows (\d+) right away$/.exec(then);
  if (match) {
    const count = match[1];
    return async ({ helper }) => {
      const badge = helper.cartLink().locator('span').first();
      await expect(helper.cartLink()).toContainText(count);
      await expect(badge).toBeVisible();
      return { pass: true, evidence: `Header cart badge shows ${count}` };
    };
  }

  if (then === 'the catalog shows only pet-safe plants') {
    return async ({ page }) => {
      await expect(page).toHaveURL(/petSafe=true/);
      const unsafe = page.getByText('Not pet safe');
      const unsafeCount = await unsafe.count();
      if (unsafeCount > 0) {
        return { pass: false, evidence: `Found ${unsafeCount} non–pet-safe tags on the catalog` };
      }
      const safeCount = await page.getByText('Pet safe').count();
      if (safeCount === 0) {
        return { pass: false, evidence: 'No pet-safe plants visible in the catalog' };
      }
      return { pass: true, evidence: `Catalog filtered to pet-safe (${safeCount} cards)` };
    };
  }

  match = /^the cart has no "([^"]+)"$/.exec(then);
  if (match) {
    const name = plantName(match[1]);
    return async ({ page }) => {
      const cart = new CartPage(page);
      await cart.goto();
      const empty = page.getByText('Your cart is empty');
      const line = page.getByText(name);
      const emptyVisible = await empty.isVisible().catch(() => false);
      if (emptyVisible) {
        return { pass: true, evidence: 'Cart is empty' };
      }
      const lineVisible = await line.isVisible().catch(() => false);
      return {
        pass: !lineVisible,
        evidence: lineVisible ? `Cart still lists ${name}` : `Cart has no line for ${name}`,
      };
    };
  }

  if (then === 'the helper does not say "Added"') {
    return async ({ helper }) => {
      const text = await helper.chatText();
      const pass = !/\bAdded\b/.test(text);
      return { pass, evidence: pass ? 'Chat has no "Added"' : `Chat contains Added: ${text.slice(0, 200)}` };
    };
  }

  if (then === 'the helper says the shop refused the add') {
    return undefined;
  }

  if (then === "the helper says why: there isn't enough stock") {
    return undefined;
  }

  if (/^the helper says the shop doesn't sell /.test(then)) {
    return async ({ helper }) => {
      const text = (await helper.chatText()).toLowerCase();
      const pass = /don't sell|do not sell|not sell|isn't in the shop|not in the shop/.test(text);
      return { pass, evidence: text.slice(0, 240) };
    };
  }

  if (then === 'the answer names no price') {
    return async ({ helper }) => {
      const text = await helper.chatText();
      const pass = !/\$\d|£\d|€\d|\b\d+\.\d{2}\b/.test(text);
      return { pass, evidence: text.slice(0, 240) };
    };
  }

  if (/^the answer agrees with the shop's data for /.test(then)) {
    return undefined;
  }

  if (then.startsWith('the helper calls ')) {
    return undefined;
  }

  return undefined;
}

export function uiCheck(then: string): UiCheck | undefined {
  return buildUiCheck(then);
}

export async function runUiCheck(
  then: string,
  ctx: UiCheckContext,
): Promise<{ result: 'pass' | 'fail' | 'judge' | 'skip'; evidence: string }> {
  const check = uiCheck(then);
  if (!check) {
    if (then.startsWith('the helper calls ')) {
      return { result: 'skip', evidence: 'Tool call asserted by tier A run()' };
    }
    return { result: 'judge', evidence: 'No automated UI check for this Then' };
  }
  try {
    const outcome = await check(ctx);
    return { result: outcome.pass ? 'pass' : 'fail', evidence: outcome.evidence };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { result: 'fail', evidence: message };
  }
}