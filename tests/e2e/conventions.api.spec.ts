import { test, expect, APIRequestContext, Cookie as PlaywrightCookie } from '@playwright/test';

// Define user credentials (replace with environment variables in a real project)
const adminUser = {
  email: 'magicjafo@gmail.com',
  password: 'smeghead',
};

const nonAdminUser = {
  email: 'jafo@getjafo.com',
  password: 'smeghead',
};

// Use Playwright's Cookie type
type Cookie = PlaywrightCookie;

// Helper function to perform login and return cookies
async function getLoginCookies(playwrightRequest: APIRequestContext, user: { email: string; password: string }): Promise<Cookie[]> {
  const cookies: Cookie[] = [];
  let domain = 'localhost';
  let secure = false;

  // 1. Get CSRF Token
  const csrfResponse = await playwrightRequest.get('/api/auth/csrf');
  const responseURL = new URL(csrfResponse.url());
  domain = responseURL.hostname;
  secure = responseURL.protocol === 'https:';

  const csrfBody = await csrfResponse.json();
  const csrfToken = csrfBody?.csrfToken || '';

  // 2. Attempt Login
  const loginResponse = await playwrightRequest.post('/api/auth/callback/credentials', {
    form: {
      email: user.email,
      password: user.password,
      csrfToken: csrfToken,
      redirect: false,
      json: true,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    failOnStatusCode: false,
  });

  // 3. Extract Session Cookie
  const sessionCookieHeaders = loginResponse.headers()['set-cookie']?.split('\n') || [];
  let foundSessionCookie = false;
  for (const header of sessionCookieHeaders) {
    const match = header.match(/^(__Host-next-auth\.session-token|__Secure-next-auth\.session-token|next-auth\.session-token)=([^;]+);/);
    if (match) {
      cookies.push({
        name: match[1],
        value: match[2],
        domain: domain,
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: secure,
        sameSite: 'Lax'
      });
      foundSessionCookie = true;
      break;
    }
  }

  if (!foundSessionCookie) {
    console.error('Login failed. Status:', loginResponse.status());
    try {
      console.error('Login response body:', await loginResponse.json());
    } catch { 
      console.error('Login response body (non-JSON):', await loginResponse.text());
    }
    throw new Error(`Login failed for ${user.email}. Could not obtain session cookie.`);
  }

  return cookies;
}

test.describe.serial('API /api/conventions - E2E CRUD Operations', () => {
  let adminRequestContext: APIRequestContext;
  let nonAdminRequestContext: APIRequestContext;
  let createdConventionId: string | null = null;

  test.beforeAll(async ({ playwright }) => {
    // Create a temporary context for login requests
    let tempContext: APIRequestContext | null = null;
    try {
        tempContext = await playwright.request.newContext();

        // Get cookies using the temporary context
        const adminCookies = await getLoginCookies(tempContext, adminUser);
        const nonAdminCookies = await getLoginCookies(tempContext, nonAdminUser);

        // Create new persistent contexts with the obtained cookies
        adminRequestContext = await playwright.request.newContext({
          storageState: { cookies: adminCookies, origins: [] },
        });
        nonAdminRequestContext = await playwright.request.newContext({
          storageState: { cookies: nonAdminCookies, origins: [] },
        });
    } finally {
        // Dispose of the temporary context
        if (tempContext) {
            await tempContext.dispose();
        }
    }
  });
  
  test.afterAll(async () => {
    // Dispose contexts
    if (adminRequestContext) await adminRequestContext.dispose();
    if (nonAdminRequestContext) await nonAdminRequestContext.dispose();
    
    // NOTE: Cleanup logic moved inside the test scenario where the ID is known,
    // or would require passing the created ID out of the test function, which is complex.
    // The current `afterAll` here won't have access to `createdConventionId` easily.
    // The test scenario itself handles cleanup now.
   });

  test('Scenario 1: Admin CRUD Operations', async () => {
    // === 1. Create Convention (POST) ===
    await test.step('Admin creates a new convention', async () => {
      const createPayload = {
        name: `E2E Test Con ${Date.now()}`,
        startDate: '2025-10-01T10:00:00.000Z',
        endDate: '2025-10-03T18:00:00.000Z',
        city: 'E2E City',
        state: 'ET',
        country: 'E2E Land',
        status: 'UPCOMING', // Use valid status from enum
        description: 'Convention created via E2E test',
      };
      const response = await adminRequestContext.post('/api/conventions', {
        data: createPayload,
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe(createPayload.name);
      expect(body.slug).toContain('e2e-test-con'); // Check if slug is generated
      expect(body.organizerUserId).toBeDefined(); // Check if admin user ID was set
      createdConventionId = body.id; // Store ID for subsequent steps and cleanup
      console.log(`Created convention ID: ${createdConventionId}`);
      expect(createdConventionId).not.toBeNull();
    });

    // Ensure createdConventionId is set before proceeding
    test.fail(!createdConventionId, 'Convention ID was not set after creation step');

    // === 2. Read List (GET) ===
    await test.step('Admin retrieves the list of conventions', async () => {
      expect(createdConventionId, 'createdConventionId should not be null here').not.toBeNull();
      const response = await adminRequestContext.get('/api/conventions');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      // Find the convention created in step 1 in the list
      const found = body.find((con: any) => con.id === createdConventionId);
      expect(found, `Convention ${createdConventionId} not found in list`).toBeDefined();
      expect(found.name).toContain('E2E Test Con');
    });

    // === 3. Read One (GET by ID) ===
    await test.step('Admin retrieves the specific convention by ID', async () => {
      expect(createdConventionId, 'createdConventionId should not be null here').not.toBeNull();
      const response = await adminRequestContext.get(`/api/conventions/${createdConventionId}`);
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.id).toBe(createdConventionId);
      expect(body.name).toContain('E2E Test Con');
    });

    // === 4. Update Convention (PUT) ===
    await test.step('Admin updates the convention', async () => {
      expect(createdConventionId, 'createdConventionId should not be null here').not.toBeNull();
      const updatePayload = {
        name: `Updated E2E Test Con ${Date.now()}`,
        status: 'ACTIVE',
        venueName: 'Updated Venue',
      };
      const response = await adminRequestContext.put(`/api/conventions/${createdConventionId}`, {
        data: updatePayload,
      });
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.id).toBe(createdConventionId);
      expect(body.name).toBe(updatePayload.name);
      expect(body.status).toBe('ACTIVE');
      expect(body.venueName).toBe('Updated Venue');
    });

    // === 5. Delete Convention (DELETE) ===
    await test.step('Admin deletes the convention', async () => {
      expect(createdConventionId, 'createdConventionId should not be null here').not.toBeNull();
      const response = await adminRequestContext.delete(`/api/conventions/${createdConventionId}`);
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.message).toBe('Convention deleted successfully');
      
      // Verify deletion by trying to GET it again (should be 404)
      const getResponse = await adminRequestContext.get(`/api/conventions/${createdConventionId}`);
      expect(getResponse.status()).toBe(404);
      
      createdConventionId = null; // Nullify ID so afterAll doesn't try to delete again
    });
  });

  test('Scenario 2: Non-Admin Access Denied', async () => {
    // Use a known ID or slug from setup, or create one with admin context first
    // For simplicity, let's assume a convention exists (or use the one from Scenario 1 if run in sequence without cleanup between)
    // However, running .serial ensures Scenario 1 completes first.
    // Let's create a temporary one here for this test scope.
    let tempConId = '';
    await test.step('Setup: Create convention with Admin for Non-Admin test', async () => {
      const createPayload = { name: `Non-Admin Test ${Date.now()}`, startDate:'2026-01-01', endDate:'2026-01-02', city:'NA', state:'NA', country:'NA', status:'DRAFT' };
      const response = await adminRequestContext.post('/api/conventions', { data: createPayload });
      expect(response.status()).toBe(201);
      tempConId = (await response.json()).id;
      expect(tempConId).toBeDefined();
    });
    
    test.fail(!tempConId, 'Temp Convention ID was not set for Non-Admin test');

    await test.step('Non-Admin attempts POST', async () => {
      const createPayload = { name: 'NA Try Post', startDate:'2026-02-01', endDate:'2026-02-02', city:'NA', state:'NA', country:'NA', status:'DRAFT' };
      const response = await nonAdminRequestContext.post('/api/conventions', { data: createPayload });
      expect(response.status()).toBe(403);
    });
    
    await test.step('Non-Admin attempts PUT', async () => {
      const updatePayload = { description: 'NA Try Update' };
      const response = await nonAdminRequestContext.put(`/api/conventions/${tempConId}`, { data: updatePayload });
      expect(response.status()).toBe(403);
    });
    
    await test.step('Non-Admin attempts DELETE', async () => {
      const response = await nonAdminRequestContext.delete(`/api/conventions/${tempConId}`);
      expect(response.status()).toBe(403);
    });
    
    // Cleanup the temp convention created for this test
     await test.step('Cleanup: Delete temp convention with Admin', async () => {
       if (tempConId) {
         const deleteResponse = await adminRequestContext.delete(`/api/conventions/${tempConId}`);
         expect(deleteResponse.ok(), `Cleanup of temp con ${tempConId} failed`).toBeTruthy();
       }
     });
  });
}); 