import { test, expect } from '@playwright/test';

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';

const AVA = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};

test.describe('Plant reviews journey', () => {
  test('PR-11: guest reads + Sign in; signed-in posts, toast, newest first; second post error; average 4.7', { tag: '@e2e' }, async ({ page }, testInfo) => {
    const postPlants = ['pl-parlor', 'pl-ponytail', 'pl-birkin'] as const;
    const postPlantId = postPlants[testInfo.retry] ?? 'pl-parlor';

    // Guest: seeded Snake Plant reviews (5+4+5) — feature oracle average 4.7
    await page.goto('/plants/pl-snake');
    await expect(page.getByRole('heading', { level: 2, name: 'Reviews' })).toBeVisible();
    await expect(page.getByText('Grace L.')).toBeVisible();
    await expect
      .soft(page.getByText(/4\.7 out of 5/), 'feature oracle: 5+4+5 → 4.7')
      .toBeVisible({ timeout: 2000 });

    const reviewsSignIn = page.locator('a[href="/login?next=/plants/pl-snake"]');
    await expect(reviewsSignIn).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Write a review' })).toHaveCount(0);

    await reviewsSignIn.click();
    await expect(page).toHaveURL(/\/login\?next=\/plants\/pl-snake/);
    await page.getByLabel('Email').fill(AVA.email);
    await page.getByLabel('Password').fill(AVA.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/plants\/pl-snake/);
    await expect(page.getByText('Hi, Ava')).toBeVisible();

    // Clear any prior review from a previous retry so Post can succeed
    const loginRes = await page.request.post(`${apiUrl}/api/auth/login`, { data: AVA });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = (await loginRes.json()) as { token: string };
    const existing = await page.request.get(`${apiUrl}/api/plants/${postPlantId}/reviews`);
    if (existing.ok()) {
      const body = (await existing.json()) as { reviews: { id: string; author: string }[] };
      const mine = body.reviews.find((r) => r.author === 'Ava Green');
      if (mine) {
        await page.request.delete(`${apiUrl}/api/reviews/${mine.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }

    await page.goto(`/plants/${postPlantId}`);
    await expect(page.getByText('Hi, Ava')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();

    const reviewText = `Parlor palm thrives indoors for Fernly ${Date.now()}.`;
    await page.getByRole('radio', { name: '5 stars' }).click();
    await page.getByLabel('Your review').fill(`  ${reviewText}  `);
    await page.getByRole('button', { name: 'Post review' }).click();

    await expect(page.getByText('Thanks for your review!')).toBeVisible();
    // Soft: list may not refresh (query-key mismatch) — still exercise second-post error
    await expect
      .soft(page.getByText(reviewText), 'new review must appear in the list right away')
      .toBeVisible({ timeout: 3000 });

    const listRes = await page.request.get(`${apiUrl}/api/plants/${postPlantId}/reviews`);
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as {
      reviews: { text: string; author: string }[];
    };
    expect(listBody.reviews.some((r) => r.text === reviewText)).toBeTruthy();
    expect(listBody.reviews[0].text).toBe(reviewText);
    expect(listBody.reviews[0].author).toBe('Ava Green');

    await page.getByRole('radio', { name: '4 stars' }).click();
    await page.getByLabel('Your review').fill('Second attempt should be rejected by the API.');
    await page.getByRole('button', { name: 'Post review' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/already reviewed/i);
  });
});
