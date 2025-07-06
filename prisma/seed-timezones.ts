/**
 * Timezone-Only Seed Script
 *
 * Purpose: Populates the Timezone lookup table from docs/timezones.json
 * This script ONLY handles timezone data and does not touch any other tables.
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx prisma/seed-timezones.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Starting timezone seeding from JSON...');

        // Get the path to timezones.json
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const timezoneDataPath = join(__dirname, '../docs/timezones.json');

        // Read and parse the timezone data
        const timezoneData = JSON.parse(readFileSync(timezoneDataPath, 'utf8'));

        console.log(`Found ${timezoneData.length} timezones to process...`);

        let processedCount = 0;
        let skippedCount = 0;

        for (const timezone of timezoneData) {
            if (!timezone.utc || timezone.utc.length === 0) {
                console.warn(`Skipping timezone due to missing IANA IDs: ${timezone.value || 'Unnamed'}`);
                skippedCount++;
                continue;
            }

            // Use the first IANA ID as the primary ianaId
            const primaryIanaId = timezone.utc[0];

            try {
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

                console.log(`✓ ${timezoneRecord.value} (${timezoneRecord.ianaId})`);
                processedCount++;
            } catch (error) {
                console.error(`Failed to process timezone ${primaryIanaId}:`, error);
                skippedCount++;
            }
        }

        console.log('\n--- Timezone Seeding Complete ---');
        console.log(`✓ Processed: ${processedCount} timezones`);
        console.log(`⚠ Skipped: ${skippedCount} timezones`);
        console.log(`📊 Total in JSON: ${timezoneData.length} timezones`);

    } catch (error) {
        console.error('Error during timezone seeding:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((e) => {
        console.error('Timezone seeding failed:', e);
        process.exit(1);
    }); 