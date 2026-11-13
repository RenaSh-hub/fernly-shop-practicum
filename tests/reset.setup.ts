import { expect, test as setup } from '@playwright/test';

setup('reset seed data', async ({ request }) => {
  const res = await request.post('/api/admin/reset');
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toEqual({ status: 'reset' });
});
