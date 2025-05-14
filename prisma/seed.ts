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
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash('smeghead', 12);
  
  const users = [
    { name: 'Test User 1', email: 'test1@example.com' },
    { name: 'Test User 2', email: 'test2@example.com' },
    { name: 'Test User 3', email: 'test3@example.com' },
    { name: 'Test User 4', email: 'test4@example.com' },
    { name: 'Test User 5', email: 'test5@example.com' },
    { name: 'Test User 6', email: 'test6@example.com' },
    { name: 'Test User 7', email: 'test7@example.com' },
    { name: 'Test User 8', email: 'test8@example.com' },
    { name: 'Test User 9', email: 'test9@example.com' },
    { name: 'Test User 10', email: 'test10@example.com' },
  ];

  console.log('Starting seed...');

  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        hashedPassword,
        roles: [Role.USER],
      },
    });
    console.log(`Created user: ${createdUser.email}`);
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 