/**
 * One-shot importer: pushes upcoming conventions from The Magic Word's
 * Magic Convention Guide (https://www.themagicwordpodcast.com/magic-convention-guide)
 * into ConventionCrasher via the agent API (/api/v1/conventions).
 *
 * Data below was hand-extracted from the guide on 2026-06-12. Entries whose
 * day-of-month the guide lists as "?" are imported as TBD (no dates).
 *
 * Usage:
 *   node scripts/import-from-magic-word.mjs            # against http://localhost:3000
 *   API_BASE=https://conventioncrasher.com node scripts/import-from-magic-word.mjs
 *
 * Requires AGENT_API_KEY in the environment (or .env.local when run locally).
 */

import { readFileSync } from 'fs';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';

let apiKey = process.env.AGENT_API_KEY;
if (!apiKey) {
    try {
        const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
        apiKey = env.match(/^AGENT_API_KEY="?([^"\r\n]+)"?/m)?.[1];
    } catch { /* fall through */ }
}
if (!apiKey) {
    console.error('AGENT_API_KEY not set and not found in .env.local');
    process.exit(1);
}

const conventions = [
    // ── 2026 ──────────────────────────────────────────────────────────────
    { name: 'Melbourne Magic Festival 2026', startDate: '2026-06-29', endDate: '2026-07-11', city: 'Melbourne', country: 'Australia', websiteUrl: 'https://melbournemagicfestival.com/' },
    { name: 'S.A.M. National Convention 2026', startDate: '2026-07-01', endDate: '2026-07-04', city: 'Appleton', stateAbbreviation: 'WI', websiteUrl: 'https://www.magicsam.com/page/Appleton' },
    { name: 'IBM Convention 2026', startDate: '2026-07-22', endDate: '2026-07-25', city: 'St. Louis', stateAbbreviation: 'MO', websiteUrl: 'https://www.magician.org/convention' },
    { name: 'FCM International Convention 2026', startDate: '2026-07-26', endDate: '2026-07-30', city: 'Danville', stateAbbreviation: 'IN', websiteUrl: 'https://convention.fcm.org' },
    { name: 'MAGIC Live! 2026', startDate: '2026-08-02', endDate: '2026-08-05', city: 'Las Vegas', stateAbbreviation: 'NV', websiteUrl: 'https://www.magicconvention.com/' },
    { name: "Abbott's Get Together 2026", startDate: '2026-08-05', endDate: '2026-08-08', city: 'Colon', stateAbbreviation: 'MI', websiteUrl: 'https://www.magicgettogether.com/' },
    { name: 'KIDAbra, the Grand Finale 2026', startDate: '2026-08-12', endDate: '2026-08-15', city: 'Atlanta', stateAbbreviation: 'GA', websiteUrl: 'https://www.kidabra.org/' },
    { name: 'Magi-Whirl 2026', city: 'Washington', stateAbbreviation: 'DC', websiteUrl: 'https://magi-whirl.org' },
    { name: 'DC Festival of Magic 2026', startDate: '2026-08-28', endDate: '2026-08-30', city: 'Washington', stateAbbreviation: 'DC', websiteUrl: 'https://www.dcmagicfestival.com/' },
    { name: 'Texas Association of Magicians (T.A.O.M.) 2026', startDate: '2026-09-04', endDate: '2026-09-07', city: 'Houston', stateAbbreviation: 'TX', websiteUrl: 'https://www.taom.org/assoc/' },
    { name: 'AbraCORNdabra 2026', startDate: '2026-09-11', endDate: '2026-09-13', city: 'Des Moines', stateAbbreviation: 'IA', websiteUrl: 'http://abracorndabra.com/' },
    { name: "Magicians' Alliance of Eastern States Convention 2026", city: 'Cherry Hill', stateAbbreviation: 'NJ', websiteUrl: 'https://maesconvention.com/' },
    { name: 'Fröhlich Magic Convention 2026', startDate: '2026-09-10', endDate: '2026-09-13', city: 'Bad Aussee', country: 'Austria', websiteUrl: 'https://zauberfestival.life/' },
    { name: 'Magic at the Beach 2026', startDate: '2026-09-10', endDate: '2026-09-12', city: 'Myrtle Beach', stateAbbreviation: 'SC', websiteUrl: 'https://www.magicatthebeach.org/' },
    { name: 'IBM British Ring Convention 2026', startDate: '2026-09-19', endDate: '2026-09-20', city: 'Buxton', country: 'United Kingdom', websiteUrl: 'https://britishring.org.uk/convention-countdown/' },
    { name: 'Magialdia Magic Festival 2026', startDate: '2026-09-14', endDate: '2026-09-20', city: 'Vitoria', country: 'Spain', websiteUrl: 'http://magialdia.com/' },
    { name: 'Original Close-Up Magic Symposium 2026', city: 'Vienna', country: 'Austria', websiteUrl: 'https://magic-theater.at/index.php?c=category&id=7' },
    { name: 'Magistrorum 2026', startDate: '2026-09-17', endDate: '2026-09-20', city: 'Dallas', stateAbbreviation: 'TX', websiteUrl: 'https://www.magistrorum.net/' },
    { name: 'Festival de Magie de Québec 2026', city: 'Québec City', country: 'Canada', websiteUrl: 'https://www.festivaldemagie.ca' },
    { name: 'Magic Festival Dreamfactory 2026', city: 'Degersheim', country: 'Switzerland', websiteUrl: 'https://dreamfactory.ch/magicfestival-2024/' },
    { name: 'Atlanta Harvest of Magic 2026', city: 'Atlanta', stateAbbreviation: 'GA', websiteUrl: 'https://atlantaharvestofmagic.com/' },
    { name: 'The Conjuror Community Summit 2026', startDate: '2026-09-25', endDate: '2026-09-26', city: 'Baltimore', stateAbbreviation: 'MD', websiteUrl: 'https://conjurorcommunitysummit.com/' },
    { name: 'Abano National Convention 2026', city: 'Abano (Padua)', country: 'Italy', websiteUrl: 'https://www.clubmagicoitaliano.it/congressocmi/congresso' },
    { name: 'Magic in Orlando 2026', startDate: '2026-10-11', endDate: '2026-10-14', city: 'Orlando', stateAbbreviation: 'FL', websiteUrl: 'https://www.daytonamagicconvention.com/', descriptionShort: 'Formerly the Daytona Magic Convention.' },
    { name: 'MAGICA & Nordic Nobel 2026', city: 'Lübeck', country: 'Germany', websiteUrl: 'https://zauberkongress.de/', descriptionShort: 'The German Championship of Magic Art and Nordic Nobel together.' },
    { name: 'South Tyneside International Magic Festival 2026', city: 'South Shields', country: 'United Kingdom', websiteUrl: 'https://campaigns.southtyneside.gov.uk/magic-festival/' },
    { name: 'New York Magic Conference 2026', city: 'Douglaston', stateAbbreviation: 'NY', websiteUrl: 'https://newyorkmagicconference.com/' },
    { name: 'TRICS (Carolina Close-Up Convention) 2026', city: 'Charlotte', stateAbbreviation: 'NC', websiteUrl: 'http://tricsconvention.com/' },
    // ── 2027 ──────────────────────────────────────────────────────────────
    { name: 'East Coast Spirit Sessions 9', city: 'Myrtle Beach', stateAbbreviation: 'SC', websiteUrl: 'https://eastcoastspiritsessions.com/' },
    { name: 'Gator Gate Gathering 2027', startDate: '2027-01-07', endDate: '2027-01-09', city: 'Orlando', stateAbbreviation: 'FL', websiteUrl: 'https://gatorgategathering.com/' },
    { name: 'The Session 2027', city: 'London', country: 'United Kingdom', websiteUrl: 'https://www.sessionconvention.com/' },
    { name: 'MagiFest 2027', startDate: '2027-01-21', endDate: '2027-01-23', city: 'Columbus', stateAbbreviation: 'OH', websiteUrl: 'https://www.vanishingincmagic.com/magic-conventions/magifest/' },
    { name: 'Kapital Konvention 2027', city: 'Washington', stateAbbreviation: 'DC', websiteUrl: 'https://www.kapitalkidvention.com/' },
    { name: 'Flasoma 2027', startDate: '2027-02-01', endDate: '2027-02-07', country: 'Peru', websiteUrl: 'https://www.theaceofmagic.com/2026/03/flasoma-magic-convention-in-peru-feb-1.html' },
    { name: 'Blackpool Convention 2027', startDate: '2027-02-18', endDate: '2027-02-21', city: 'Blackpool', country: 'United Kingdom', websiteUrl: 'https://blackpoolmagicconvention.com/' },
    { name: 'New England Magicians Conference 2027', city: 'Trumbull', stateAbbreviation: 'CT', websiteUrl: 'https://www.ctnemcon.com' },
    { name: 'Portland Magic Jam 2027', city: 'Portland', stateAbbreviation: 'OR', websiteUrl: 'https://pdxmagicjam.com/' },
    { name: 'Magic Capital Close-Up Convention 2027', city: 'Colon', stateAbbreviation: 'MI', websiteUrl: 'https://magiccapitalcloseup.com/' },
    { name: 'The Gateway Close-Up Gathering 2027', startDate: '2027-04-01', endDate: '2027-04-03', city: 'Collinsville', stateAbbreviation: 'IL', websiteUrl: 'https://www.baskervilleproductions.com/gateway' },
    { name: 'MAGiCon 2027', city: 'Raleigh', stateAbbreviation: 'NC', websiteUrl: 'https://www.themystictower.com/magicon' },
    { name: "Poe's Magic Conference 2027", city: 'Baltimore', stateAbbreviation: 'MD', websiteUrl: 'https://poesmagicconference.com/' },
    { name: 'Another Darn Convention 2027', city: 'Cincinnati', stateAbbreviation: 'OH', websiteUrl: 'https://www.admcmagic.com/index.html' },
    { name: "Obie's 4F (Fechter's Finger Flicking Frolic) 2027", startDate: '2027-04-21', endDate: '2027-04-24', city: 'Buffalo', stateAbbreviation: 'NY', websiteUrl: 'http://www.ffffmagic.com/', descriptionShort: 'Invitation-only close-up magic convention.' },
    { name: 'MAWNY Convention 2027', startDate: '2027-04-25', endDate: '2027-04-25', city: 'Batavia', stateAbbreviation: 'NY', websiteUrl: 'http://www.mawny.org', descriptionShort: "Magician's Alliance of Western New York." },
    { name: "Collector's Expo 2027", startDate: '2027-04-29', endDate: '2027-05-01', city: 'Chicago', stateAbbreviation: 'IL', websiteUrl: 'https://magiccollectorexpo.com/' },
    { name: 'Tampa Bay Festival of Magic 2027', city: 'Tampa', stateAbbreviation: 'FL', websiteUrl: 'https://www.tampamagicclub.com/festival-of-magic-1.html' },
    // ── 2028+ ─────────────────────────────────────────────────────────────
    { name: 'IBM Convention 2028', startDate: '2028-05-30', endDate: '2028-06-03', city: 'Houston', stateAbbreviation: 'TX', websiteUrl: 'https://www.magician.org/convention' },
    { name: 'IBM Convention 2029', startDate: '2029-07-17', endDate: '2029-07-21', city: 'St. Louis', stateAbbreviation: 'MO', websiteUrl: 'https://www.magician.org/convention' },
    { name: 'IBM Convention 2030', startDate: '2030-07-09', endDate: '2030-07-13', city: 'Las Vegas', stateAbbreviation: 'NV', websiteUrl: 'https://www.magician.org/convention' },
];

async function main() {
    let created = 0, duplicates = 0, failed = 0;
    for (const convention of conventions) {
        try {
            const res = await fetch(`${API_BASE}/api/v1/conventions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify(convention),
            });
            const json = await res.json();
            if (res.status === 201) {
                created++;
                console.log(`✓ created    ${convention.name}`);
            } else if (res.status === 200 && json.duplicate) {
                duplicates++;
                console.log(`= duplicate  ${convention.name}`);
            } else {
                failed++;
                console.error(`✗ failed     ${convention.name}: ${res.status} ${JSON.stringify(json)}`);
            }
        } catch (err) {
            failed++;
            console.error(`✗ failed     ${convention.name}: ${err.message}`);
        }
    }
    console.log(`\nDone. Created: ${created}, duplicates skipped: ${duplicates}, failed: ${failed}`);
    if (failed > 0) process.exitCode = 1;
}

main();
