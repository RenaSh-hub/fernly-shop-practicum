import { test, expect } from '@playwright/test';
import { PlantPage } from '../pages/PlantPage.js';

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';

test.describe('Plant page popular journey', () => {
  test('T7: popular list on ≥2 plant pages; link updates list and omits current', { tag: '@e2e' }, async ({
    page,
  }) => {
    const popularRes = await page.request.get(`${apiUrl}/api/popular?limit=12`);
    expect(popularRes.ok()).toBeTruthy();
    const popular = (await popularRes.json()) as {
      items: { id: string; name: string; stock: number; unitsSold: number }[];
    };

    const seenHrefs: string[] = [];
    const inStockPages = ['pl-monstera', 'pl-snake'] as const;
    for (const plantId of inStockPages) {
      const plant = new PlantPage(page);
      await plant.goto(plantId);
      await expect(plant.popularHeading).toBeVisible();
      await expect(plant.popularSection.getByText(/sold this month/).first()).toBeVisible();

      const count = await plant.popularLinks.count();
      expect(count, `${plantId} popular count`).toBeGreaterThan(0);
      expect(count, `${plantId} at most four`).toBeLessThanOrEqual(4);

      for (let i = 0; i < count; i += 1) {
        const href = await plant.popularLinks.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        seenHrefs.push(href!);
        expect(href, `current plant ${plantId} left out`).not.toContain(`/plants/${plantId}`);
      }
    }

    const plant = new PlantPage(page);
    await plant.goto('pl-monstera');
    await expect(plant.popularHeading).toBeVisible();
    await plant.popularLinks.first().click();
    await expect(page).toHaveURL(/\/plants\//);
    await expect(plant.popularHeading).toBeVisible();

    const newId = page.url().match(/\/plants\/([^/?#]+)/)?.[1];
    expect(newId).toBeTruthy();
    const afterCount = await plant.popularLinks.count();
    for (let i = 0; i < afterCount; i += 1) {
      const href = await plant.popularLinks.nth(i).getAttribute('href');
      expect(href, `new current ${newId} left out`).not.toContain(`/plants/${newId}`);
      seenHrefs.push(href!);
    }
    await expect(plant.popularSection.getByText(/sold this month/).first()).toBeVisible();

    for (const item of popular.items) {
      if (item.stock === 0) {
        expect(
          seenHrefs.some((h) => h.includes(item.id)),
          `out-of-stock ${item.id} must not be offered as a popular link`,
        ).toBe(false);
      }
    }
  });
});
