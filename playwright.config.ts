import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  retries: 1,
  fullyParallel: false,
  use: {
    baseURL: 'https://pokemon-serch-pi.vercel.app',
    trace: 'on-first-retry',
  },
});
