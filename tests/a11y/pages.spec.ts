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
