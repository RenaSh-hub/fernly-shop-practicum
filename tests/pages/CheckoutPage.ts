import type { Locator, Page } from '@playwright/test';
import { OrderDetailPage } from './OrderDetailPage.js';

export class CheckoutPage {
  readonly orderSummary: Locator;
  readonly fullName: Locator;
  readonly streetAddress: Locator;
  readonly city: Locator;
  readonly postalCode: Locator;
  readonly placeOrderButton: Locator;

  constructor(private readonly page: Page) {
    this.orderSummary = page.getByRole('region', { name: 'Order summary' });
    this.fullName = page.getByLabel('Full name');
    this.streetAddress = page.getByLabel('Street address');
    this.city = page.getByLabel('City');
    this.postalCode = page.getByLabel('Postal code');
    this.placeOrderButton = page.getByRole('button', { name: 'Place order' });
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
   * @param address Shipping address fields for checkout.
   * @returns This checkout page after the form fields are filled.
   */
  async fillShippingAddress(address: {
    fullName: string;
    street: string;
    city: string;
    postalCode: string;
  }): Promise<this> {
    await this.fullName.fill(address.fullName);
    await this.streetAddress.fill(address.street);
    await this.city.fill(address.city);
    await this.postalCode.fill(address.postalCode);
    return this;
  }

  /** @returns Order detail page after Place order is submitted. */
  async placeOrder(): Promise<OrderDetailPage> {
    await this.placeOrderButton.click();
    return new OrderDetailPage(this.page);
  }
}
