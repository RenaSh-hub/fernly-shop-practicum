import type { Locator, Page } from '@playwright/test';

export class BrowsePage {
  readonly sortBy: Locator;
  readonly firstCard: Locator;
  readonly searchField: Locator;
  readonly searchButton: Locator;

  constructor(private readonly page: Page) {
    this.sortBy = page.getByRole('combobox', { name: 'Sort by' });
    this.firstCard = page.getByRole('article').first();
    this.searchField = page.getByRole('searchbox');
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
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
   * @param query Search text submitted through the browse search form.
   * @returns This browse page after the search is submitted.
   */
  async submitSearch(query: string): Promise<this> {
    await this.searchField.fill(query);
    await this.searchButton.click();
    return this;
  }

  /**
   * @param plantName Plant name on the first catalog card heading.
   * @returns Locator for the level-3 heading with that name inside the first card.
   */
  plantNameHeadingOnFirstCard(plantName: string): Locator {
    return this.firstCard.getByRole('heading', { level: 3, name: plantName });
  }

  /**
   * @param plantName Plant name on the card heading.
   * @returns Locator for the catalog card article for that plant.
   */
  plantCard(plantName: string): Locator {
    return this.page.getByRole('article').filter({
      has: this.page.getByRole('heading', { level: 3, name: plantName }),
    });
  }
}
