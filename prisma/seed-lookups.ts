import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting lookup table seeding...');

    // Seed Countries
    try {
        const countriesPath = path.join(__dirname, '..', 'docs', 'lookup_tables', 'countries.json');
        const countriesFile = await fs.readFile(countriesPath, 'utf-8');
        const countries = JSON.parse(countriesFile);

        for (const country of countries) {
            await prisma.country.upsert({
                where: { name: country.name },
                update: {
                    alpha2: country['alpha-2'],
                    countryCode: country['country-code'],
                },
                create: {
                    name: country.name,
                    alpha2: country['alpha-2'],
                    countryCode: country['country-code'],
                },
            });
        }
        console.log('Successfully seeded Countries.');
    } catch (error) {
        console.error('Error seeding countries:', error);
    }

    // Seed States
    try {
        const statesPath = path.join(__dirname, '..', 'docs', 'lookup_tables', 'states.json');
        const statesFile = await fs.readFile(statesPath, 'utf-8');
        const states = JSON.parse(statesFile);

        for (const state of states) {
            await prisma.state.upsert({
                where: { name: state.name },
                update: {
                    abbreviation: state.abbreviation,
                },
                create: {
                    name: state.name,
                    abbreviation: state.abbreviation,
                },
            });
        }
        console.log('Successfully seeded States.');
    } catch (error) {
        console.error('Error seeding states:', error);
    }

    // Seed Currencies
    try {
        const currenciesPath = path.join(__dirname, '..', 'docs', 'lookup_tables', 'currencies.json');
        const currenciesFile = await fs.readFile(currenciesPath, 'utf-8');
        const currencies = JSON.parse(currenciesFile);

        for (const code in currencies) {
            const currency = currencies[code];
            await prisma.currency.upsert({
                where: { code: code },
                update: {
                    name: currency.name,
                    demonym: currency.demonym,
                    majorSingle: currency.majorSingle,
                    majorPlural: currency.majorPlural,
                    ISOnum: currency.ISOnum,
                    symbol: currency.symbol,
                    symbolNative: currency.symbolNative,
                    minorSingle: currency.minorSingle,
                    minorPlural: currency.minorPlural,
                    ISOdigits: currency.ISOdigits,
                    decimals: currency.decimals,
                    numToBasic: currency.numToBasic,
                },
                create: {
                    code: code,
                    name: currency.name,
                    demonym: currency.demonym,
                    majorSingle: currency.majorSingle,
                    majorPlural: currency.majorPlural,
                    ISOnum: currency.ISOnum,
                    symbol: currency.symbol,
                    symbolNative: currency.symbolNative,
                    minorSingle: currency.minorSingle,
                    minorPlural: currency.minorPlural,
                    ISOdigits: currency.ISOdigits,
                    decimals: currency.decimals,
                    numToBasic: currency.numToBasic,
                },
            });
        }
        console.log('Successfully seeded Currencies.');
    } catch (error) {
        console.error('Error seeding currencies:', error);
    }

    console.log('Lookup table seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 