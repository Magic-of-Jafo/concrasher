import { test as setup, expect } from '@playwright/test';

const adminUser = process.env.E2E_ADMIN_EMAIL!;
const adminPassword = process.env.E2E_ADMIN_PASSWORD!;
const authFile = '.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
    if (!adminUser || !adminPassword) {
        throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD environment variables must be set.');
    }

    await page.goto('/login');
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible({ timeout: 15000 });

    await page.getByLabel('Email').fill(adminUser);
    await page.getByLabel('Password').fill(adminPassword);

    await page.getByRole('button', { name: 'Login' }).click();

    // After a successful login, the user is redirected to the /conventions page.
    // We will wait for this navigation to complete as our success condition.
    await page.waitForURL('**/conventions', { timeout: 15000 });

    await page.context().storageState({ path: authFile });
}); 