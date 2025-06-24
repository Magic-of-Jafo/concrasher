import { test as setup, expect } from '@playwright/test';

const organizerUser = process.env.E2E_ORGANIZER_EMAIL!;
const organizerPassword = process.env.E2E_ORGANIZER_PASSWORD!;
const authFile = '.auth/organizer.json';

setup('authenticate as organizer', async ({ page }) => {
    // Ensure environment variables are set
    if (!organizerUser || !organizerPassword) {
        throw new Error('E2E_ORGANIZER_EMAIL and E2E_ORGANIZER_PASSWORD environment variables must be set.');
    }

    // Navigate to the login page.
    await page.goto('/login');
    // Add a hard reload to be safe.
    await page.reload();

    // Wait for a known element on the login page to be visible.
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible({ timeout: 15000 });

    // Fill in the login form
    await page.getByLabel('Email').fill(organizerUser);
    await page.getByLabel('Password').fill(organizerPassword);

    // Click the login button and wait for the navigation to complete.
    // The login action triggers a navigation to the /conventions page.
    await Promise.all([
        page.waitForURL('**/conventions'),
        page.getByRole('button', { name: 'Login' }).click(),
    ]);

    // After a successful login, the user is redirected to the /conventions page.
    // The waitForURL call above already confirmed this, so we are good to proceed.

    // Save the authentication state to the specified file.
    await page.context().storageState({ path: authFile });
}); 