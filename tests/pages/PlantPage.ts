import type { Locator, Page } from '@playwright/test';

export class PlantPage {
  readonly reviewsHeading: Locator;
  readonly reviewsSection: Locator;
  readonly reviewsSignInLink: Locator;
  readonly writeReviewHeading: Locator;
  readonly yourReview: Locator;
  readonly postReviewButton: Locator;
  readonly addToCartButton: Locator;
  readonly addedToCartToast: Locator;
  readonly thanksForReviewToast: Locator;
  readonly formAlert: Locator;

  constructor(private readonly page: Page) {
    this.reviewsHeading = page.getByRole('heading', { level: 2, name: 'Reviews' });
    this.reviewsSection = page.getByRole('region', { name: 'Reviews' });
    this.reviewsSignInLink = this.reviewsSection.getByRole('link', { name: 'Sign in' });
    this.writeReviewHeading = page.getByRole('heading', { name: 'Write a review' });
    this.yourReview = page.getByLabel('Your review');
    this.postReviewButton = page.getByRole('button', { name: 'Post review' });
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    this.addedToCartToast = page.getByText(/Added .* to your cart/);
    this.thanksForReviewToast = page.getByText('Thanks for your review!');
    this.formAlert = page.getByRole('alert');
  }

  /**
   * @param plantId Fernly plant id (e.g. pl-snake).
   * @returns This plant page after navigation.
   */
  async goto(plantId: string): Promise<this> {
    await this.page.goto(`/plants/${plantId}`);
    return this;
  }

  /**
   * @param firstName First name shown in the header greeting (e.g. Ava).
   * @returns Locator for the signed-in greeting in the site chrome.
   */
  signedInGreeting(firstName: string): Locator {
    return this.page.getByText(`Hi, ${firstName}`);
  }

  /**
   * @param name Reviewer display name shown in the list.
   * @returns Locator for that reviewer's name text.
   */
  reviewerName(name: string): Locator {
    return this.page.getByText(name);
  }

  /**
   * @param pattern Text or pattern to match in the reviews list or page body.
   * @returns Locator for matching visible text.
   */
  textMatching(pattern: string | RegExp): Locator {
    return this.page.getByText(pattern);
  }

  /**
   * @param stars Whole-star rating from 1 to 5.
   * @returns Locator for the star rating radio control.
   */
  starRating(stars: number): Locator {
    return this.page.getByRole('radio', { name: `${stars} stars` });
  }

  /**
   * @param stars Whole-star rating from 1 to 5.
   * @returns This plant page after the rating is chosen.
   */
  async chooseStarRating(stars: number): Promise<this> {
    await this.starRating(stars).click();
    return this;
  }

  /**
   * @param text Review body (leading and trailing spaces are preserved for fill).
   * @returns This plant page after the textarea is filled.
   */
  async fillReview(text: string): Promise<this> {
    await this.yourReview.fill(text);
    return this;
  }

  /** @returns This plant page after the review form is submitted. */
  async submitReview(): Promise<this> {
    await this.postReviewButton.click();
    return this;
  }

  /** @returns This plant page after add to cart is clicked. */
  async addToCart(): Promise<this> {
    await this.addToCartButton.click();
    return this;
  }
}
