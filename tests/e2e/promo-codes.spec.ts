import { test, expect, type Page } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage.js';
import { PlantPage } from '../pages/PlantPage.js';
import { CartPage } from '../pages/CartPage.js';
import { CheckoutPage } from '../pages/CheckoutPage.js';
import { OrderDetailPage } from '../pages/OrderDetailPage.js';

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';

const AVA = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function signIn(page: Page) {
  const signIn = new SignInPage(page);
  await signIn.goto();
  await signIn.signIn(AVA.email, AVA.password);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(signIn.signedInGreeting('Ava')).toBeVisible();
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

    const plant = new PlantPage(page);
    await plant.goto('pl-peace-lily');
    await plant.addToCart();
    await expect(plant.addedToCartToast).toBeVisible();

    const cart = new CartPage(page);
    await cart.goto();
    await expect(cart.pageTitle).toBeVisible();
    const summary = cart.orderSummary;
    await expect(summary).toBeVisible();

    const beforeUnknown = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    const beforeUnknownBody = (await beforeUnknown.json()) as { total: number; promoCode: string | null };

    await expect(cart.havePromoCodePrompt).toBeVisible();
    await cart.applyPromoCode('NOTAREAL');
    await expect(cart.promoErrorMessage(/don.?t recognize|invalid/i)).toBeVisible({ timeout: 5000 });
    const afterUnknown = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    const afterUnknownBody = (await afterUnknown.json()) as { total: number; promoCode: string | null };
    expect(afterUnknownBody.promoCode).toBeNull();
    expect(afterUnknownBody.total).toBe(beforeUnknownBody.total);

    // Expired SPRING5 must refuse (oracle). Clear via API if the shop wrongly accepts it.
    await cart.applyPromoCode('SPRING5');
    const afterSpringRes = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    const afterSpring = (await afterSpringRes.json()) as { promoCode: string | null; total: number };
    expect
      .soft(afterSpring.promoCode, 'SPRING5 is expired and must not stick on the cart')
      .toBeNull();
    await expect
      .soft(cart.promoExpiredMessage(/expired/i), 'UI must say the code has expired')
      .toBeVisible({ timeout: 2000 });
    if (afterSpring.promoCode) {
      await page.request.delete(`${apiUrl}/api/cart/promo`, { headers: authHeader });
      await cart.reload();
      await expect(cart.havePromoCodePrompt).toBeVisible();
    }

    await cart.applyPromoCode('LEAFY10');
    await expect(cart.promoAppliedMessage('LEAFY10')).toBeVisible({ timeout: 5000 });
    await expect(cart.orderSummaryDiscountFor('LEAFY10')).toBeVisible();

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

    let checkout = await cart.goToCheckout();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(checkout.orderSummaryDiscountFor('LEAFY10')).toBeVisible();

    await checkout.fillShippingAddress({
      fullName: 'Ava Green',
      street: '12 Fern Lane',
      city: 'Portland',
      postalCode: '97201',
    });
    const orderDetail = await checkout.placeOrder();

    await expect(page).toHaveURL(/\/orders\//, { timeout: 15000 });
    await expect(orderDetail.paidDiscountFor('LEAFY10')).toBeVisible();
    await expect(orderDetail.paidDiscountAmount(`−$${cartBody.discount}`)).toBeVisible();

    const emptyCart = await page.request.get(`${apiUrl}/api/cart`, { headers: authHeader });
    expect(emptyCart.ok()).toBeTruthy();
    const emptyBody = (await emptyCart.json()) as { promoCode: string | null; discount: number; lines: unknown[] };
    expect(emptyBody.lines).toEqual([]);
    expect(emptyBody.promoCode).toBeNull();
    expect(emptyBody.discount).toBe(0);

    await clearCartViaApi(page, token);
    await plant.goto('pl-pothos');
    await plant.addToCart();
    await expect(plant.addedToCartToast).toBeVisible();
    await cart.goto();
    await cart.applyPromoCode('FREESHIP');
    await expect(cart.promoAppliedMessage('FREESHIP')).toBeVisible({ timeout: 5000 });
    await expect(cart.orderSummaryFreeShipping()).toBeVisible();

    checkout = new CheckoutPage(page);
    await cart.goToCheckout();
    await expect(checkout.orderSummaryFreeShipping()).toBeVisible();
  });
});
