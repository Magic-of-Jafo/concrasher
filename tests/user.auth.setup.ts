import { test as setup, expect } from '@playwright/test';

const regularUser = process.env.E2E_USER_EMAIL!;
const regularPassword = process.env.E2E_USER_PASSWORD!;
const authFile = '.auth/user.json';

setup('authenticate as plain user', async ({ page }) => {
    // Ensure environment variables are set
    if (!regularUser || !regularPassword) {
        throw new Error('E2E_USER_EMAIL and E2E_USER_PASSWORD environment variables must be set.');
    }

    // Navigate to the login page.
    await page.goto('/login');
    await page.reload();

    // Wait for a known element on the login page to be visible.
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible({ timeout: 15000 });

    // Fill in the login form
    await page.getByLabel('Email').fill(regularUser);
    await page.getByLabel('Password').fill(regularPassword);

    // Click the login button and wait for the navigation to complete.
    await Promise.all([
        page.waitForURL('**/conventions'),
        page.getByRole('button', { name: 'Login' }).click(),
    ]);

    // Save the authentication state to the specified file.
    await page.context().storageState({ path: authFile });
}); 