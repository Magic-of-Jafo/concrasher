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
import { PrismaClient, Role, ConventionStatus, ConventionType } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get the directory path in ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Read the SQL file
    const sqlPath = join(__dirname, 'seed.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');

    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
      console.log('Executed SQL statement successfully');
    }

    // Commit the transaction
    await prisma.$executeRawUnsafe('COMMIT');
    console.log('Committed transaction');

    // The ConventionSeries and Conventions are already created in seed.sql
    console.log('Seed completed successfully');

    // Create test users
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        hashedPassword: await hash('password123', 10),
        roles: [Role.ADMIN, Role.USER],
      },
    });

    const organizerUser = await prisma.user.upsert({
      where: { email: 'organizer@example.com' },
      update: {},
      create: {
        email: 'organizer@example.com',
        name: 'Organizer User',
        hashedPassword: await hash('password123', 10),
        roles: [Role.ORGANIZER, Role.USER],
      },
    });

    console.log(`Created users: ${adminUser.name}, ${organizerUser.name}`);

    // Create convention series
    const seriesData = [
      {
        name: 'Magi-Fest',
        slug: 'magi-fest',
        description: 'Annual magic convention held in Columbus, Ohio',
        organizerUserId: organizerUser.id,
      },
      {
        name: 'Magic Live',
        slug: 'magic-live',
        description: 'Exclusive magic convention by Stan Allen in Las Vegas',
        organizerUserId: organizerUser.id,
      },
      {
        name: 'IBM Convention',
        slug: 'ibm-convention',
        description: 'International Brotherhood of Magicians annual convention',
        organizerUserId: organizerUser.id,
      },
      {
        name: 'SAM Convention',
        slug: 'sam-convention',
        description: 'Society of American Magicians annual convention',
        organizerUserId: organizerUser.id,
      },
      {
        name: 'Blackpool Magic Convention',
        slug: 'blackpool-magic-convention',
        description: 'The largest magic convention in the world, held in Blackpool, UK',
        organizerUserId: organizerUser.id,
      },
      {
        name: 'FISM World Championship of Magic',
        slug: 'fism-world-championship',
        description: 'The Olympics of Magic, held every three years in different cities',
        organizerUserId: organizerUser.id,
      },
    ];

    for (const seriesItem of seriesData) {
      const series = await prisma.conventionSeries.upsert({
        where: { slug: seriesItem.slug },
        update: {},
        create: seriesItem,
      });
      console.log(`Created convention series: ${series.name}`);

      // Create conventions for each series
      await createConventionsForSeries(series.id, series.name);
    }
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createConventionsForSeries(seriesId: string, seriesName: string) {
  const currentYear = new Date().getFullYear();
  
  // Create past, current, and future conventions
  const conventionData = [
    {
      name: `${seriesName} ${currentYear-2}`,
      slug: `${seriesName.toLowerCase().replace(/\s+/g, '-')}-${currentYear-2}`,
      startDate: new Date(currentYear-2, 0, 15), // January 15 of year before last
      endDate: new Date(currentYear-2, 0, 18),   // January 18 of year before last
      status: ConventionStatus.PAST,
      city: getRandomCity(),
      country: 'United States',
      type: ConventionType.GENERAL,
    },
    {
      name: `${seriesName} ${currentYear-1}`,
      slug: `${seriesName.toLowerCase().replace(/\s+/g, '-')}-${currentYear-1}`,
      startDate: new Date(currentYear-1, 0, 15), // January 15 of last year
      endDate: new Date(currentYear-1, 0, 18),   // January 18 of last year
      status: ConventionStatus.PAST,
      city: getRandomCity(),
      country: 'United States',
      type: ConventionType.GENERAL,
    },
    {
      name: `${seriesName} ${currentYear}`,
      slug: `${seriesName.toLowerCase().replace(/\s+/g, '-')}-${currentYear}`,
      startDate: new Date(currentYear, 0, 15),   // January 15 of current year
      endDate: new Date(currentYear, 0, 18),     // January 18 of current year
      status: ConventionStatus.PUBLISHED,
      city: getRandomCity(),
      country: 'United States',
      type: ConventionType.GENERAL,
    },
    {
      name: `${seriesName} ${currentYear+1}`,
      slug: `${seriesName.toLowerCase().replace(/\s+/g, '-')}-${currentYear+1}`,
      startDate: new Date(currentYear+1, 0, 15), // January 15 of next year
      endDate: new Date(currentYear+1, 0, 18),   // January 18 of next year
      status: ConventionStatus.DRAFT,
      city: getRandomCity(),
      country: 'United States',
      type: ConventionType.GENERAL,
    },
  ];

  for (const conventionItem of conventionData) {
    try {
      const convention = await prisma.convention.upsert({
        where: { slug: conventionItem.slug },
        update: {},
        create: {
          ...conventionItem,
          seriesId,
        },
      });
      console.log(`Created convention: ${convention.name}`);
    } catch (error) {
      console.error(`Error creating convention ${conventionItem.name}:`, error);
    }
  }
}

function getRandomCity() {
  const cities = [
    'Las Vegas', 'Orlando', 'New York', 'Los Angeles', 'Chicago', 
    'San Francisco', 'Seattle', 'Austin', 'Columbus', 'Nashville',
    'Boston', 'Philadelphia', 'Washington DC', 'Atlanta', 'Miami'
  ];
  return cities[Math.floor(Math.random() * cities.length)];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 