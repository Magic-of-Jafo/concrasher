import { test, expect, type Page } from '@playwright/test';
import { PrismaClient, Role, ApplicationStatus, RequestedRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'passwordAdmin123';
const APPLICANT_EMAIL_APPROVE = 'applicant-approve@example.com';
const APPLICANT_PASSWORD_APPROVE = 'passwordApplicantApprove123';
const APPLICANT_EMAIL_REJECT = 'applicant-reject@example.com';
const APPLICANT_PASSWORD_REJECT = 'passwordApplicantReject123';

async function getHashedPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// Test setup: Ensure users and applications exist
test.beforeAll(async () => {
  // Clean up previous test data potentially
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, APPLICANT_EMAIL_APPROVE, APPLICANT_EMAIL_REJECT] } } });
  // We don't explicitly delete RoleApplications as they should cascade or be cleaned by user delete if schema is set up for it.
  // Or, could add: await prisma.roleApplication.deleteMany({ where: { user: { email: { in: [...] } } } });

  const hashedPasswordAdmin = await getHashedPassword(ADMIN_PASSWORD);
  const hashedPasswordApplicantApprove = await getHashedPassword(APPLICANT_PASSWORD_APPROVE);
  const hashedPasswordApplicantReject = await getHashedPassword(APPLICANT_PASSWORD_REJECT);

  // Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: 'E2E Admin',
      hashedPassword: hashedPasswordAdmin,
      roles: [Role.USER, Role.ADMIN],
      emailVerified: new Date(),
    },
  });

  // Create Applicant User for Approval Test
  const applicantUserApprove = await prisma.user.create({
    data: {
      email: APPLICANT_EMAIL_APPROVE,
      name: 'E2E Applicant Approve',
      hashedPassword: hashedPasswordApplicantApprove,
      roles: [Role.USER],
      emailVerified: new Date(),
    },
  });
  await prisma.roleApplication.create({
    data: {
      userId: applicantUserApprove.id,
      requestedRole: RequestedRole.ORGANIZER,
      status: ApplicationStatus.PENDING,
    },
  });

  // Create Applicant User for Rejection Test
  const applicantUserReject = await prisma.user.create({
    data: {
      email: APPLICANT_EMAIL_REJECT,
      name: 'E2E Applicant Reject',
      hashedPassword: hashedPasswordApplicantReject,
      roles: [Role.USER],
      emailVerified: new Date(),
    },
  });
  await prisma.roleApplication.create({
    data: {
      userId: applicantUserReject.id,
      requestedRole: RequestedRole.ORGANIZER,
      status: ApplicationStatus.PENDING,
    },
  });
});

test.afterAll(async () => {
  // Clean up users
  await prisma.user.deleteMany({ 
    where: { email: { in: [ADMIN_EMAIL, APPLICANT_EMAIL_APPROVE, APPLICANT_EMAIL_REJECT] } }
  });
  // Role applications might be cascade deleted if schema is set up for it.
  // Otherwise, explicitly delete them:
  // await prisma.roleApplication.deleteMany({
  //   where: { user: { email: { in: [APPLICANT_EMAIL_APPROVE, APPLICANT_EMAIL_REJECT] } } }
  // });
  await prisma.$disconnect();
});

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation to dashboard or a protected route, indicating successful login
  await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 }); // Adjust if login redirects elsewhere
}

test.describe('Admin Role Application Management', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Login as Admin before each test in this describe block
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/applications'); // Navigate to the applications page
  });

  test('Admin approves an ORGANIZER application', async ({ page }: { page: Page }) => {
    // Find the application for APPLICANT_EMAIL_APPROVE
    // This relies on the list item text containing the email or a unique identifier
    const applicantRowApprove = page.locator(`div[role="listitem"]:has-text("${APPLICANT_EMAIL_APPROVE}")`);
    await expect(applicantRowApprove).toBeVisible();

    // Click Approve button within that row
    await applicantRowApprove.getByRole('button', { name: /approve/i }).click();

    // Verify success message (toast or alert)
    await expect(page.locator('text=/Application approved successfully./i')).toBeVisible();

    // Verify application is removed from the pending list (or list updates)
    // This could mean the row is no longer visible, or a status chip changes
    await expect(applicantRowApprove).not.toBeVisible({ timeout: 5000 }); // Adjust timeout as needed for UI update

    // DB Verification (optional but good for E2E)
    const approvedApplication = await prisma.roleApplication.findFirst({
      where: { user: { email: APPLICANT_EMAIL_APPROVE }, requestedRole: RequestedRole.ORGANIZER },
    });
    expect(approvedApplication?.status).toBe(ApplicationStatus.APPROVED);

    const approvedUser = await prisma.user.findUnique({ where: { email: APPLICANT_EMAIL_APPROVE } });
    expect(approvedUser?.roles).toContain(Role.ORGANIZER);

    // (Optional) Logout and login as applicant to check permissions
    await page.click('button:has-text("Logout")'); // Assuming a logout button exists
    await login(page, APPLICANT_EMAIL_APPROVE, APPLICANT_PASSWORD_APPROVE);
    // Navigate to an organizer-only page or check for organizer-specific UI elements
    // await page.goto('/organizer-dashboard'); // Example
    // await expect(page.locator('text=Welcome Organizer!')).toBeVisible();
  });

  test('Admin rejects an ORGANIZER application', async ({ page }: { page: Page }) => {
    // Find the application for APPLICANT_EMAIL_REJECT
    const applicantRowReject = page.locator(`div[role="listitem"]:has-text(\"${APPLICANT_EMAIL_REJECT}\")`);
    await expect(applicantRowReject).toBeVisible();

    // Click Reject button
    await applicantRowReject.getByRole('button', { name: /reject/i }).click();

    // Verify success message
    await expect(page.locator('text=/Application rejected successfully./i')).toBeVisible();

    // Verify application is removed from pending list
    await expect(applicantRowReject).not.toBeVisible({ timeout: 5000 });

    // DB Verification
    const rejectedApplication = await prisma.roleApplication.findFirst({
      where: { user: { email: APPLICANT_EMAIL_REJECT }, requestedRole: RequestedRole.ORGANIZER },
    });
    expect(rejectedApplication?.status).toBe(ApplicationStatus.REJECTED);

    const rejectedUser = await prisma.user.findUnique({ where: { email: APPLICANT_EMAIL_REJECT } });
    expect(rejectedUser?.roles).not.toContain(Role.ORGANIZER);
  });
});