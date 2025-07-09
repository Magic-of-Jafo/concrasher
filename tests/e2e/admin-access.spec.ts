import { test, expect } from '@playwright/test';

test.describe('Security - Admin Area Access', () => {
    test('should block non-admin users from accessing the admin conventions page', async ({ page }) => {
        await page.goto('/admin/conventions');

        // Verify the user is redirected by waiting for the heading on the destination page.
        // This is more reliable than checking the URL, which can be subject to race conditions.
        await expect(page.locator('h1:text("Unauthorized")')).toBeVisible();
    });
}); 