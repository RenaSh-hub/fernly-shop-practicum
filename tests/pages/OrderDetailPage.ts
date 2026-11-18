import type { Locator, Page } from '@playwright/test';

export class OrderDetailPage {
  readonly paidSummary: Locator;

  constructor(private readonly page: Page) {
    this.paidSummary = page.getByRole('region', { name: 'Paid' });
  }

  /**
   * @param code Promo code shown on the paid order discount line.
   * @returns Locator for the discount row inside the Paid summary.
   */
  paidDiscountFor(code: string): Locator {
    return this.paidSummary.getByText(new RegExp(`Discount \\(${code}\\)`));
  }

  /**
   * @param amountFormatted Discount amount as shown in the UI (e.g. −$4.2).
   * @returns Locator for that amount inside the Paid summary.
   */
  paidDiscountAmount(amountFormatted: string): Locator {
    return this.paidSummary.getByText(amountFormatted);
  }
}
