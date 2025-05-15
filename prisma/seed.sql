-- Insert the Organizer user
INSERT INTO "User" (id, name, email, "hashedPassword", roles, "createdAt", "updatedAt")
VALUES 
('cmaoe8h3w0001eiugajv1dvb4', 'Organizer User', 'magicjafo@gmail.com', '$2a$12$8K1p/a0dR1LXMIgoEDFrwOQ8P3tUv49FC5U1E/4aRUr0GJh5WJQHy', ARRAY['ORGANIZER']::"Role"[], NOW(), NOW());

-- Insert Convention Series
INSERT INTO "ConventionSeries" (id, name, slug, description, "organizerUserId", "createdAt", "updatedAt")
VALUES 
('cs_magifest', 'Magi-Fest', 'magifest', 'One of the premier magic conventions in America, known for its intimate atmosphere and high-quality programming.', 'cmaoe8h3w0001eiugajv1dvb4', NOW(), NOW()),
('cs_magiclive', 'Magic Live', 'magic-live', 'A world-class magic convention in Las Vegas featuring top performers and exclusive content.', 'cmaoe8h3w0001eiugajv1dvb4', NOW(), NOW()),
('cs_ibm', 'IBM Convention', 'ibm-convention', 'The International Brotherhood of Magicians annual convention, bringing together magicians from around the world.', 'cmaoe8h3w0001eiugajv1dvb4', NOW(), NOW()),
('cs_sam', 'SAM Convention', 'sam-convention', 'The Society of American Magicians annual gathering of magic enthusiasts and professionals.', 'cmaoe8h3w0001eiugajv1dvb4', NOW(), NOW()),
('cs_blackpool', 'Blackpool Magic Convention', 'blackpool-magic', 'Europe''s largest magic convention, held annually in Blackpool, UK.', 'cmaoe8h3w0001eiugajv1dvb4', NOW(), NOW()),
('cs_fism', 'FISM World Championship', 'fism-world', 'The World Championship of Magic, held every three years in different locations worldwide.', 'cmaoe8h3w0001eiugajv1dvb4', NOW(), NOW());

-- Insert Conventions
INSERT INTO "Convention" (id, name, slug, "startDate", "endDate", city, "stateAbbreviation", "stateName", country, "venueName", description, "websiteUrl", "organizerUserId", status, type, "seriesId", "createdAt", "updatedAt")
VALUES 
-- Magi-Fest 2026
('conv_magifest_2026', 'Magi-Fest 2026', 'magifest-2026', '2026-01-22', '2026-01-24', 'Columbus', 'OH', 'Ohio', 'USA', 'Renaissance Columbus Downtown', 'Magi-Fest 2026 brings together the best performers in the world for an inspiring weekend of magic. Features workshops, performances, and the largest dealers room of any magic convention in America.', 'https://www.vanishingincmagic.com/magifest/', 'cmaoe8h3w0001eiugajv1dvb4', 'DRAFT', 'GENERAL', 'cs_magifest', NOW(), NOW()),

-- Magic Live 2025
('conv_magiclive_2025', 'Magic Live 2025', 'magic-live-2025', '2025-08-03', '2025-08-06', 'Las Vegas', 'NV', 'Nevada', 'USA', 'The Orleans Hotel & Casino', 'Magic Live 2025 offers a unique convention experience with special performances, focus sessions, and exclusive content from top magicians.', 'https://www.magiclive.com', 'cmaoe8h3w0001eiugajv1dvb4', 'DRAFT', 'GENERAL', 'cs_magiclive', NOW(), NOW()),

-- IBM Convention 2025
('conv_ibm_2025', 'IBM Convention 2025', 'ibm-convention-2025', '2025-07-01', '2025-07-04', 'Louisville', 'KY', 'Kentucky', 'USA', 'Galt House Hotel', 'The International Brotherhood of Magicians annual convention featuring competitions, lectures, and performances from international magic stars.', 'https://www.magician.org', 'cmaoe8h3w0001eiugajv1dvb4', 'DRAFT', 'GENERAL', 'cs_ibm', NOW(), NOW()),

-- SAM Convention 2025
('conv_sam_2025', 'SAM Convention 2025', 'sam-convention-2025', '2025-06-15', '2025-06-18', 'Chicago', 'IL', 'Illinois', 'USA', 'Hyatt Regency Chicago', 'The Society of American Magicians annual convention with workshops, competitions, and performances from top magicians.', 'https://www.magicsam.com', 'cmaoe8h3w0001eiugajv1dvb4', 'DRAFT', 'GENERAL', 'cs_sam', NOW(), NOW()),

-- Blackpool Magic Convention 2025
('conv_blackpool_2025', 'Blackpool Magic Convention 2025', 'blackpool-magic-2025', '2025-02-14', '2025-02-16', 'Blackpool', NULL, NULL, 'United Kingdom', 'Winter Gardens', 'Europe''s largest magic convention featuring international performers, competitions, and a massive dealers room.', 'https://www.blackpoolmagic.com', 'cmaoe8h3w0001eiugajv1dvb4', 'DRAFT', 'GENERAL', 'cs_blackpool', NOW(), NOW()),

-- FISM World Championship 2025
('conv_fism_2025', 'FISM World Championship 2025', 'fism-world-2025', '2025-07-25', '2025-07-31', 'Quebec City', NULL, NULL, 'Canada', 'Quebec City Convention Centre', 'The World Championship of Magic featuring the best magicians from around the globe competing for the title of World Champion.', 'https://www.fism.org', 'cmaoe8h3w0001eiugajv1dvb4', 'DRAFT', 'GENERAL', 'cs_fism', NOW(), NOW()); 