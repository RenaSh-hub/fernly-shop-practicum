import type { Locator, Page } from '@playwright/test';

export class BrowsePage {
  readonly sortBy: Locator;
  readonly firstCard: Locator;

  constructor(private readonly page: Page) {
    this.sortBy = page.getByRole('combobox', { name: 'Sort by' });
    this.firstCard = page.getByRole('article').first();
  }

  /** @returns This browse page after navigation. */
  async goto(): Promise<this> {
    await this.page.goto('/');
    return this;
  }

  /**
   * @param label Visible option label in the sort combobox.
   * @returns This browse page after the sort value is applied.
   */
  async selectSortByLabel(label: string): Promise<this> {
    await this.sortBy.selectOption({ label });
    return this;
  }

  /**
   * @param plantName Plant name on the first catalog card heading.
   * @returns Locator for the level-3 heading with that name inside the first card.
   */
  plantNameHeadingOnFirstCard(plantName: string): Locator {
    return this.firstCard.getByRole('heading', { level: 3, name: plantName });
  }
}
