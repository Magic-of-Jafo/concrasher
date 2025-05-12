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
  // Clean up all related data for test users
  const emails = [ADMIN_EMAIL, APPLICANT_EMAIL_APPROVE, APPLICANT_EMAIL_REJECT];
  const users = await prisma.user.findMany({ where: { email: { in: emails } } });
  const userIds = users.map(u => u.id);

  // Use a transaction to ensure all related records are deleted
  await prisma.$transaction(async (tx) => {
    // Delete related records
    await tx.session.deleteMany({ where: { userId: { in: userIds } } });
    await tx.account.deleteMany({ where: { userId: { in: userIds } } });
    await tx.verificationToken.deleteMany({ where: { identifier: { in: emails } } });
    await tx.roleApplication.deleteMany({ where: { userId: { in: userIds } } });

    // Delete users
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });

  // Verify cleanup
  const existingUsers = await prisma.user.findMany({ where: { email: { in: emails } } });
  if (existingUsers.length > 0) {
    throw new Error('Failed to clean up test users');
  }

  const hashedPasswordAdmin = await getHashedPassword(ADMIN_PASSWORD);
  const hashedPasswordApplicantApprove = await getHashedPassword(APPLICANT_PASSWORD_APPROVE);
  const hashedPasswordApplicantReject = await getHashedPassword(APPLICANT_PASSWORD_REJECT);

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      hashedPassword: hashedPasswordAdmin,
      roles: [Role.USER, Role.ADMIN],
      name: 'E2E Admin',
      emailVerified: new Date(),
    },
    create: {
      email: ADMIN_EMAIL,
      name: 'E2E Admin',
      hashedPassword: hashedPasswordAdmin,
      roles: [Role.USER, Role.ADMIN],
      emailVerified: new Date(),
    },
  });

  // Create Applicant User for Approval Test
  const applicantUserApprove = await prisma.user.upsert({
    where: { email: APPLICANT_EMAIL_APPROVE },
    update: {
      hashedPassword: hashedPasswordApplicantApprove,
      roles: [Role.USER],
      name: 'E2E Applicant Approve',
      emailVerified: new Date(),
    },
    create: {
      email: APPLICANT_EMAIL_APPROVE,
      name: 'E2E Applicant Approve',
      hashedPassword: hashedPasswordApplicantApprove,
      roles: [Role.USER],
      emailVerified: new Date(),
    },
  });

  // Create Applicant User for Rejection Test
  const applicantUserReject = await prisma.user.upsert({
    where: { email: APPLICANT_EMAIL_REJECT },
    update: {
      hashedPassword: hashedPasswordApplicantReject,
      roles: [Role.USER],
      name: 'E2E Applicant Reject',
      emailVerified: new Date(),
    },
    create: {
      email: APPLICANT_EMAIL_REJECT,
      name: 'E2E Applicant Reject',
      hashedPassword: hashedPasswordApplicantReject,
      roles: [Role.USER],
      emailVerified: new Date(),
    },
  });

  // Clean up existing role applications
  await prisma.roleApplication.deleteMany({
    where: {
      userId: { in: [applicantUserApprove.id, applicantUserReject.id] },
      requestedRole: RequestedRole.ORGANIZER,
    },
  });

  // Create role applications using upsert to handle potential duplicates
  await prisma.roleApplication.upsert({
    where: {
      userId_requestedRole: {
        userId: applicantUserApprove.id,
        requestedRole: RequestedRole.ORGANIZER,
      },
    },
    update: {
      status: ApplicationStatus.PENDING,
    },
    create: {
      userId: applicantUserApprove.id,
      requestedRole: RequestedRole.ORGANIZER,
      status: ApplicationStatus.PENDING,
    },
  });

  await prisma.roleApplication.upsert({
    where: {
      userId_requestedRole: {
        userId: applicantUserReject.id,
        requestedRole: RequestedRole.ORGANIZER,
      },
    },
    update: {
      status: ApplicationStatus.PENDING,
    },
    create: {
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
  console.log('Starting login process...');
  
  // Navigate to login page and wait for it to be ready
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  console.log('Login page loaded');
  
  // Fill in login form
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  console.log('Login form filled');
  
  // Click login button and wait for navigation
  await page.click('button[type="submit"]');
  console.log('Login button clicked');
  
  // Wait for navigation to complete with a longer timeout
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  
  // Debug: Log current state
  console.log('Current URL:', await page.url());
  console.log('Page Content:', await page.content());
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'login-debug.png' });
  
  // Verify we're not on the login page anymore
  const currentUrl = await page.url();
  if (currentUrl.includes('/login')) {
    // Check for error message
    const errorMessage = await page.locator('[role="alert"]').textContent();
    if (errorMessage) {
      throw new Error(`Login failed with error: ${errorMessage}`);
    }
    throw new Error('Login failed - still on login page');
  }
}

