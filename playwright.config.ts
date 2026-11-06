import { config as loadDotenv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.join(__dirname, '.env') });

const apiUrl = process.env.API_URL ?? 'http://localhost:8100';
const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  tsconfig: './tsconfig.playwright.json',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run start:api',
      url: `${apiUrl}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: 'npm run start:web',
      url: webUrl,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'setup',
      testMatch: /reset\.setup\.ts/,
      use: { baseURL: apiUrl },
    },
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { baseURL: apiUrl },
    },
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { baseURL: webUrl },
    },
    {
      name: 'a11y',
      testDir: './tests/a11y',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { baseURL: webUrl },
    },
  ],
});
