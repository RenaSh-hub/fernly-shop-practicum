import { test, expect, type Page } from '@playwright/test';
import { BrowsePage } from '../pages/BrowsePage.js';

function signedOutStorage(): void {
  localStorage.removeItem('fernly_token');
  localStorage.removeItem('fernly_saved');
}

async function waitForImagesReady(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    [...document.images].every((img) => img.complete && img.naturalWidth > 0),
  );
}

async function openCatalogSignedOut(page: Page): Promise<BrowsePage> {
  await page.addInitScript(signedOutStorage);
  const browse = new BrowsePage(page);
  await browse.goto();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /^\d+ plants$/ })).toBeVisible();
  await waitForImagesReady(page);
  return browse;
}

test('catalog first screen', { tag: '@visual' }, async ({ page }) => {
  await openCatalogSignedOut(page);
  await expect(page).toHaveScreenshot('catalog-first-screen.png');
});

test('Monstera Deliciosa catalog card (plenty in stock)', { tag: '@visual' }, async ({ page }) => {
  const browse = await openCatalogSignedOut(page);
  const card = browse.plantCard('Monstera Deliciosa');
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByRole('img', { name: 'Monstera Deliciosa' })).toBeVisible();
  await expect(card).toHaveScreenshot('monstera-deliciosa-card.png');
});

test('Hoya Carnosa catalog card (few left in stock)', { tag: '@visual' }, async ({ page }) => {
  const browse = await openCatalogSignedOut(page);
  await browse.submitSearch('Hoya Carnosa');
  await expect(page.getByRole('heading', { level: 2, name: /^1 plants$/ })).toBeVisible();
  await waitForImagesReady(page);
  const card = browse.plantCard('Hoya Carnosa');
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByRole('img', { name: 'Hoya Carnosa' })).toBeVisible();
  await expect(card).toHaveScreenshot('hoya-carnosa-card.png');
});
