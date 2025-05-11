import { PrismaClient, Role } from '@prisma/client';

const db = new PrismaClient();

async function testUserRoles() {
  const testEmail = 'role-test-user@example.com';
  let user;

  console.log(`Starting role assignment and query test for user: ${testEmail}`);

  try {
    // 1. Create a new user for testing
    console.log('Attempting to create a test user...');
    user = await db.user.create({
      data: {
        email: testEmail,
        name: 'Role Test User',
        roles: [Role.USER], // Initial role
      },
    });
    console.log(`User created with ID: ${user.id} and roles: ${user.roles}`);

    // 2. Query initial roles (already have them from creation, but good to show findUnique)
    const initialUser = await db.user.findUnique({ where: { id: user.id } });
    console.log(`Queried initial roles: ${initialUser?.roles}`);

    // AC2: Programmatically assign one or more roles
    console.log('Assigning additional roles [ORGANIZER, ADMIN]...');
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        roles: { set: [Role.USER, Role.ORGANIZER, Role.ADMIN] }, // Set new roles
      },
    });
    console.log(`Roles updated. New roles: ${updatedUser.roles}`);

    // AC3: Programmatically query the roles associated with a user
    const userAfterUpdate = await db.user.findUnique({ where: { id: user.id } });
    console.log(`Queried roles after update: ${userAfterUpdate?.roles}`);

    if (JSON.stringify(userAfterUpdate?.roles?.slice().sort()) !== JSON.stringify([Role.ADMIN, Role.ORGANIZER, Role.USER].slice().sort())) {
      throw new Error('Role update verification failed!');
    }
    console.log('Role update successfully verified.');

  } catch (error) {
    console.error('Error during test-user-roles script:', error);
  } finally {
    // 4. Clean up: Delete the test user
    if (user) {
      console.log(`Cleaning up: Deleting test user with ID: ${user.id}`);
      await db.user.delete({ where: { id: user.id } });
      console.log('Test user deleted.');
    }
    await db.$disconnect();
    console.log('Disconnected from database.');
  }
}

testUserRoles(); 