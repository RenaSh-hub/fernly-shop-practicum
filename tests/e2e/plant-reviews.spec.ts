import { test, expect } from '@playwright/test';
import { PlantPage } from '../pages/PlantPage.js';
import { SignInPage } from '../pages/SignInPage.js';

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';

const AVA = {
  email: process.env.FERNLY_USER_EMAIL ?? 'ava@fernly.test',
  password: process.env.FERNLY_USER_PASSWORD ?? 'Fernly-Ava-2026',
};

test.describe('Plant reviews journey', () => {
  test('PR-11: guest reads + Sign in; signed-in posts, toast, newest first; second post error; average 4.7', { tag: '@e2e' }, async ({ page }, testInfo) => {
    const postPlants = ['pl-parlor', 'pl-ponytail', 'pl-birkin'] as const;
    const postPlantId = postPlants[testInfo.retry] ?? 'pl-parlor';

    const plant = new PlantPage(page);

    // Guest: seeded Snake Plant reviews (5+4+5) — feature oracle average 4.7
    await plant.goto('pl-snake');
    await expect(plant.reviewsHeading).toBeVisible();
    await expect(plant.reviewerName('Grace L.')).toBeVisible();
    await expect
      .soft(plant.textMatching(/4\.7 out of 5/), 'feature oracle: 5+4+5 → 4.7')
      .toBeVisible({ timeout: 2000 });

    await expect(plant.reviewsSignInLink).toBeVisible();
    await expect(plant.writeReviewHeading).toHaveCount(0);

    await plant.reviewsSignInLink.click();
    await expect(page).toHaveURL(/\/login\?next=\/plants\/pl-snake/);
    const signIn = new SignInPage(page);
    await signIn.signIn(AVA.email, AVA.password);
    await expect(page).toHaveURL(/\/plants\/pl-snake/);
    await expect(plant.signedInGreeting('Ava')).toBeVisible();

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

    await plant.goto(postPlantId);
    await expect(plant.signedInGreeting('Ava')).toBeVisible();
    await expect(plant.writeReviewHeading).toBeVisible();

    const reviewText = `Parlor palm thrives indoors for Fernly ${Date.now()}.`;
    await plant.chooseStarRating(5);
    await plant.fillReview(`  ${reviewText}  `);
    await plant.submitReview();

    await expect(plant.thanksForReviewToast).toBeVisible();
    // Soft: list may not refresh (query-key mismatch) — still exercise second-post error
    await expect
      .soft(plant.textMatching(reviewText), 'new review must appear in the list right away')
      .toBeVisible({ timeout: 3000 });

    const listRes = await page.request.get(`${apiUrl}/api/plants/${postPlantId}/reviews`);
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as {
      reviews: { text: string; author: string }[];
    };
    expect(listBody.reviews.some((r) => r.text === reviewText)).toBeTruthy();
    expect(listBody.reviews[0].text).toBe(reviewText);
    expect(listBody.reviews[0].author).toBe('Ava Green');

    await plant.chooseStarRating(4);
    await plant.fillReview('Second attempt should be rejected by the API.');
    await plant.submitReview();
    await expect(plant.formAlert).toBeVisible();
    await expect(plant.formAlert).toContainText(/already reviewed/i);
  });
});
