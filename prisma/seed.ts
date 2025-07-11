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
import { PrismaClient, Role, ConventionStatus } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

// Function to parse CSV data
function parseCSV(filePath: string): any[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const resolvedPath = join(__dirname, '../', filePath); // Corrected path: up one level from prisma/ to project root

  const fileContent = readFileSync(resolvedPath, 'utf8');
  const rows = fileContent.trim().split('\n');
  const headers = rows.shift()?.split(',').map(header => header.trim()) || [];

  return rows.map(row => {
    const values = row.split(',').map(value => value.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] === '' ? null : values[index]; // Handle empty strings as null
      return obj;
    }, {} as any);
  });
}

async function main() {
  try {
    // Get the directory path in ES modules
    // const __filename = fileURLToPath(import.meta.url);
    // const __dirname = dirname(__filename);

    // Read the SQL file
    // const sqlPath = join(__dirname, 'seed.sql');
    // const sqlContent = readFileSync(sqlPath, 'utf8');

    // Split the SQL content into individual statements
    // const statements = sqlContent
    //   .split(';')
    //   .map(statement => statement.trim())
    //   .filter(statement => statement.length > 0);

    // Execute each statement
    // for (const statement of statements) {
    //   await prisma.$executeRawUnsafe(statement);
    //   console.log('Executed SQL statement successfully');
    // }

    // Commit the transaction
    // await prisma.$executeRawUnsafe('COMMIT');
    // console.log('Committed transaction');

    // The ConventionSeries and Conventions are already created in seed.sql
    // console.log('Seed completed successfully'); // This log was for seed.sql

    // --- Seeding Timezones from JSON ---
    console.log('Starting timezone seeding from JSON...');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const timezoneDataPath = join(__dirname, '../docs/timezones.json');
    const timezoneData = JSON.parse(readFileSync(timezoneDataPath, 'utf8'));

    for (const timezone of timezoneData) {
      if (!timezone.utc || timezone.utc.length === 0) {
        console.warn(`Skipping timezone due to missing IANA IDs: ${timezone.value || 'Unnamed'}`);
        continue;
      }

      // Use the first IANA ID as the primary ianaId
      const primaryIanaId = timezone.utc[0];

      const timezoneRecord = await prisma.timezone.upsert({
        where: { ianaId: primaryIanaId },
        update: {
          value: timezone.value,
          abbr: timezone.abbr,
          offset: timezone.offset,
          isdst: timezone.isdst,
          text: timezone.text,
          utcAliases: timezone.utc,
        },
        create: {
          ianaId: primaryIanaId,
          value: timezone.value,
          abbr: timezone.abbr,
          offset: timezone.offset,
          isdst: timezone.isdst,
          text: timezone.text,
          utcAliases: timezone.utc,
        },
      });
      console.log(`Upserted timezone: ${timezoneRecord.value} (${timezoneRecord.ianaId})`);
    }
    console.log(`Timezone seeding completed. Total timezones: ${timezoneData.length}`);

    // --- Seeding Users from CSV ---
    console.log('Starting user seeding from CSV...');
    const usersFromCSV = parseCSV('docs/dummy-data/users_seed.csv');

    let organizerUserIdForSeries: string | undefined = undefined;

    for (const userData of usersFromCSV) {
      if (!userData.email || !userData.hashedPassword) {
        console.warn(`Skipping user due to missing email or hashedPassword: ${userData.name || 'Unnamed'}`);
        continue;
      }

      const rolesString = userData.roles || 'USER'; // Default to USER if not specified
      const rolesArray = rolesString.split('|').map((roleStr: string) => {
        const roleEnum = Role[roleStr.trim().toUpperCase() as keyof typeof Role];
        if (!roleEnum) {
          console.warn(`Invalid role "${roleStr}" for user ${userData.email}. Defaulting to USER.`);
          return Role.USER;
        }
        return roleEnum;
      }).filter((role: Role | undefined) => role !== undefined) as Role[];

      // Ensure USER role is always present if other roles are assigned
      if (rolesArray.length > 0 && !rolesArray.includes(Role.USER)) {
        rolesArray.push(Role.USER);
      }
      if (rolesArray.length === 0) {
        rolesArray.push(Role.USER);
      }


      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          // name: userData.name, // Commented out - User model uses firstName/lastName
          hashedPassword: userData.hashedPassword, // Assuming CSV contains already hashed passwords
          roles: rolesArray,
          bio: userData.bio,
          // emailVerified: userData.emailVerified ? new Date(userData.emailVerified) : null, // Handle if present
          // image: userData.image, // Handle if present
        },
        create: {
          email: userData.email,
          // name: userData.name, // Commented out - User model uses firstName/lastName
          hashedPassword: userData.hashedPassword, // Assuming CSV contains already hashed passwords
          roles: rolesArray,
          bio: userData.bio,
          // emailVerified: userData.emailVerified ? new Date(userData.emailVerified) : null, // Handle if present
          // image: userData.image, // Handle if present
        },
      });
      console.log(`Upserted user: ${user.firstName || user.email} (${user.email})`);

      // Identify the organizer for convention series
      if (user.email === 'jafo@getjafo.com') {
        organizerUserIdForSeries = user.id;
      }
    }
    console.log('User seeding from CSV completed.');

    if (!organizerUserIdForSeries) {
      console.error("CRITICAL: Organizer user (jafo@getjafo.com) not found after seeding from CSV. Cannot create series and conventions.");
      throw new Error("Organizer user for series creation not found.");
    }
    console.log(`Organizer for series set to: jafo@getjafo.com (ID: ${organizerUserIdForSeries})`);


    // --- Create convention series from CSV ---
    console.log('Starting ConventionSeries seeding from CSV...');
    const seriesFromCSV = parseCSV('docs/dummy-data/convention_series_seed.csv');

    for (const seriesCSVItem of seriesFromCSV) {
      if (!seriesCSVItem.name || !seriesCSVItem.slug) {
        console.warn(`Skipping series due to missing name or slug: ${seriesCSVItem.name || seriesCSVItem.slug || 'Unnamed Series'}`);
        continue;
      }

      const seriesToCreate = {
        name: seriesCSVItem.name,
        slug: seriesCSVItem.slug,
        description: seriesCSVItem.description, // Will be null if empty in CSV
        logoUrl: seriesCSVItem.logoUrl,         // Will be null if empty in CSV
        organizerUserId: organizerUserIdForSeries!, // Use the ID of jafo@getjafo.com
      };

      const series = await prisma.conventionSeries.upsert({
        where: { slug: seriesToCreate.slug },
        update: {
          name: seriesToCreate.name,
          description: seriesToCreate.description,
          logoUrl: seriesToCreate.logoUrl,
          organizerUserId: seriesToCreate.organizerUserId,
        },
        create: seriesToCreate,
      });
      console.log(`Upserted convention series: ${series.name}`);

      // Create conventions for each series from CSV -- THIS CALL IS BEING REMOVED
      // await createConventionsForSeries(series.id, series.name);
    }
    console.log('ConventionSeries seeding from CSV completed.');

    // --- Seed Conventions from conventions_seed.csv ---
    console.log('Starting Convention seeding from CSV...');
    const conventionsFromCSV = parseCSV('docs/dummy-data/conventions_seed.csv');

    for (const convData of conventionsFromCSV) {
      if (!convData.name || !convData.slug || !convData.seriesId) {
        console.warn(`Skipping convention due to missing name, slug, or seriesId: ${convData.name || convData.slug || 'Unnamed Convention'}`);
        continue;
      }

      // Date parsing (MM/DD/YYYY to Date object or null)
      const parseDate = (dateStr: string | null): Date | null => {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
          const day = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            // Basic validation for year, month, day ranges
            if (year > 1900 && year < 3000 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
              return new Date(year, month, day);
            }
          }
        }
        console.warn(`Invalid date format "${dateStr}" for convention "${convData.name}". Setting to null.`);
        return null;
      };

      const startDate = parseDate(convData.startDate);
      const endDate = parseDate(convData.endDate);

      // Boolean parsing
      const parseBoolean = (value: string | null): boolean => {
        if (!value) return false; // Default for empty or null
        return value.trim().toLowerCase() === 'true';
      };
      const isOneDayEvent = parseBoolean(convData.isOneDayEvent);
      const isTBD = parseBoolean(convData.isTBD);

      // Status enum parsing
      const statusString = convData.status?.trim().toUpperCase();
      const conventionStatus = statusString && ConventionStatus[statusString as keyof typeof ConventionStatus]
        ? ConventionStatus[statusString as keyof typeof ConventionStatus]
        : ConventionStatus.DRAFT; // Default to DRAFT if invalid or missing

      if (statusString && !ConventionStatus[statusString as keyof typeof ConventionStatus]) {
        console.warn(`Invalid status "${convData.status}" for convention "${convData.name}". Defaulting to DRAFT.`);
      }

      // Gallery Image URLs (assuming comma-separated if provided, else empty array)
      let galleryImageUrls: string[] = [];
      if (convData.galleryImageUrls && typeof convData.galleryImageUrls === 'string' && convData.galleryImageUrls.trim() !== '') {
        galleryImageUrls = convData.galleryImageUrls.split(',').map((url: string) => url.trim());
      }


      const conventionToCreate = {
        name: convData.name,
        slug: convData.slug,
        startDate: startDate,
        endDate: endDate,
        isOneDayEvent: isOneDayEvent,
        isTBD: isTBD,
        city: convData.city,
        stateAbbreviation: convData.stateAbbreviation,
        stateName: convData.stateName,
        country: convData.country,
        venueName: convData.venueName,
        descriptionShort: convData.descriptionShort,
        descriptionMain: convData.descriptionMain,
        websiteUrl: convData.websiteUrl,
        status: conventionStatus,
        coverImageUrl: convData.coverImageUrl,
        profileImageUrl: convData.profileImageUrl,
        galleryImageUrls: galleryImageUrls,
        seriesId: convData.seriesId,
      };

      try {
        const convention = await prisma.convention.upsert({
          where: { slug: conventionToCreate.slug },
          update: conventionToCreate,
          create: conventionToCreate,
        });
        console.log(`Upserted convention: ${convention.name}`);
      } catch (e: any) {
        console.error(`Error upserting convention ${conventionToCreate.name} (slug: ${conventionToCreate.slug}):`, e.message);
        if (e.code) console.error(`Prisma Error Code: ${e.code}`);
        // console.error("Data attempted:", conventionToCreate); // Uncomment for detailed data logging
      }
    }
    console.log('Convention seeding from conventions_seed.csv completed.');

  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 