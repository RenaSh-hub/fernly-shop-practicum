import { test, expect } from '@playwright/test';
import { expectSchema } from '../helpers/schema.js';

type PopularPlant = {
  id: string;
  name: string;
  stock: number;
  unitsSold: number;
};

type PopularList = {
  days: number;
  items: PopularPlant[];
};

test.describe('Popular API', () => {
  test('T1: default popular ranks by units sold (workshop tray of 40 counts as 40)', { tag: '@api' }, async ({
    request,
  }) => {
    const res = await request.get('/api/popular');
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as PopularList;
    await expectSchema(request, body, 'PopularList');

    expect(body.days).toBe(30);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.length).toBeLessThanOrEqual(4);

    for (const item of body.items) {
      expect(Number.isInteger(item.unitsSold), `${item.id} unitsSold int`).toBe(true);
    }
    for (let i = 0; i < body.items.length - 1; i += 1) {
      expect(
        body.items[i].unitsSold,
        `items[${i}] should rank at or above items[${i + 1}] by unitsSold`,
      ).toBeGreaterThanOrEqual(body.items[i + 1].unitsSold);
    }

    // Workshop trays: 200 orders × quantity 40 within 30 days → 8000 units for pl-cutting.
    // That outranks every other plant when popularity is units sold, not orders.
    expect(body.items[0].id, 'top plant must be Succulent Cutting when trays count as 40 units each').toBe(
      'pl-cutting',
    );
    expect(
      body.items[0].unitsSold,
      'workshop tray of 40 must contribute 40 units per order (200×40=8000), not 1 per order',
    ).toBe(8000);
  });

  test('T2: out-of-stock plants (e.g. pl-pilea) never appear in popular', { tag: '@api' }, async ({ request }) => {
    const pilea = await request.get('/api/plants/pl-pilea');
    expect(pilea.ok()).toBeTruthy();
    const pileaBody = (await pilea.json()) as { id: string; stock: number };
    expect(pileaBody.stock, 'seed: Chinese Money Plant is out of stock').toBe(0);

    const res = await request.get('/api/popular?limit=12');
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as PopularList;
    await expectSchema(request, body, 'PopularList');

    for (const item of body.items) {
      expect(item.stock, `${item.id} must be buyable`).toBeGreaterThan(0);
    }
    expect(
      body.items.some((item) => item.id === 'pl-pilea'),
      'pl-pilea (stock 0) must never appear even with high historical sales',
    ).toBe(false);
  });

  test('T3: limit 1–12; out of range → 400 validation_error', { tag: '@api' }, async ({ request }) => {
    const one = await request.get('/api/popular?limit=1');
    expect(one.ok()).toBeTruthy();
    const oneBody = (await one.json()) as PopularList;
    expect(oneBody.items.length).toBe(1);

    const twelve = await request.get('/api/popular?limit=12');
    expect(twelve.ok()).toBeTruthy();
    const twelveBody = (await twelve.json()) as PopularList;
    expect(twelveBody.items.length).toBeLessThanOrEqual(12);

    const omitted = await request.get('/api/popular');
    expect(omitted.ok()).toBeTruthy();
    const omittedBody = (await omitted.json()) as PopularList;
    expect(omittedBody.items.length).toBeLessThanOrEqual(4);

    for (const bad of ['0', '13', '-1', 'abc']) {
      const res = await request.get(`/api/popular?limit=${bad}`);
      expect(res.status(), `limit=${bad}`).toBe(400);
      const err = (await res.json()) as { detail: string; rule: string };
      expect(err.rule, `limit=${bad} rule`).toBe('validation_error');
      expect(err.detail, `limit=${bad} detail`).toBeTruthy();
    }
  });
});
