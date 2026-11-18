import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

export type ToolName = 'search_plants' | 'open_plant' | 'add_to_cart' | 'care_tip';

const firstCustomer = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';

export interface RecordedCall {
  name: ToolName;
  args: Record<string, unknown>;
  source: 'model' | 'direct';
  at: string;
}

/** Reset seed data and sign in the first customer with a stored token. */
export async function freshCustomer(page: Page, request: APIRequestContext): Promise<void> {
  const reset = await request.post(`${apiUrl}/api/admin/reset`);
  expect(reset.ok()).toBeTruthy();

  const loginRes = await request.post(`${apiUrl}/api/auth/login`, {
    data: { email: firstCustomer.email, password: firstCustomer.password },
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = (await loginRes.json()) as { token: string };

  await page.goto('/');
  await page.evaluate((saved) => localStorage.setItem('fernly_token', saved), token);
  await page.reload();
  await expect(page.getByText('Hi, Ava')).toBeVisible();
}

export class HelperPage {
  readonly messageLog: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly toggleButton: Locator;

  constructor(private readonly page: Page) {
    this.messageLog = page.getByRole('log');
    this.messageInput = page.getByLabel('Message the helper');
    this.sendButton = page.getByRole('button', { name: 'Send' });
    this.toggleButton = page.getByRole('button', { name: /Ask Fernly|Close helper/ });
  }

  /** Open the shop and helper panel; clear recorded tool calls. */
  async open(): Promise<void> {
    await this.page.goto('/');
    if ((await this.toggleButton.getAttribute('aria-expanded')) !== 'true') {
      await this.toggleButton.click();
    }
    await expect(this.page.locator('#fernly-helper')).toBeVisible();
    await this.page.evaluate(() => window.__fernlyHelper?.clear());
  }

  /** Type a phrase, send, and wait until the helper finishes replying. */
  async ask(phrase: string): Promise<void> {
    await this.messageInput.fill(phrase);
    await this.sendButton.click();
    await expect(this.messageLog).toHaveAttribute('aria-busy', 'false');
    await expect(this.messageLog.locator('li').nth(1)).toBeVisible();
  }

  async run(tool: ToolName, args: Record<string, unknown>): Promise<void> {
    await this.page.evaluate(
      async ({ name, toolArgs }) => {
        if (!window.__fernlyHelper) throw new Error('window.__fernlyHelper is not available');
        await window.__fernlyHelper.run(name as ToolName, toolArgs);
      },
      { name: tool, toolArgs: args },
    );
    if (tool === 'add_to_cart') {
      await expect(this.cartLink()).toContainText(/\d+/, { timeout: 15_000 }).catch(() => undefined);
    } else {
      await this.page.waitForTimeout(300);
    }
  }

  async lastModelCall(): Promise<RecordedCall | undefined> {
    return this.page.evaluate(() => {
      const calls = window.__fernlyHelper?.calls ?? [];
      for (let index = calls.length - 1; index >= 0; index -= 1) {
        const call = calls[index];
        if (call.source === 'model') return call as RecordedCall;
      }
      return undefined;
    });
  }

  async calls(): Promise<RecordedCall[]> {
    return this.page.evaluate(() => [...(window.__fernlyHelper?.calls ?? [])] as RecordedCall[]);
  }

  async chatText(): Promise<string> {
    return this.messageLog.innerText();
  }

  cartLink(): Locator {
    return this.page.getByRole('link', { name: /Cart/ });
  }
}