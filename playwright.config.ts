import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Define the base URL. Use process.env.NEXTAUTH_URL if provided, otherwise default to localhost:3000
const baseURL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: 90 * 1000, // 90-second overall test timeout
  testDir: './tests', // Look for tests in the 'tests' directory
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 20 * 1000, // 20-second expect timeout
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup projects for authentication
    {
      name: 'setup-organizer',
      testMatch: /auth\.setup\.ts/,
      use: { baseURL },
    },
    {
      name: 'setup-admin',
      testMatch: /admin\.auth\.setup\.ts/,
      use: { baseURL },
    },
    {
      name: 'setup-user',
      testMatch: /user\.auth\.setup\.ts/,
      use: { baseURL },
    },

    // Project for tests that need an ORGANIZER role
    {
      name: 'organizer',
      testDir: 'tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/organizer.json',
        baseURL,
      },
      dependencies: ['setup-organizer'],
    },

    // Project for tests that need an ADMIN role
    {
      name: 'admin',
      testDir: 'tests/admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
        baseURL,
      },
      dependencies: ['setup-admin', 'setup-user'],
    },
  ],

  /* Optional: Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Increase timeout for server start
    env: {
      E2E_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL!,
      E2E_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD!,
      E2E_ORGANIZER_EMAIL: process.env.E2E_ORGANIZER_EMAIL!,
      E2E_ORGANIZER_PASSWORD: process.env.E2E_ORGANIZER_PASSWORD!,
      E2E_USER_EMAIL: process.env.E2E_USER_EMAIL!,
      E2E_USER_PASSWORD: process.env.E2E_USER_PASSWORD!,
    }
  },
}); 