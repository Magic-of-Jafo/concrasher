import { PrismaClient } from '@prisma/client';
import { createObjectCsvWriter } from 'csv-writer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

async function exportConventionSeries() {
  console.log('Fetching ConventionSeries data...');
  try {
    const series = await prisma.conventionSeries.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        organizerUserId: true, // Good to have for verification
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (series.length === 0) {
      console.log('No convention series found to export.');
      return;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // Output path: agile_test/docs/dummy-data/exported_convention_series.csv
    const outputPath = join(__dirname, '../docs/dummy-data/exported_convention_series.csv');

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'id', title: 'seriesId' }, // Exporting as seriesId to match your target column name
        { id: 'name', title: 'name' },
        { id: 'slug', title: 'slug' },
        { id: 'organizerUserId', title: 'organizerUserId' },
      ],
    });

    await csvWriter.writeRecords(series);
    console.log(`Successfully exported ${series.length} convention series to: ${outputPath}`);

  } catch (error) {
    console.error('Error exporting convention series:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportConventionSeries(); 