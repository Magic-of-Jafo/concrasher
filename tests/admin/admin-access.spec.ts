import { test, expect, Browser } from '@playwright/test';

// Test suite for admin-only page access
test.describe('Admin access security', () => {

    test('should prevent non-admin users from accessing the admin dashboard', async ({ browser }) => {
        // Create a new context with the non-admin user's authentication state
        const userContext = await browser.newContext({ storageState: '.auth/user.json' });
        const page = await userContext.newPage();

        // Attempt to navigate to the admin dashboard
        const response = await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });

        // Assert that the user is redirected to the unauthorized page
        expect(page.url()).toContain('/unauthorized');
        // Assert that the response status is OK (as it's a client-side redirect)
        expect(response?.status()).toBe(200);
        // Assert that the unauthorized message is visible
        await expect(page.getByText('You do not have permission to access this page')).toBeVisible();

        await userContext.close();
    });

    test('should prevent non-admin users from accessing the admin conventions management page', async ({ browser }) => {
        // Create a new context with the non-admin user's authentication state
        const userContext = await browser.newContext({ storageState: '.auth/user.json' });
        const page = await userContext.newPage();

        // Attempt to navigate to the admin conventions page
        const response = await page.goto('/admin/conventions', { waitUntil: 'domcontentloaded' });

        // Assert that the user is redirected to the unauthorized page
        expect(page.url()).toContain('/unauthorized');
        // Assert that the response status is OK
        expect(response?.status()).toBe(200);
        // Assert that the unauthorized message is visible
        await expect(page.getByText('You do not have permission to access this page')).toBeVisible();

        await userContext.close();
    });
});

// Test suite for admin functionality
test.describe('Admin functionality', () => {
    // This test runs as an admin user because of the project configuration in playwright.config.ts
    test('should allow admin users to access the admin dashboard', async ({ page }) => {
        // Navigate to the admin dashboard
        await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });

        // Assert that the URL is the admin dashboard
        expect(page.url()).toContain('/admin/dashboard');
        // Assert that the dashboard heading is visible
        await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    });
}); 