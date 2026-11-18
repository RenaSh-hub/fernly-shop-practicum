import { test, expect } from '@playwright/test';
import { BrowsePage } from '../pages/BrowsePage.js';

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';

test.describe('Browse', () => {
  test('choosing "Price: high to low" shows the most expensive plant first', { tag: '@e2e' }, async ({ page }) => {
    const ascRes = await page.request.get(`${apiUrl}/api/plants?sort=price-asc&pageSize=48`);
    expect(ascRes.ok()).toBeTruthy();
    const ascBody = (await ascRes.json()) as { items: { name: string; price: number }[] };
    expect(ascBody.items.length).toBeGreaterThan(1);
    const mostExpensive = ascBody.items[ascBody.items.length - 1];

    const browse = new BrowsePage(page);
    await browse.goto();
    await browse.selectSortByLabel('Price: high to low');

    await expect(browse.plantNameHeadingOnFirstCard(mostExpensive.name)).toBeVisible();
  });
});
