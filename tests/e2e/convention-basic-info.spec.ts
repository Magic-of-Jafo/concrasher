import { test, expect, Page } from '@playwright/test';

const NEW_CONVENTION_URL = '/organizer/conventions/new';

// Helper to create a test convention via API
async function createTestConvention(page: Page) {
  const response = await page.request.post('/api/organizer/conventions', {
    data: {
      name: `Test Convention ${Date.now()}`,
      city: 'Test City',
      state: 'Test State',
      country: 'United States',
      descriptionShort: 'Test short description',
      descriptionMain: 'Test main description',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    }
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.id;
}

// Helper to clean up test data
async function cleanupTestConvention(page: Page, conventionId: string) {
  await page.request.delete(`/api/organizer/conventions/${conventionId}`);
}

test.describe('Convention Creation - Basic Info Tab', () => {
  let testConventionId: string;

  test.afterEach(async ({ page }) => {
    if (testConventionId) {
      await cleanupTestConvention(page, testConventionId);
    }
  });

  test('should allow an organizer to fill out the Basic Info tab and create a new convention', async ({ page }) => {
    // --- Step 1: Series Selection ---
    await page.goto(NEW_CONVENTION_URL);
    await expect(page.getByText('Link or Create Convention Series')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /select existing series/i }).first().click();

    // --- Step 2: Fill Basic Info Tab ---
    const conventionName = `E2E Test Convention ${Date.now()}`;
    await page.getByLabel(/convention name/i).fill(conventionName);

    // Dates
    const tbdSwitch = page.getByLabel(/dates to be determined/i);
    if (await tbdSwitch.isChecked()) {
      await tbdSwitch.click();
    }
    await expect(tbdSwitch).not.toBeChecked();

    await page.getByLabel(/start date/i).click();
    await page.getByRole('button', { name: '15' }).first().click();

    await page.getByLabel(/end date/i).click();
    await page.getByRole('button', { name: '17' }).first().click();

    // Location
    await page.getByLabel(/city/i).fill('E2E City');
    await page.getByLabel(/state/i).fill('California');

    // Descriptions
    await page.getByLabel(/short description/i).fill('This is a short E2E test description.');
    const editorFrame = page.frameLocator('iframe[id^="tox-edit-area__iframe"]');
    await editorFrame.locator('body#tinymce').fill('This is the main E2E test description.');

    // --- Step 3: Submit the Form ---
    await page.getByRole('button', { name: 'Save Convention' }).click();

    // --- Step 4: Verification ---
    await expect(page).toHaveURL(/.*\/organizer\/conventions/, { timeout: 15000 });
  });

  test('should allow editing an existing convention\'s basic info', async ({ page }) => {
    // --- Step 1: Create test convention ---
    testConventionId = await createTestConvention(page);

    // --- Step 2: Navigate to Edit Page ---
    await page.goto(`/organizer/conventions/${testConventionId}/edit`);

    // Wait for the editor to load
    await expect(page.getByRole('heading', { name: /edit convention/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/convention name/i)).toBeVisible();

    // --- Step 3: Modify Basic Info ---
    const updatedName = `Updated E2E Test Convention ${Date.now()}`;
    await page.getByLabel(/convention name/i).fill(updatedName);

    // Update dates
    await page.getByLabel(/start date/i).click();
    await page.getByRole('button', { name: '20' }).first().click();

    await page.getByLabel(/end date/i).click();
    await page.getByRole('button', { name: '22' }).first().click();

    // Update location
    await page.getByLabel(/city/i).fill('Updated E2E City');
    await page.getByLabel(/state/i).fill('New York');

    // Update descriptions
    await page.getByLabel(/short description/i).fill('Updated short E2E test description.');
    const editorFrame = page.frameLocator('iframe[id^="tox-edit-area__iframe"]');
    await editorFrame.locator('body#tinymce').fill('Updated main E2E test description.');

    // --- Step 4: Save Changes ---
    await page.getByRole('button', { name: 'Save Convention' }).click();

    // --- Step 5: Verify Changes ---
    await expect(page).toHaveURL(/.*\/organizer\/conventions/, { timeout: 15000 });
  });

  test('should handle form validation correctly', async ({ page }) => {
    await page.goto(NEW_CONVENTION_URL);
    await expect(page.getByText('Link or Create Convention Series')).toBeVisible({ timeout: 10000 });

    // --- Step 1: Try to submit without required fields ---
    await page.getByRole('button', { name: 'Save Convention' }).click();

    // Verify validation messages
    await expect(page.getByText(/convention name is required/i)).toBeVisible();
    await expect(page.getByText(/city is required/i)).toBeVisible();
    await expect(page.getByText(/state is required/i)).toBeVisible();

    // --- Step 2: Test date logic ---
    // Toggle TBD
    const tbdSwitch = page.getByLabel(/dates to be determined/i);
    await tbdSwitch.click();
    await expect(tbdSwitch).toBeChecked();

    // Date fields should be disabled
    await expect(page.getByLabel(/start date/i)).toBeDisabled();
    await expect(page.getByLabel(/end date/i)).toBeDisabled();

    // Toggle One-Day Event
    const oneDaySwitch = page.getByLabel(/one-day event/i);
    await oneDaySwitch.click();
    await expect(oneDaySwitch).toBeChecked();

    // End date should be disabled
    await expect(page.getByLabel(/end date/i)).toBeDisabled();
  });
}); 