import { test, expect, type APIRequestContext } from '@playwright/test';
import { expectSchema } from '../helpers/schema.js';

const AVA = { email: 'ava@fernly.test', password: 'Fernly-Ava-2026', name: 'Ava Green' };
const BEN = { email: 'ben@fernly.test', password: 'Fernly-Ben-2026', name: 'Ben Moss' };

async function login(request: APIRequestContext, credentials: { email: string; password: string }) {
  const res = await request.post('/api/auth/login', { data: credentials });
  expect(res.ok(), `login ${credentials.email}`).toBeTruthy();
  const body = (await res.json()) as { token: string };
  return body.token;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Clears this author's review on a plant so retries do not hit already_reviewed. */
async function clearOwnReview(
  request: APIRequestContext,
  token: string,
  plantId: string,
  authorName: string,
) {
  const listRes = await request.get(`/api/plants/${plantId}/reviews`);
  if (!listRes.ok()) return;
  const list = (await listRes.json()) as { reviews: { id: string; author: string }[] };
  const mine = list.reviews.find((review) => review.author === authorName);
  if (!mine) return;
  await request.delete(`/api/reviews/${mine.id}`, { headers: auth(token) });
}

test.describe('Reviews API', () => {
  test('PR-02: signed-in POST creates a Review; no token 401; unknown plant 404', { tag: '@api' }, async ({ request }) => {
    const token = await login(request, AVA);
    await clearOwnReview(request, token, 'pl-fiddle', AVA.name);

    const createRes = await request.post('/api/plants/pl-fiddle/reviews', {
      headers: auth(token),
      data: { rating: 5, text: 'Bright window and steady care paid off.' },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    await expectSchema(request, created, 'Review');

    const unsigned = await request.post('/api/plants/pl-fiddle/reviews', {
      data: { rating: 4, text: 'Should not accept unsigned review text.' },
    });
    expect(unsigned.status()).toBe(401);
    expect((await unsigned.json()).rule).toBe('auth_required');

    const unknown = await request.post('/api/plants/pl-does-not-exist/reviews', {
      headers: auth(token),
      data: { rating: 4, text: 'Unknown plant should 404 here.' },
    });
    expect(unknown.status()).toBe(404);
  });

  test('PR-04: one review per customer; different plant still allowed', { tag: '@api' }, async ({ request }) => {
    const token = await login(request, AVA);
    await clearOwnReview(request, token, 'pl-peace-lily', AVA.name);
    await clearOwnReview(request, token, 'pl-calathea', AVA.name);

    const first = await request.post('/api/plants/pl-peace-lily/reviews', {
      headers: auth(token),
      data: { rating: 4, text: 'Droops when thirsty then bounces back.' },
    });
    expect(first.status()).toBe(201);

    const second = await request.post('/api/plants/pl-peace-lily/reviews', {
      headers: auth(token),
      data: { rating: 5, text: 'Trying to leave a second review wrongly.' },
    });
    expect(second.status()).toBe(409);
    expect((await second.json()).rule).toBe('already_reviewed');

    const otherPlant = await request.post('/api/plants/pl-calathea/reviews', {
      headers: auth(token),
      data: { rating: 3, text: 'Needs humidity but the stripes are lovely.' },
    });
    expect(otherPlant.status()).toBe(201);
  });

  test('PR-05: GET reviews newest first, count, average; unknown 404; empty 0; 5+4+5 → 4.7', { tag: '@api' }, async ({ request }) => {
    const snake = await request.get('/api/plants/pl-snake/reviews');
    expect(snake.ok()).toBeTruthy();
    const snakeBody = await snake.json();
    await expectSchema(request, snakeBody, 'ReviewList');
    expect(snakeBody.count).toBeGreaterThanOrEqual(3);
    expect(snakeBody.reviews.length).toBe(snakeBody.count);
    for (let i = 0; i < snakeBody.reviews.length - 1; i += 1) {
      expect(
        snakeBody.reviews[i].createdAt >= snakeBody.reviews[i + 1].createdAt,
        `reviews[${i}] should be newer than reviews[${i + 1}]`,
      ).toBeTruthy();
    }
    // Feature oracle: halves round up — seed ratings 5, 4 and 5 → 4.7
    expect(snakeBody.count).toBe(3);
    expect.soft(snakeBody.average, 'average for 5+4+5 must be 4.7 per plant-reviews.md').toBe(4.7);

    const unknown = await request.get('/api/plants/pl-does-not-exist/reviews');
    expect(unknown.status()).toBe(404);

    const empty = await request.get('/api/plants/pl-aloe/reviews');
    expect(empty.ok()).toBeTruthy();
    const emptyBody = await empty.json();
    await expectSchema(request, emptyBody, 'ReviewList');
    expect(emptyBody.count).toBe(0);
    expect(emptyBody.reviews).toEqual([]);
    expect(emptyBody.average).toBe(0);
  });

  test('PR-06: POST validation boundaries for rating and text', { tag: '@api' }, async ({ request }) => {
    const ava = await login(request, AVA);
    await clearOwnReview(request, ava, 'pl-spider', AVA.name);

    const rating1 = await request.post('/api/plants/pl-spider/reviews', {
      headers: auth(ava),
      data: { rating: 1, text: '1234567890' },
    });
    expect(rating1.status()).toBe(201);

    const ben = await login(request, BEN);
    await clearOwnReview(request, ben, 'pl-boston-fern', BEN.name);

    const rating5 = await request.post('/api/plants/pl-boston-fern/reviews', {
      headers: auth(ben),
      data: { rating: 5, text: 'x'.repeat(500) },
    });
    expect(rating5.status()).toBe(201);

    const cases: { label: string; body: unknown }[] = [
      { label: 'rating 0', body: { rating: 0, text: 'Long enough review text.' } },
      { label: 'rating 6', body: { rating: 6, text: 'Long enough review text.' } },
      { label: 'rating fraction', body: { rating: 3.5, text: 'Long enough review text.' } },
      { label: 'text too short', body: { rating: 3, text: 'too short' } },
      { label: 'text too long', body: { rating: 3, text: 'x'.repeat(501) } },
      { label: 'whitespace only', body: { rating: 3, text: '          ' } },
    ];

    for (const c of cases) {
      const res = await request.post('/api/plants/pl-rubber/reviews', {
        headers: auth(ben),
        data: c.body,
      });
      expect(res.status(), c.label).toBe(400);
      expect((await res.json()).rule, c.label).toBe('validation_error');
    }
  });

  test('PR-01: DELETE author-only; unsigned 401; unknown 404', { tag: '@api' }, async ({ request }) => {
    const ava = await login(request, AVA);
    const ben = await login(request, BEN);
    await clearOwnReview(request, ava, 'pl-zz', AVA.name);
    await clearOwnReview(request, ava, 'pl-pearls', AVA.name);

    const create = await request.post('/api/plants/pl-zz/reviews', {
      headers: auth(ava),
      data: { rating: 5, text: 'Glossy leaves that forgive neglect well.' },
    });
    expect(create.status()).toBe(201);
    const mine = (await create.json()) as { id: string };

    const deleted = await request.delete(`/api/reviews/${mine.id}`, { headers: auth(ava) });
    expect(deleted.status()).toBe(204);

    const listAfter = await request.get('/api/plants/pl-zz/reviews');
    expect(listAfter.ok()).toBeTruthy();
    const listBody = (await listAfter.json()) as { reviews: { id: string }[] };
    expect(listBody.reviews.find((r) => r.id === mine.id)).toBeUndefined();

    // Ava's review on another plant — Ben (non-author) must get 404 and leave it in place
    const createOther = await request.post('/api/plants/pl-pearls/reviews', {
      headers: auth(ava),
      data: { rating: 4, text: 'Beads on trailing strands, needs bright light.' },
    });
    expect(createOther.status()).toBe(201);
    const avaReview = (await createOther.json()) as { id: string };

    const other = await request.delete(`/api/reviews/${avaReview.id}`, { headers: auth(ben) });
    expect.soft(other.status(), 'non-author must get Review not found').toBe(404);
    if (other.status() !== 204) {
      const otherBody = await other.json();
      expect.soft(String(otherBody.detail).toLowerCase()).toMatch(/not found/);
    }

    const stillThere = await request.get('/api/plants/pl-pearls/reviews');
    const stillBody = (await stillThere.json()) as { reviews: { id: string }[] };
    expect.soft(
      stillBody.reviews.some((r) => r.id === avaReview.id),
      'author review must remain after non-author delete attempt',
    ).toBeTruthy();

    const unsigned = await request.delete(`/api/reviews/${avaReview.id}`);
    expect(unsigned.status()).toBe(401);
    expect((await unsigned.json()).rule).toBe('auth_required');

    const unknown = await request.delete('/api/reviews/rv-does-not-exist', { headers: auth(ben) });
    expect(unknown.status()).toBe(404);
  });
});

