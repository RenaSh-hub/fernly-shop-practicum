import { expect, test, type Page } from '@playwright/test';
import { scanPage } from './helpers/scan.js';

const firstCustomer = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};

function formatBlockingMessage(blocking: { ruleId: string; impact?: string; classification: string; target: string[] }[]): string {
  if (blocking.length === 0) return '';
  return blocking
    .map(
      (item) =>
        `[${item.classification}] ${item.ruleId} (${item.impact ?? 'unknown impact'}) @ ${item.target.join(' >> ')}`,
    )
    .join('\n');
}

async function signInAsFirstCustomer(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(firstCustomer.email);
  await page.getByLabel('Password').fill(firstCustomer.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function ensureCartHasOnePlant(page: Page): Promise<void> {
  await page.goto('/plants/pl-monstera');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText(/Added .* to your cart/)).toBeVisible();
}

test('Browse (/)', { tag: '@a11y' }, async ({ page }, testInfo) => {
  await page.goto('/');
  const { blocking } = await scanPage(page, testInfo, { name: 'Browse' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

test('Plant (/plants/pl-monstera)', { tag: '@a11y' }, async ({ page }, testInfo) => {
  await page.goto('/plants/pl-monstera');
  const { blocking } = await scanPage(page, testInfo, { name: 'Plant' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

test('Plant Reviews signed-out (/plants/pl-snake)', { tag: '@a11y' }, async ({ page }, testInfo) => {
  await page.goto('/plants/pl-snake');
  await expect(page.getByRole('heading', { level: 2, name: 'Reviews' })).toBeVisible();
  const { blocking } = await scanPage(page, testInfo, { name: 'Plant Reviews signed-out' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

test('Plant Reviews signed-in (/plants/pl-snake)', { tag: '@a11y' }, async ({ page }, testInfo) => {
  await signInAsFirstCustomer(page);
  await page.goto('/plants/pl-snake');
  await expect(page.getByRole('heading', { level: 2, name: 'Reviews' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();
  // Star radiogroup must be usable from the keyboard (feature oracle)
  const group = page.getByRole('radiogroup', { name: 'Your rating' });
  await group.focus();
  await page.keyboard.press('ArrowRight');
  const { blocking } = await scanPage(page, testInfo, { name: 'Plant Reviews signed-in' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

test('Sign in (/login)', { tag: '@a11y' }, async ({ page }, testInfo) => {
  await page.goto('/login');
  const { blocking } = await scanPage(page, testInfo, { name: 'Sign in' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

test('Cart with one plant in cart', { tag: '@a11y' }, async ({ page }, testInfo) => {
  await signInAsFirstCustomer(page);
  await ensureCartHasOnePlant(page);
  await page.goto('/cart');
  const { blocking } = await scanPage(page, testInfo, { name: 'Cart' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

test('Checkout with one plant in cart', { tag: '@a11y' }, async ({ page }, testInfo) => {
  await signInAsFirstCustomer(page);
  await ensureCartHasOnePlant(page);
  await page.goto('/checkout');
  const { blocking } = await scanPage(page, testInfo, { name: 'Checkout' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';

async function ensurePromoEntryForm(page: Page): Promise<void> {
  const remove = page.getByRole('button', { name: 'Remove' });
  if (await remove.isVisible().catch(() => false)) {
    await remove.click();
    await expect(page.getByText(/Have a promo code\?/i)).toBeVisible();
  }
}

async function applyLeafy10ViaApi(page: Page): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('fernly_token'));
  expect(token, 'signed-in token').toBeTruthy();
  const res = await page.request.post(`${apiUrl}/api/cart/promo`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { code: 'LEAFY10' },
  });
  expect(res.ok(), `apply LEAFY10 via API (${res.status()})`).toBeTruthy();
}

test('T12: Cart with promo field visible', { tag: ['@a11y', '@known-bug'] }, async ({ page }, testInfo) => {
  test.fail(true, 'FINDING-17: Promo code input has no accessible name');
  await signInAsFirstCustomer(page);
  await ensureCartHasOnePlant(page);
  await page.goto('/cart');
  await ensurePromoEntryForm(page);
  await expect(page.getByText(/Have a promo code\?/i)).toBeVisible();
  // Feature oracle: code field has a visible / accessible name (promo-codes.md; PRODUCT AA)
  await expect
    .soft(page.getByLabel(/promo code/i), 'promo code input must have an accessible name')
    .toBeVisible({ timeout: 2000 });
  const { blocking } = await scanPage(page, testInfo, { name: 'Cart promo field' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

test('T12: Cart with promo code applied', { tag: ['@a11y', '@known-bug'] }, async ({ page }, testInfo) => {
  test.fail(true, 'FINDING-12: Price text fails WCAG color contrast');
  await signInAsFirstCustomer(page);
  await ensureCartHasOnePlant(page);
  await applyLeafy10ViaApi(page);
  await page.goto('/cart');
  await expect(page.getByText(/Code\s+LEAFY10\s+applied/i)).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('region', { name: 'Order summary' }).getByText(/Discount/)).toBeVisible();
  const { blocking } = await scanPage(page, testInfo, { name: 'Cart promo applied' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});

test('T12: Checkout with discount line', { tag: ['@a11y', '@known-bug'] }, async ({ page }, testInfo) => {
  test.fail(true, 'FINDING-12: Price text fails WCAG color contrast');
  await signInAsFirstCustomer(page);
  await ensureCartHasOnePlant(page);
  await applyLeafy10ViaApi(page);
  await page.goto('/checkout');
  await expect(page.getByRole('region', { name: 'Order summary' }).getByText(/Discount \(LEAFY10\)/)).toBeVisible();
  const { blocking } = await scanPage(page, testInfo, { name: 'Checkout with discount' });
  expect(blocking, formatBlockingMessage(blocking)).toEqual([]);
});
