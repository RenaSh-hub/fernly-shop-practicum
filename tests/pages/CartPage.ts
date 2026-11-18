import type { Locator, Page } from '@playwright/test';
import { CheckoutPage } from './CheckoutPage.js';

export class CartPage {
  readonly pageTitle: Locator;
  readonly orderSummary: Locator;
  readonly havePromoCodePrompt: Locator;
  readonly promoCodeInput: Locator;
  readonly applyPromoButton: Locator;
  readonly goToCheckoutLink: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.getByRole('heading', { level: 1, name: 'Your cart' });
    this.orderSummary = page.getByRole('region', { name: 'Order summary' });
    this.havePromoCodePrompt = page.getByText(/Have a promo code\?/i);
    // Promo code field has no accessible name; on the cart page it is the only textbox.
    this.promoCodeInput = page.getByRole('textbox');
    this.applyPromoButton = page.getByRole('button', { name: 'Apply' });
    this.goToCheckoutLink = page.getByRole('link', { name: 'Go to checkout' });
  }

  /** @returns This cart page after navigation. */
  async goto(): Promise<this> {
    await this.page.goto('/cart');
    return this;
  }

  /** @returns This cart page after a full reload. */
  async reload(): Promise<this> {
    await this.page.reload();
    return this;
  }

  /**
   * @param pattern Message shown for an unknown or invalid promo code.
   * @returns Locator for the first matching error line.
   */
  promoErrorMessage(pattern: RegExp): Locator {
    return this.page.getByText(pattern).first();
  }

  /**
   * @param pattern Message when an expired code is refused.
   * @returns Locator for expired-code copy.
   */
  promoExpiredMessage(pattern: RegExp): Locator {
    return this.page.getByText(pattern);
  }

  /**
   * @param code Promo code that was applied successfully.
   * @returns Locator for the applied-code confirmation message.
   */
  promoAppliedMessage(code: string): Locator {
    return this.page.getByText(new RegExp(`Code\\s+${code}\\s+applied`, 'i'));
  }

  /**
   * @param code Applied promo code shown on the discount line.
   * @returns Locator for the discount row inside the order summary.
   */
  orderSummaryDiscountFor(code: string): Locator {
    return this.orderSummary.getByText(new RegExp(`Discount \\(${code}\\)`));
  }

  /** @returns Locator for free shipping copy in the order summary. */
  orderSummaryFreeShipping(): Locator {
    return this.orderSummary.getByText('Free', { exact: true });
  }

  /**
   * @param code Promo code to type into the cart form.
   * @returns This cart page after Apply is clicked.
   */
  async applyPromoCode(code: string): Promise<this> {
    await this.promoCodeInput.fill(code);
    await this.applyPromoButton.click();
    return this;
  }

  /** @returns Checkout page after following Go to checkout. */
  async goToCheckout(): Promise<CheckoutPage> {
    await this.goToCheckoutLink.click();
    return new CheckoutPage(this.page);
  }
}
