import { test, expect, type APIRequestContext } from '@playwright/test';
import { expectSchema } from '../helpers/schema.js';

const AVA = { email: 'ava@fernly.test', password: 'Fernly-Ava-2026' };
const SHIPPING_FEE = 6.95;

type CartBody = {
  lines: { id: string; plantId: string; unitPrice: number; quantity: number; lineTotal: number }[];
  itemCount: number;
  subtotal: number;
  discount: number;
  promoCode: string | null;
  shipping: number;
  total: number;
};

async function login(request: APIRequestContext, credentials: { email: string; password: string }) {
  const res = await request.post('/api/auth/login', { data: credentials });
  expect(res.ok(), `login ${credentials.email}`).toBeTruthy();
  const body = (await res.json()) as { token: string };
  return body.token;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Oracle: percent off plant subtotal only (docs/features/promo-codes.md). */
function expectedPercentDiscount(subtotal: number, percent: number): number {
  return roundCents((subtotal * percent) / 100);
}

async function clearCart(request: APIRequestContext, token: string) {
  const res = await request.get('/api/cart', { headers: auth(token) });
  expect(res.ok()).toBeTruthy();
  const cart = (await res.json()) as CartBody;
  for (const line of cart.lines) {
    const del = await request.delete(`/api/cart/lines/${line.id}`, { headers: auth(token) });
    expect(del.ok(), `clear line ${line.id}`).toBeTruthy();
  }
  await request.delete('/api/cart/promo', { headers: auth(token) });
}

async function addPlant(
  request: APIRequestContext,
  token: string,
  plantId: string,
  quantity = 1,
  size = 'S',
): Promise<CartBody> {
  const res = await request.post('/api/cart/lines', {
    headers: auth(token),
    data: { plantId, size, quantity },
  });
  expect(res.ok(), `add ${plantId}`).toBeTruthy();
  return (await res.json()) as CartBody;
}

test.describe('Promo codes API', () => {
  test('T1: LEAFY10 percent off plant subtotal only; validation; cents; shipping unchanged', { tag: '@api' }, async ({
    request,
  }) => {
    const token = await login(request, AVA);
    await clearCart(request, token);
    // Peace Lily $19.99 — 10% → $2.00 after cent rounding; under $50 so shipping charged
    const before = await addPlant(request, token, 'pl-peace-lily');
    expect(before.subtotal).toBe(19.99);
    expect(before.shipping).toBe(SHIPPING_FEE);
    expect(before.promoCode).toBeNull();
    expect(before.discount).toBe(0);

    const apply = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'LEAFY10' },
    });
    expect(apply.status()).toBe(200);
    const cart = (await apply.json()) as CartBody;
    await expectSchema(request, cart, 'Cart');

    const discount = expectedPercentDiscount(cart.subtotal, 10);
    expect(cart.promoCode).toBe('LEAFY10');
    expect
      .soft(cart.discount, 'percent off plants only — never shipping (promo-codes.md)')
      .toBe(discount);
    expect(cart.shipping, 'percent code must not change shipping').toBe(SHIPPING_FEE);
    expect(cart.total).toBe(roundCents(cart.subtotal - cart.discount + cart.shipping));
    // Explicit oracle: 10% of $19.99 → $2.00 (not 10% of subtotal+shipping)
    expect.soft(cart.discount, 'LEAFY10 cents on plant subtotal').toBe(2);

    const emptyBody = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: {},
    });
    expect(emptyBody.status()).toBe(400);
    expect((await emptyBody.json()).rule).toBe('validation_error');

    const emptyCode = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: '' },
    });
    expect(emptyCode.status()).toBe(400);
    expect((await emptyCode.json()).rule).toBe('validation_error');

    const whitespace = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: '   ' },
    });
    expect(whitespace.status()).toBe(400);
    expect((await whitespace.json()).rule).toBe('validation_error');
  });

  test('T2: FREESHIP zeros shipping; $50 rule uses pre-discount subtotal; percent keeps free shipping', { tag: '@api' }, async ({
    request,
  }) => {
    const token = await login(request, AVA);
    await clearCart(request, token);

    // Under $50 — FREESHIP → shipping 0
    const under = await addPlant(request, token, 'pl-pothos');
    expect(under.subtotal).toBeLessThan(50);
    expect(under.shipping).toBe(SHIPPING_FEE);

    const freeShip = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'FREESHIP' },
    });
    expect(freeShip.status()).toBe(200);
    const freeCart = (await freeShip.json()) as CartBody;
    await expectSchema(request, freeCart, 'Cart');
    expect(freeCart.promoCode).toBe('FREESHIP');
    expect(freeCart.shipping).toBe(0);
    expect(freeCart.discount).toBe(0);
    expect(freeCart.total).toBe(freeCart.subtotal);

    await clearCart(request, token);
    // Bird of Paradise $50.00 — PRODUCT: free shipping at $50.00 or more (before discount)
    const atThreshold = await addPlant(request, token, 'pl-bird');
    expect(atThreshold.subtotal).toBe(50);
    expect
      .soft(atThreshold.shipping, 'PRODUCT.md: free shipping when subtotal >= $50')
      .toBe(0);

    const leafyOnFree = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'LEAFY10' },
    });
    expect(leafyOnFree.status()).toBe(200);
    const leafyFree = (await leafyOnFree.json()) as CartBody;
    expect(leafyFree.promoCode).toBe('LEAFY10');
    expect
      .soft(leafyFree.discount, 'percent off plants only at $50 threshold')
      .toBe(expectedPercentDiscount(leafyFree.subtotal, 10));
    expect
      .soft(leafyFree.shipping, 'percent code must not reintroduce shipping when pre-discount subtotal >= $50')
      .toBe(0);
    // After 10% off, plant amount is $45 — still free shipping (threshold on pre-discount subtotal)
    expect(roundCents(leafyFree.subtotal - leafyFree.discount)).toBeLessThan(50);
    expect(leafyFree.total).toBe(roundCents(leafyFree.subtotal - leafyFree.discount + leafyFree.shipping));

    await clearCart(request, token);
    // Fiddle Leaf Fig $49 — under $50 before discount → still charged shipping after percent off
    const underBefore = await addPlant(request, token, 'pl-fiddle');
    expect(underBefore.subtotal).toBe(49);
    expect(underBefore.shipping).toBe(SHIPPING_FEE);
    const leafyUnder = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'LEAFY10' },
    });
    expect(leafyUnder.status()).toBe(200);
    const underAfter = (await leafyUnder.json()) as CartBody;
    expect
      .soft(underAfter.discount, 'percent off plants only under $50')
      .toBe(expectedPercentDiscount(underAfter.subtotal, 10));
    expect(underAfter.shipping, 'pre-discount subtotal < $50 keeps shipping').toBe(SHIPPING_FEE);
  });

  test('T3: case-insensitive apply; replace one code; DELETE clears; unknown refused', { tag: '@api' }, async ({
    request,
  }) => {
    const token = await login(request, AVA);
    await clearCart(request, token);
    await addPlant(request, token, 'pl-pothos');

    const lower = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'leafy10' },
    });
    expect(lower.status()).toBe(200);
    const lowerCart = (await lower.json()) as CartBody;
    expect(lowerCart.promoCode).toBe('LEAFY10');
    expect
      .soft(lowerCart.discount, 'percent off plants only (case-insensitive leafy10)')
      .toBe(expectedPercentDiscount(lowerCart.subtotal, 10));

    const replace = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'FREESHIP' },
    });
    expect(replace.status()).toBe(200);
    const replaced = (await replace.json()) as CartBody;
    expect(replaced.promoCode).toBe('FREESHIP');
    expect(replaced.discount).toBe(0);
    expect(replaced.shipping).toBe(0);

    const cleared = await request.delete('/api/cart/promo', { headers: auth(token) });
    expect(cleared.status()).toBe(200);
    const afterDelete = (await cleared.json()) as CartBody;
    await expectSchema(request, afterDelete, 'Cart');
    expect(afterDelete.promoCode).toBeNull();
    expect(afterDelete.discount).toBe(0);
    expect(afterDelete.shipping).toBe(SHIPPING_FEE);

    const unknown = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'NOTAREALCODE' },
    });
    expect(unknown.status()).toBe(400);
    expect((await unknown.json()).rule).toBe('promo_invalid');
  });

  test('T4: expired SPRING5 and empty cart refused', { tag: '@api' }, async ({ request }) => {
    const token = await login(request, AVA);
    await clearCart(request, token);

    const emptyApply = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'LEAFY10' },
    });
    expect(emptyApply.status()).toBe(400);
    const emptyBody = await emptyApply.json();
    expect(emptyBody.rule).toBe('empty_cart');
    expect(emptyBody.detail).toMatch(/Add a plant/i);

    await addPlant(request, token, 'pl-aloe');

    const expired = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'SPRING5' },
    });
    expect(expired.status()).toBe(400);
    const expiredBody = await expired.json();
    expect(expiredBody.rule).toBe('promo_invalid');
    expect
      .soft(String(expiredBody.detail), 'expired codes must say the code has expired')
      .toMatch(/expired/i);

    const gibberish = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'ZZZZNOPE' },
    });
    expect(gibberish.status()).toBe(400);
    expect((await gibberish.json()).rule).toBe('promo_invalid');
  });

  test('T5: promo routes require auth; signed-in mutates own cart only', { tag: '@api' }, async ({ request }) => {
    const postUnsigned = await request.post('/api/cart/promo', { data: { code: 'LEAFY10' } });
    expect(postUnsigned.status()).toBe(401);
    expect((await postUnsigned.json()).rule).toBe('auth_required');

    const deleteUnsigned = await request.delete('/api/cart/promo');
    expect(deleteUnsigned.status()).toBe(401);
    expect((await deleteUnsigned.json()).rule).toBe('auth_required');

    const token = await login(request, AVA);
    await clearCart(request, token);
    await addPlant(request, token, 'pl-spider');

    const apply = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'LEAFY10' },
    });
    expect(apply.status()).toBe(200);
    expect(((await apply.json()) as CartBody).promoCode).toBe('LEAFY10');

    const mine = await request.get('/api/cart', { headers: auth(token) });
    expect(mine.ok()).toBeTruthy();
    expect(((await mine.json()) as CartBody).promoCode).toBe('LEAFY10');
  });

  test('T6: order keeps discount/promoCode; new cart has no promo', { tag: '@api' }, async ({ request }) => {
    const token = await login(request, AVA);
    await clearCart(request, token);
    await addPlant(request, token, 'pl-rubber');

    const apply = await request.post('/api/cart/promo', {
      headers: auth(token),
      data: { code: 'LEAFY10' },
    });
    expect(apply.status()).toBe(200);
    const cart = (await apply.json()) as CartBody;
    expect(cart.promoCode).toBe('LEAFY10');
    const expectedDiscount = expectedPercentDiscount(cart.subtotal, 10);
    expect.soft(cart.discount).toBe(expectedDiscount);

    const orderRes = await request.post('/api/orders', {
      headers: auth(token),
      data: {
        shippingAddress: {
          fullName: 'Ava Green',
          address: '12 Fern Lane',
          city: 'Portland',
          postalCode: '97201',
        },
      },
    });
    expect(orderRes.status()).toBe(201);
    const order = await orderRes.json();
    await expectSchema(request, order, 'Order');
    expect(order.promoCode).toBe('LEAFY10');
    expect(order.discount).toBe(cart.discount);
    expect(order.total).toBe(cart.total);
    expect(order.subtotal).toBe(cart.subtotal);
    expect(order.shipping).toBe(cart.shipping);

    const newCartRes = await request.get('/api/cart', { headers: auth(token) });
    expect(newCartRes.ok()).toBeTruthy();
    const newCart = (await newCartRes.json()) as CartBody;
    await expectSchema(request, newCart, 'Cart');
    expect(newCart.lines).toEqual([]);
    expect(newCart.promoCode).toBeNull();
    expect(newCart.discount).toBe(0);
  });
});
