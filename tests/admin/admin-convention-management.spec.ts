import { test, expect } from '@playwright/test';

test.describe('Admin Convention Management', () => {

    // Test Case 1: Admin can view all conventions
    test('should allow an admin to view all conventions', async ({ page }) => {
        // Use admin authentication state
        await page.goto('/admin/conventions');

        // Verify the page title
        await expect(page).toHaveTitle(/Conventions/);

        // Verify the main heading is visible
        await expect(page.locator('h4:text("Manage Conventions")')).toBeVisible();

        // Verify the table header is rendered
        await expect(page.locator('th:text("Convention")')).toBeVisible();
    });

    // Test Case 2: Admin can edit a convention
    test('should allow an admin to edit a convention', async ({ page }) => {
        await page.goto('/admin/conventions');

        // Click the edit button on the first convention in the list
        await page.locator('tbody tr:first-child [aria-label="edit"]').click();

        // Wait for the navigation to the edit page and verify the URL
        await expect(page).toHaveURL(/\/organizer\/conventions\/.*\/edit/);
        await expect(page.locator('h4:text("Edit Convention")')).toBeVisible();

        // Modify the convention name
        const nameInput = page.locator('input[name="name"]');
        const originalName = await nameInput.inputValue();
        const updatedName = `${originalName} (Edited by Admin)`;
        await nameInput.fill(updatedName);

        // Click the save button
        await page.locator('button:text("Save Changes")').click();

        // Wait for navigation back to the admin list and verify the redirect
        await expect(page).toHaveURL('/admin/conventions');

        // Verify the updated name is visible in the list
        await expect(page.locator(`text=${updatedName}`)).toBeVisible();
    });

    // Test Case 3: Admin can delete a convention
    test('should allow an admin to delete a convention', async ({ page }) => {
        await page.goto('/admin/conventions');

        // Get the name of the first convention to verify its deletion later
        const firstRow = page.locator('tbody tr:first-child');
        const conventionName = await firstRow.locator('td:first-child').textContent();
        expect(conventionName).not.toBeNull();

        // Click the delete icon, which reveals the confirmation button
        await firstRow.locator('[aria-label="delete"]').click();

        // Click the 'DELETE' confirmation button that appears in the row
        await firstRow.locator('button:text("DELETE")').click();

        // A confirmation modal should now be visible. Click the final confirm button.
        await expect(page.locator('h2:text("Confirm Deletion")')).toBeVisible();
        await page.locator('button:text("Confirm")').click();

        // Verify the convention is no longer visible in the table
        await expect(page.locator(`text=${conventionName}`)).not.toBeVisible();
    });
}); 