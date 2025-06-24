import { test, expect } from "@playwright/test";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// A placeholder for the actual ID of a convention in your test database.
const TEST_CONVENTION_ID = "cmash9ood003reirghnb26oht"; // Replace with a real ID
// The title of an event that you know exists for the above convention.
const TEST_EVENT_TITLE = "Test Event For Fee Tiers"; // Use a more unique name
let testEventId: string;

// Use test.only to focus on this test suite
test.describe.only("Schedule Editor Fee Tiers", () => {

    // Before all tests, ensure the test event exists
    test.beforeAll(async () => {
        // Find the default schedule day for the convention
        const scheduleDay = await prisma.scheduleDay.findFirst({
            where: { conventionId: TEST_CONVENTION_ID, dayOffset: 0 },
            select: { id: true }
        });

        if (!scheduleDay) {
            throw new Error(`Could not find a schedule day for convention ${TEST_CONVENTION_ID}`);
        }

        // Find or create the test event
        let testEvent = await prisma.conventionScheduleItem.findFirst({
            where: {
                conventionId: TEST_CONVENTION_ID,
                title: TEST_EVENT_TITLE,
            }
        });

        if (!testEvent) {
            testEvent = await prisma.conventionScheduleItem.create({
                data: {
                    conventionId: TEST_CONVENTION_ID,
                    scheduleDayId: scheduleDay.id,
                    title: TEST_EVENT_TITLE,
                    description: "An event for E2E testing fee tiers.",
                    eventType: 'WORKSHOP',
                    durationMinutes: 15,
                    atPrimaryVenue: true,
                }
            });
        }
        testEventId = testEvent.id;
        console.log(`Created/found test event with ID: ${testEventId}`);
    });

    // After all tests, clean up the created event
    test.afterAll(async () => {
        if (testEventId) {
            // Also delete any fee tiers associated with the event
            await prisma.scheduleEventFeeTier.deleteMany({ where: { scheduleItemId: testEventId } });
            await prisma.conventionScheduleItem.delete({ where: { id: testEventId } });
        }
        await prisma.$disconnect();
    });

    test.beforeEach(async ({ page }) => {
        // Listen for any console errors, which might indicate why the save is failing.
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`Browser console error: ${msg.text()}`);
            }
        });

        // Navigate to the schedule editor for our test convention before each test.
        await page.goto(`/organizer/conventions/${TEST_CONVENTION_ID}/edit`);
        // Click the "Schedule" tab to make sure we are on the right view.
        await page.getByRole('tab', { name: 'Schedule' }).click();
    });

    test("should allow adding, editing, and deleting fee tiers for an event", async ({ page }) => {
        // After clicking the 'Schedule' tab, the event list is fetched.
        // We must wait for the list to be populated before we can interact with it.
        // A good signal is to wait for the first item with a `data-event-id` to be visible.
        await expect(page.locator('div[data-event-id]').first()).toBeVisible({ timeout: 15000 });

        // 1. Now that we know the list is loaded, find our specific test event by its title and click it.
        const eventSelector = page.getByText(TEST_EVENT_TITLE, { exact: true });

        // Wait for our specific event to be visible and then click it.
        await expect(eventSelector).toBeVisible({ timeout: 5000 }); // Should be quick now
        await eventSelector.click();

        // Wait for the form dialog to appear.
        await expect(page.getByRole('dialog', { name: 'Edit Event Details' })).toBeVisible();

        // 2. Enable fee tiers.
        await page.getByLabel('No additional fees for this event').uncheck();

        // 3. Add the first fee tier.
        await page.getByLabel('Fee Tier Label').first().fill('Standard Admission');
        await page.getByLabel('Amount').first().fill('25');

        // 4. Add a second fee tier.
        await page.getByRole('button', { name: 'Add tier' }).click();
        await page.getByLabel('Fee Tier Label').last().fill('VIP Pass');
        await page.getByLabel('Amount').last().fill('75');

        // Move mouse to the dialog title to dismiss any stray tooltips
        await page.getByRole('heading', { name: 'Edit Event Details' }).hover();

        // 5. Save the changes.
        await page.getByRole('button', { name: 'Save Changes' }).click();

        // 6. Verify success notification.
        await expect(page.getByText('Event saved successfully!')).toBeVisible();

        // 7. Re-open the same event to verify the data was saved.
        await page.getByText(TEST_EVENT_TITLE, { exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Edit Event Details' })).toBeVisible();

        // Check that the fee tiers are present with the correct values.
        await expect(page.getByLabel('Fee Tier Label').first()).toHaveValue('Standard Admission');
        await expect(page.getByLabel('Amount').first()).toHaveValue('25');
        await expect(page.getByLabel('Fee Tier Label').last()).toHaveValue('VIP Pass');
        await expect(page.getByLabel('Amount').last()).toHaveValue('75');

        // 8. Edit one tier and delete the other.
        await page.getByLabel('Amount').last().fill('80'); // Edit VIP price
        await page.getByRole('button', { name: 'Remove tier' }).first().click(); // Delete Standard tier

        // Move mouse to the dialog title to dismiss any stray tooltips
        await page.getByRole('heading', { name: 'Edit Event Details' }).hover();

        // 9. Save the changes again.
        await page.getByRole('button', { name: 'Save Changes' }).click();
        await expect(page.getByText('Event saved successfully!')).toBeVisible();

        // 10. Re-open and verify the final state.
        await page.getByText(TEST_EVENT_TITLE, { exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Edit Event Details' })).toBeVisible();

        // There should now only be one fee tier input group.
        await expect(page.getByLabel('Fee Tier Label')).toHaveCount(1);
        await expect(page.getByLabel('Fee Tier Label')).toHaveValue('VIP Pass');
        await expect(page.getByLabel('Amount')).toHaveValue('80');

        // 11. Clean up: Remove all existing tiers first
        const removeButtons = await page.getByRole('button', { name: 'Remove tier' }).all();
        for (const button of removeButtons) {
            await button.click();
        }

        // Now toggle back to "No additional fees".
        await page.getByLabel('No additional fees for this event').check();
        
        // Move mouse to the dialog title to dismiss any stray tooltips
        await page.getByRole('heading', { name: 'Edit Event Details' }).hover();

        await page.getByRole('button', { name: 'Save Changes' }).click();
        await expect(page.getByText('Event saved successfully!')).toBeVisible();
    });
}); 