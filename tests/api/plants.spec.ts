import { test, expect } from '@playwright/test';
import { expectSchema } from '../helpers/schema.js';

test.describe('Plants API', () => {
  test('a plant matches the Plant schema', { tag: '@api' }, async ({ request }) => {
    const listRes = await request.get('/api/plants?pageSize=1');
    expect(listRes.ok()).toBeTruthy();
    const list = (await listRes.json()) as { items: { id: string }[] };
    expect(list.items.length).toBeGreaterThan(0);

    const detailRes = await request.get(`/api/plants/${list.items[0].id}`);
    expect(detailRes.ok()).toBeTruthy();
    const plant = await detailRes.json();
    await expectSchema(request, plant, 'Plant');
  });

  test('"price-desc" returns the most expensive first', { tag: '@api' }, async ({ request }) => {
    const res = await request.get('/api/plants?sort=price-desc&pageSize=48');
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { items: { price: number }[]; total: number };
    expect(body.items.length).toBeGreaterThan(1);

    for (let i = 0; i < body.items.length - 1; i += 1) {
      expect(
        body.items[i].price,
        `items[${i}].price should be >= items[${i + 1}].price`,
      ).toBeGreaterThanOrEqual(body.items[i + 1].price);
    }
  });
});
