import type { Locator, Page } from '@playwright/test';

export class SignInPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly signInButton: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
  }

  /** @returns This sign-in page after navigation. */
  async goto(): Promise<this> {
    await this.page.goto('/login');
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
   * @param email Account email.
   * @param password Account password.
   * @returns Resolves when the sign-in form has been submitted.
   */
  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.signInButton.click();
  }
}
