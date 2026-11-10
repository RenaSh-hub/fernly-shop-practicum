import { test, expect, type Page } from '@playwright/test';

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';

const AVA = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(AVA.email);
  await page.getByLabel('Password').fill(AVA.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText('Hi, Ava')).toBeVisible();
}

async function clearCartViaApi(page: Page, token: string) {
  const cartRes = await page.request.get(`${apiUrl}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(cartRes.ok()).toBeTruthy();
  const cart = (await cartRes.json()) as { lines: { id: string }[] };
  for (const line of cart.lines) {
    await page.request.delete(`${apiUrl}/api/cart/lines/${line.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  await page.request.delete(`${apiUrl}/api/cart/promo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function applyCodeOnCart(page: Page, code: string) {
  await expect(page.getByText(/Have a promo code\?/i)).toBeVisible();
  const input = page.locator('form').filter({ hasText: /Have a promo code/i }).locator('input');
  await input.fill(code);
  await page.getByRole('button', { name: 'Apply' }).click();
}

test.describe('Promo codes journey', () => {
  test('T11: LEAFY10 and FREESHIP through checkout; refused codes leave total unchanged', { tag: ['@e2e', '@known-bug'] }, async ({
    page,
  }) => {
    test.fail(true, 'FINDING-15: Expired promo code SPRING5 is accepted');
    test.setTimeout(90_000);
    await signIn(page);

    const loginRes = await page.request.post(`${apiUrl}/api/auth/login`, { data: AVA });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = (await loginRes.json()) as { token: string };
    const authHeader = { Authorization: `Bearer ${token}` };
    await clearCartViaApi(page, token);

    await page.goto('/plants/pl-peace-lily');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByText(/Added .* to your cart/)).toBeVisible();

    await page.goto('/cart');
    await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible();
    const summary = page.getByRole('region', { name: 'Order summary' });
    await expect(summary).toBeVisible();

    const beforeUnknown = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    const beforeUnknownBody = (await beforeUnknown.json()) as { total: number; promoCode: string | null };

    await applyCodeOnCart(page, 'NOTAREAL');
    await expect(page.getByText(/don.?t recognize|invalid/i).first()).toBeVisible({ timeout: 5000 });
    const afterUnknown = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    const afterUnknownBody = (await afterUnknown.json()) as { total: number; promoCode: string | null };
    expect(afterUnknownBody.promoCode).toBeNull();
    expect(afterUnknownBody.total).toBe(beforeUnknownBody.total);

    // Expired SPRING5 must refuse (oracle). Clear via API if the shop wrongly accepts it.
    await applyCodeOnCart(page, 'SPRING5');
    const afterSpringRes = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    const afterSpring = (await afterSpringRes.json()) as { promoCode: string | null; total: number };
    expect
      .soft(afterSpring.promoCode, 'SPRING5 is expired and must not stick on the cart')
      .toBeNull();
    await expect
      .soft(page.getByText(/expired/i), 'UI must say the code has expired')
      .toBeVisible({ timeout: 2000 });
    if (afterSpring.promoCode) {
      await page.request.delete(`${apiUrl}/api/cart/promo`, { headers: authHeader });
      await page.reload();
      await expect(page.getByText(/Have a promo code\?/i)).toBeVisible();
    }

    await applyCodeOnCart(page, 'LEAFY10');
    await expect(page.getByText(/Code\s+LEAFY10\s+applied/i)).toBeVisible({ timeout: 5000 });
    await expect(summary.getByText(/Discount \(LEAFY10\)/)).toBeVisible();

    const cartSnapshot = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    expect(cartSnapshot.ok()).toBeTruthy();
    const cartBody = (await cartSnapshot.json()) as {
      discount: number;
      promoCode: string | null;
      total: number;
      subtotal: number;
      shipping: number;
    };
    expect(cartBody.promoCode).toBe('LEAFY10');
    expect.soft(cartBody.discount, 'percent off plants only').toBe(roundCents(cartBody.subtotal * 0.1));

    await page.getByRole('link', { name: 'Go to checkout' }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole('region', { name: 'Order summary' }).getByText(/Discount \(LEAFY10\)/)).toBeVisible();

    await page.getByLabel('Full name').fill('Ava Green');
    await page.getByLabel('Street address').fill('12 Fern Lane');
    await page.getByLabel('City').fill('Portland');
    await page.getByLabel('Postal code').fill('97201');
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page).toHaveURL(/\/orders\//, { timeout: 15000 });
    const paid = page.getByRole('region', { name: 'Paid' });
    await expect(paid.getByText(/Discount \(LEAFY10\)/)).toBeVisible();
    await expect(paid.getByText(`−$${cartBody.discount}`)).toBeVisible();

    const emptyCart = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    expect(emptyCart.ok()).toBeTruthy();
    const emptyBody = (await emptyCart.json()) as { promoCode: string | null; discount: number; lines: unknown[] };
    expect(emptyBody.lines).toEqual([]);
    expect(emptyBody.promoCode).toBeNull();
    expect(emptyBody.discount).toBe(0);

    await clearCartViaApi(page, token);
    await page.goto('/plants/pl-pothos');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByText(/Added .* to your cart/)).toBeVisible();
    await page.goto('/cart');
    await applyCodeOnCart(page, 'FREESHIP');
    await expect(page.getByText(/Code\s+FREESHIP\s+applied/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('region', { name: 'Order summary' }).getByText('Free', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Go to checkout' }).click();
    await expect(page.getByRole('region', { name: 'Order summary' }).getByText('Free', { exact: true })).toBeVisible();
  });
});