test.describe('Admin Role Application Management', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    console.log('Starting beforeEach...');
    
    // Login as Admin
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Login completed');
    
    // Navigate to applications page
    await page.goto('/admin/applications');
    console.log('Navigated to applications page');
    
    // Wait for the page to be stable with a longer timeout
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    
    // Debug: Log the page state
    console.log('Current URL:', await page.url());
    console.log('Page Content:', await page.content());
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'applications-page-debug.png' });
    
    // Wait for the applications list to be visible with a longer timeout
    const applicationsList = page.locator('[data-testid="applications-list"]');
    await applicationsList.waitFor({ state: 'visible', timeout: 30000 });
    console.log('Applications list is visible');
    
    // Debug: Log all text content on the page
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page Text Content:', pageText);
  });

  test('Admin approves an ORGANIZER application', async ({ page }: { page: Page }) => {
    console.log('Starting approval test...');
    
    // Debug: Log current state before looking for applicant card
    console.log('Current URL:', await page.url());
    await page.screenshot({ path: 'before-approval-debug.png' });
    
    // Wait for the specific applicant card to be visible
    const applicantCard = page.locator(`[data-testid="application-card"]:has-text("${APPLICANT_EMAIL_APPROVE}")`);
    await expect(applicantCard).toBeVisible({ timeout: 10000 });
    console.log('Found applicant card for approval');
    
    // Debug: Log the found card's content
    const cardContent = await applicantCard.evaluate(el => el.outerHTML);
    console.log('Found applicant card:', cardContent);
    
    // Click Approve button within that card
    const approveButton = applicantCard.getByRole('button', { name: /approve/i });
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    console.log('Clicked approve button');
    
    // Verify success message
    await expect(page.locator('text=/Application approved successfully/i')).toBeVisible();
    console.log('Success message verified');
    
    // Verify application is removed from the pending list
    await expect(applicantCard).not.toBeVisible({ timeout: 5000 });
    console.log('Application card removed from list');
    
    // DB Verification
    const approvedApplication = await prisma.roleApplication.findFirst({
      where: { user: { email: APPLICANT_EMAIL_APPROVE }, requestedRole: RequestedRole.ORGANIZER },
    });
    expect(approvedApplication?.status).toBe(ApplicationStatus.APPROVED);
    console.log('Database verification passed');
  });

  test('Admin rejects an ORGANIZER application', async ({ page }: { page: Page }) => {
    console.log('Starting rejection test...');
    
    // Debug: Log current state before looking for applicant card
    console.log('Current URL:', await page.url());
    await page.screenshot({ path: 'before-rejection-debug.png' });
    
    // Wait for the specific applicant card to be visible
    const applicantCard = page.locator(`[data-testid="application-card"]:has-text("${APPLICANT_EMAIL_REJECT}")`);
    await expect(applicantCard).toBeVisible({ timeout: 10000 });
    console.log('Found applicant card for rejection');
    
    // Debug: Log the found card's content
    const cardContent = await applicantCard.evaluate(el => el.outerHTML);
    console.log('Found applicant card:', cardContent);
    
    // Click Reject button within that card
    const rejectButton = applicantCard.getByRole('button', { name: /reject/i });
    await expect(rejectButton).toBeVisible();
    await rejectButton.click();
    console.log('Clicked reject button');
    
    // Verify success message
    await expect(page.locator('text=/Application rejected successfully/i')).toBeVisible();
    console.log('Success message verified');
    
    // Verify application is removed from pending list
    await expect(applicantCard).not.toBeVisible({ timeout: 5000 });
    console.log('Application card removed from list');
    
    // DB Verification
    const rejectedApplication = await prisma.roleApplication.findFirst({
      where: { user: { email: APPLICANT_EMAIL_REJECT }, requestedRole: RequestedRole.ORGANIZER },
    });
    expect(rejectedApplication?.status).toBe(ApplicationStatus.REJECTED);
    console.log('Database verification passed');
  });
});