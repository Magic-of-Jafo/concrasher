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
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed script...');

  // Test users to create/update
  const testUsers = [
    {
      email: 'magicjafo@gmail.com',
      password: 'smeghead',
      roles: [Role.ADMIN],
    },
    {
      email: 'jafo@getjafo.com',
      password: 'smeghead',
      roles: [Role.USER],
    },
  ];

  for (const userData of testUsers) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists.`);
        // Update roles if needed
        if (JSON.stringify(existingUser.roles) !== JSON.stringify(userData.roles)) {
          await prisma.user.update({
            where: { email: userData.email },
            data: { roles: userData.roles },
          });
          console.log(`Updated roles for ${userData.email}`);
        }
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await prisma.user.create({
          data: {
            email: userData.email,
            hashedPassword: hashedPassword,
            roles: userData.roles,
          },
        });
        console.log(`Created user ${userData.email}`);
      }
    } catch (error) {
      console.error(`Error processing user ${userData.email}:`, error);
    }
  }

  await prisma.$disconnect();
  console.log('Seed script finished.');
}

main().catch((e) => {
  console.error('Unhandled error in seed script:', e);
  process.exit(1);
}); 