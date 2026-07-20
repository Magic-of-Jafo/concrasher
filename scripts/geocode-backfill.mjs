// Backfill coordinates for conventions (latitude/longitude) and users' home
// bases (homeLatitude/homeLongitude) via Nominatim, paced to their 1 req/sec
// policy. Idempotent: only rows with a city and no coordinates are touched,
// so re-runs pick up where they left off.
//
// Local:  npx dotenv-cli -e .env.local -- node scripts/geocode-backfill.mjs
// Prod:   DATABASE_URL="postgresql://…" node scripts/geocode-backfill.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ConventionCrasher/1.0 (https://conventioncrasher.com)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(city, state, country) {
    const q = [city, state, country].map((v) => v?.trim()).filter(Boolean).join(', ');
    if (!q) return null;
    try {
        const res = await fetch(`${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const hit = (await res.json())[0];
        const lat = Number(hit?.lat);
        const lon = Number(hit?.lon);
        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
    } catch {
        return null;
    }
}

async function run() {
    const conventions = await prisma.convention.findMany({
        where: { deletedAt: null, latitude: null, city: { not: null } },
        select: { id: true, name: true, city: true, stateName: true, stateAbbreviation: true, country: true },
    });
    console.log(`Conventions needing coordinates: ${conventions.length}`);
    let ok = 0, miss = 0;
    for (const c of conventions) {
        const hit = await geocode(c.city, c.stateName || c.stateAbbreviation, c.country);
        if (hit) {
            await prisma.convention.update({ where: { id: c.id }, data: { latitude: hit.lat, longitude: hit.lon } });
            ok++;
            console.log(`  ✓ ${c.name.slice(0, 45)} -> ${hit.lat.toFixed(3)}, ${hit.lon.toFixed(3)}`);
        } else {
            miss++;
            console.log(`  ✗ ${c.name.slice(0, 45)} (${[c.city, c.country].filter(Boolean).join(', ')}) — no match`);
        }
        await sleep(1100);
    }

    const users = await prisma.user.findMany({
        where: { homeLatitude: null, homeCity: { not: null } },
        select: { id: true, homeCity: true, homeStateName: true, homeStateAbbreviation: true, homeCountry: true },
    });
    console.log(`Users needing home coordinates: ${users.length}`);
    let uok = 0, umiss = 0;
    for (const u of users) {
        const hit = await geocode(u.homeCity, u.homeStateName || u.homeStateAbbreviation, u.homeCountry);
        if (hit) {
            await prisma.user.update({ where: { id: u.id }, data: { homeLatitude: hit.lat, homeLongitude: hit.lon } });
            uok++;
        } else {
            umiss++;
        }
        await sleep(1100);
    }

    console.log(`Done. Conventions: ${ok} geocoded, ${miss} unmatched. Users: ${uok} geocoded, ${umiss} unmatched.`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
