/**
 * Prisma Seed Script
 *
 * Purpose: Assigns the ADMIN role to a user specified by an environment variable.
 *
 * Environment Variables:
 *   ADMIN_EMAIL: The email address of the existing user to be granted ADMIN privileges.
 *
 * Usage:
 * 1. Ensure your .env file (or .env.local, etc., loaded by Prisma) contains:
 *    ADMIN_EMAIL=your_admin_user@example.com
 * 2. Run the script using the Prisma CLI:
 *    npx prisma db seed
 *
 * The script will output information about its progress and any errors encountered.
 * It requires `tsx` to be installed (`npm install -D tsx` or `yarn add -D tsx`)
 * and `package.json` to be configured for Prisma to use `tsx`:
 * "prisma": {
 *   "seed": "tsx prisma/seed.ts"
 * }
 */
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed script...');

  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error('Error: ADMIN_EMAIL environment variable is not set.');
    console.log('Skipping admin role assignment.');
    return;
  }

  console.log(`Looking for user with email: ${adminEmail} to assign ADMIN role.`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!user) {
      console.warn(`Warning: User with email "${adminEmail}" not found.`);
      console.log('No admin role assigned.');
      return;
    }

    if (user.roles.includes(Role.ADMIN)) {
      console.log(`User ${adminEmail} is already an ADMIN.`);
    } else {
      const updatedUser = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          roles: {
            push: Role.ADMIN,
          },
        },
      });
      console.log(`Successfully assigned ADMIN role to user ${updatedUser.email}.`);
    }
  } catch (error) {
    console.error('Error during seeding process:', error);
    console.log('Admin role assignment failed.');
  } finally {
    await prisma.$disconnect();
    console.log('Seed script finished.');
  }
}

main().catch((e) => {
  console.error('Unhandled error in seed script:', e);
  process.exit(1);
}); 