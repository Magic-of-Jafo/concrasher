--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: jafo38583
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO jafo38583;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: jafo38583
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ApplicationStatus; Type: TYPE; Schema: public; Owner: jafo38583
--

CREATE TYPE public."ApplicationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ApplicationStatus" OWNER TO jafo38583;

--
-- Name: ConventionStatus; Type: TYPE; Schema: public; Owner: jafo38583
--

CREATE TYPE public."ConventionStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'PAST',
    'CANCELLED'
);


ALTER TYPE public."ConventionStatus" OWNER TO jafo38583;

--
-- Name: RequestedRole; Type: TYPE; Schema: public; Owner: jafo38583
--

CREATE TYPE public."RequestedRole" AS ENUM (
    'ORGANIZER'
);


ALTER TYPE public."RequestedRole" OWNER TO jafo38583;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: jafo38583
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ORGANIZER',
    'TALENT',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO jafo38583;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public."Account" OWNER TO jafo38583;

--
-- Name: Convention; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."Convention" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    city text,
    country text,
    "venueName" text,
    "websiteUrl" text,
    status public."ConventionStatus" DEFAULT 'DRAFT'::public."ConventionStatus" NOT NULL,
    "galleryImageUrls" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stateAbbreviation" text,
    "stateName" text,
    "seriesId" text,
    "deletedAt" timestamp(3) without time zone,
    "coverImageUrl" text,
    "descriptionMain" text,
    "descriptionShort" text,
    "isOneDayEvent" boolean DEFAULT false NOT NULL,
    "isTBD" boolean DEFAULT false NOT NULL,
    "profileImageUrl" text,
    timezone text,
    "guestsStayAtPrimaryVenue" boolean DEFAULT false
);


ALTER TABLE public."Convention" OWNER TO jafo38583;

--
-- Name: ConventionScheduleItem; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."ConventionScheduleItem" (
    id text NOT NULL,
    "conventionId" text NOT NULL,
    title text NOT NULL,
    description text,
    "locationName" text,
    "venueId" text,
    "order" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "eventType" text NOT NULL,
    "atPrimaryVenue" boolean NOT NULL,
    "dayOffset" integer,
    "durationMinutes" integer,
    "startTimeMinutes" integer,
    "scheduleDayId" text
);


ALTER TABLE public."ConventionScheduleItem" OWNER TO jafo38583;

--
-- Name: ConventionSeries; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."ConventionSeries" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "organizerUserId" text NOT NULL,
    "logoUrl" text,
    slug text NOT NULL
);


ALTER TABLE public."ConventionSeries" OWNER TO jafo38583;

--
-- Name: Hotel; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."Hotel" (
    id text NOT NULL,
    "conventionId" text NOT NULL,
    "isPrimaryHotel" boolean DEFAULT false NOT NULL,
    "isAtPrimaryVenueLocation" boolean DEFAULT false NOT NULL,
    "hotelName" text NOT NULL,
    description text,
    "websiteUrl" text,
    "googleMapsUrl" text,
    "streetAddress" text,
    city text,
    "stateRegion" text,
    "postalCode" text,
    country text,
    "contactEmail" text,
    "contactPhone" text,
    "groupRateOrBookingCode" text,
    "groupPrice" text,
    "bookingLink" text,
    "bookingCutoffDate" timestamp(3) without time zone,
    amenities text[],
    "parkingInfo" text,
    "publicTransportInfo" text,
    "overallAccessibilityNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Hotel" OWNER TO jafo38583;

--
-- Name: HotelPhoto; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."HotelPhoto" (
    id text NOT NULL,
    "hotelId" text NOT NULL,
    url text NOT NULL,
    caption text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HotelPhoto" OWNER TO jafo38583;

--
-- Name: PriceDiscount; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."PriceDiscount" (
    id text NOT NULL,
    "conventionId" text NOT NULL,
    "cutoffDate" timestamp(3) without time zone NOT NULL,
    "priceTierId" text NOT NULL,
    "discountedAmount" numeric(65,30) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PriceDiscount" OWNER TO jafo38583;

--
-- Name: PriceTier; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."PriceTier" (
    id text NOT NULL,
    "conventionId" text NOT NULL,
    label text NOT NULL,
    amount numeric(65,30) NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PriceTier" OWNER TO jafo38583;

--
-- Name: RoleApplication; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."RoleApplication" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "requestedRole" public."RequestedRole" NOT NULL,
    status public."ApplicationStatus" DEFAULT 'PENDING'::public."ApplicationStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RoleApplication" OWNER TO jafo38583;

--
-- Name: ScheduleDay; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."ScheduleDay" (
    id text NOT NULL,
    "conventionId" text NOT NULL,
    "dayOffset" integer NOT NULL,
    "isOfficial" boolean NOT NULL,
    label text
);


ALTER TABLE public."ScheduleDay" OWNER TO jafo38583;

--
-- Name: ScheduleEventBrandLink; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."ScheduleEventBrandLink" (
    id text NOT NULL,
    "scheduleItemId" text NOT NULL,
    "brandProfileId" text NOT NULL
);


ALTER TABLE public."ScheduleEventBrandLink" OWNER TO jafo38583;

--
-- Name: ScheduleEventFeeTier; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."ScheduleEventFeeTier" (
    id text NOT NULL,
    "scheduleItemId" text NOT NULL,
    label text NOT NULL,
    amount numeric(65,30) NOT NULL
);


ALTER TABLE public."ScheduleEventFeeTier" OWNER TO jafo38583;

--
-- Name: ScheduleEventTalentLink; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."ScheduleEventTalentLink" (
    id text NOT NULL,
    "scheduleItemId" text NOT NULL,
    "talentProfileId" text NOT NULL
);


ALTER TABLE public."ScheduleEventTalentLink" OWNER TO jafo38583;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO jafo38583;

--
-- Name: User; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "hashedPassword" text,
    roles public."Role"[] DEFAULT ARRAY['USER'::public."Role"],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    bio text,
    "resetToken" text,
    "resetTokenExpiry" timestamp(3) without time zone,
    timezone text
);


ALTER TABLE public."User" OWNER TO jafo38583;

--
-- Name: Venue; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."Venue" (
    id text NOT NULL,
    "conventionId" text NOT NULL,
    "isPrimaryVenue" boolean DEFAULT false NOT NULL,
    "venueName" text NOT NULL,
    description text,
    "websiteUrl" text,
    "googleMapsUrl" text,
    "streetAddress" text,
    city text,
    "stateRegion" text,
    "postalCode" text,
    country text,
    "contactEmail" text,
    "contactPhone" text,
    amenities text[],
    "parkingInfo" text,
    "publicTransportInfo" text,
    "overallAccessibilityNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Venue" OWNER TO jafo38583;

--
-- Name: VenuePhoto; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."VenuePhoto" (
    id text NOT NULL,
    "venueId" text NOT NULL,
    url text NOT NULL,
    caption text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VenuePhoto" OWNER TO jafo38583;

--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VerificationToken" OWNER TO jafo38583;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: jafo38583
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO jafo38583;

--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: Convention; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."Convention" (id, name, slug, "startDate", "endDate", city, country, "venueName", "websiteUrl", status, "galleryImageUrls", "createdAt", "updatedAt", "stateAbbreviation", "stateName", "seriesId", "deletedAt", "coverImageUrl", "descriptionMain", "descriptionShort", "isOneDayEvent", "isTBD", "profileImageUrl", timezone, "guestsStayAtPrimaryVenue") FROM stdin;
cmash9ome002teirgpzbg567n	Abano National Convention 2025	abano-national-convention-2025	2025-09-26 04:00:00	2025-09-28 04:00:00	Abano	Italy	\N	https://www.clubmagicoitaliano.it/congressocmi/congresso	PUBLISHED	{}	2025-05-17 17:04:51.686	2025-05-17 17:04:51.686	\N	Padua	cmasg3l3u008teif8qj4i65vz	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9omz0031eirgkft5zfue	Blackpool Convention 2026	blackpool-convention-2026	2026-02-19 05:00:00	2026-02-22 05:00:00	Blackpool	England	\N	https://blackpoolmagicconvention.com/	PUBLISHED	{}	2025-05-17 17:04:51.707	2025-05-17 17:04:51.707	\N	\N	cmasg3ld200cfeif8nsnvvm05	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oni003beirgp3gmrkkp	Festival de Magie de Qu├⌐bec 2025	festival-de-magie-de-quebec-2025	2025-09-19 04:00:00	2025-09-22 04:00:00	Qu├⌐bec	Canada	\N	http://www.festivaldemagie.ca	PUBLISHED	{}	2025-05-17 17:04:51.727	2025-05-17 17:04:51.727	\N	\N	cmasg3l2e0089eif8n36iomv2	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9onq003feirg3v09hmyy	FISM 2025	fism-2025	2025-07-14 04:00:00	2025-07-19 04:00:00	Turin	Italy	\N	https://fismitaly2025.com	PUBLISHED	{}	2025-05-17 17:04:51.734	2025-05-17 17:04:51.734	\N	\N	cmasg3kq5003jeif8c0bd8ywl	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9onu003heirgf0qmsuwm	Flasoma 2026	flasoma-2026	2026-02-11 05:00:00	2026-02-15 05:00:00	Cali	Colombia	\N	https://flasomacali2025.com	PUBLISHED	{}	2025-05-17 17:04:51.738	2025-05-17 17:04:51.738	\N	\N	cmasg3lcd00c5eif8ghan0m9y	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9ony003jeirgbsbujf8p	French Championship of Magic 2025	french-championship-of-magic-2025	2025-10-03 04:00:00	2025-10-06 04:00:00	Palais des Congr├¿s	France	\N	https://congresffap.com/	PUBLISHED	{}	2025-05-17 17:04:51.742	2025-05-17 17:04:51.742	\N	\N	cmasg3kx8006beif831jdepz7	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oo2003leirgy7vmc1pv	Fr├╢hlich Magic Convention 2025	frohlich-magic-convention-2025	2025-09-05 04:00:00	2025-09-08 04:00:00	Bad Aussee	Austria	\N	https://zauberfestival.life/	PUBLISHED	{}	2025-05-17 17:04:51.746	2025-05-17 17:04:51.746	\N	Salzburg	cmasg3l5a009deif8ifd8m6hi	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oo9003peirgc7ed8u80	IBM British Ring Convention 2025	ibm-british-ring-convention-2025	2025-09-13 04:00:00	2025-09-15 04:00:00	Eastbourne	UK	\N	https://britishring.org.uk/convention-countdown/	PUBLISHED	{}	2025-05-17 17:04:51.753	2025-05-17 17:04:51.753	\N	England	cmasg3kze0075eif8y4g4ecym	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oot003zeirgel5pacsz	Magialdia Magic Festival 2025	magialdia-magic-festival-2025	2025-09-16 04:00:00	2025-09-22 04:00:00	Vitoria	Spain	\N	http://magialdia.com/	PUBLISHED	{}	2025-05-17 17:04:51.774	2025-05-17 17:04:51.774	\N	\N	cmasg3l05007feif8ooai5dmy	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9opd0049eirg44z8wulk	MAGICA ΓÇô The German Championship of Magic Art 2025	magica-the-german-championship-of-magic-art-2025	2025-10-09 04:00:00	2025-10-12 04:00:00	L├╝beck	Germany	\N	https://zauberkongress.de/	PUBLISHED	{}	2025-05-17 17:04:51.793	2025-05-17 17:04:51.793	\N	\N	cmasg3l5y009neif83ceb6sbh	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oox0041eirgnwxahsdw	Magic at the Beach 2025	magic-at-the-beach-2025	2025-09-11 04:00:00	2025-09-13 04:00:00	Myrtle Beach	United States	\N	https://www.magicatthebeach.org/	PUBLISHED	{}	2025-05-17 17:04:51.778	2025-05-17 22:49:04.377	\N	South Carolina	cmasg3kyp006veif88i1pz05b	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9op10043eirge67jzhly	Magic Capital Close-Up Convention 2026	magic-capital-close-up-convention-2026	2026-03-13 04:00:00	2026-03-14 04:00:00	Colon	United States	\N	https://magiccapitalcloseup.com/	PUBLISHED	{}	2025-05-17 17:04:51.782	2025-05-17 22:48:53.999	\N	Michigan	cmasg3ldq00cpeif80gvab5he	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9opw004jeirg4stx6grg	Melbourne Magic Festival 2025	melbourne-magic-festival-2025	2025-07-07 04:00:00	2025-07-19 04:00:00	Melbourne	Australia	\N	https://melbournemagicfestival.com/	PUBLISHED	{}	2025-05-17 17:04:51.812	2025-05-17 17:04:51.812	\N	Victoria	cmasg3kor002zeif8kerqlog0	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oq8004peirgvb6assyr	Original Close-Up Magic Symposium 2025	original-close-up-magic-symposium-2025	2025-09-18 04:00:00	2025-09-20 04:00:00	Wien	Austria	\N	https://magic-theater.at/index.php?c=category&id=7	PUBLISHED	{}	2025-05-17 17:04:51.824	2025-05-17 17:04:51.824	\N	\N	cmasg3l0t007peif8rr3yjhbl	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oqj004veirgcsqy7kh9	South Tyneside International Magic Festival 2025	south-tyneside-international-magic-festival-2025	2025-10-12 04:00:00	2025-10-13 04:00:00	South Shields	UK	\N	https://campaigns.southtyneside.gov.uk/magic-festival/	PUBLISHED	{}	2025-05-17 17:04:51.835	2025-05-17 17:04:51.835	\N	England	cmasg3l7d00a7eif8xb5y7d0q	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9or80057eirggwzrchnv	TRICS (Carolina Close-Up Convention) 2025	trics-carolina-close-up-convention-2025	2025-11-06 05:00:00	2025-11-08 05:00:00	Charlotte	United States	\N	http://tricsconvention.com/	PUBLISHED	{}	2025-05-17 17:04:51.861	2025-05-20 04:03:43.351		North Carolina	cmasg3l8300aheif8rddlce3i	\N	\N			f	f	\N	\N	t
cmash9or40055eirgc7jv3ygo	The Session 2026	the-session-2026	2026-01-09 05:00:00	2026-01-11 05:00:00	London	United States	\N	https://www.vanishingincmagic.com/magic-conventions/register/tickets/?convention=28078	PUBLISHED	{}	2025-05-17 17:04:51.857	2025-05-21 20:27:15.628	MI	Michigan	cmasg3la600bbeif8wjc93wbv	\N	\N			f	f	\N	\N	f
cmash9op90047eirgjj3fmx9c	Magic Valley Magic Convention 2025	magic-valley-magic-convention-2025	2025-10-10 04:00:00	2025-10-12 04:00:00	Clanton	United States	\N	http://www.magicvalleymagic.net	PUBLISHED	{}	2025-05-17 17:04:51.789	2025-05-17 22:48:53.999	\N	Alabama	cmasg3l6o009xeif8dzwh6tvt	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oph004beirgmzprjkdx	MagiFest 2026	magifest-2026	2026-01-23 05:00:00	2026-01-25 05:00:00	Columbus	United States	\N	https://www.vanishingincmagic.com/magic-conventions/magifest/	PUBLISHED	{}	2025-05-17 17:04:51.797	2025-05-17 22:48:53.999	\N	Ohio	cmasg3lax00bleif82n4s9w0v	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9opo004feirg4ftffng3	Magi-Whirl 2025	magi-whirl-2025	2025-08-29 04:00:00	2025-08-31 04:00:00	Washington	United States	\N	https://magi-whirl.org	PUBLISHED	{}	2025-05-17 17:04:51.804	2025-05-17 22:48:53.999			cmasg3kuc0057eif8m4fdzwht	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9ops004heirgol098fkh	MAWNY 2025	mawny-2025	2025-04-27 04:00:00	2025-04-27 04:00:00	Batavia	United States	\N	http://www.mawny.org	PAST	{}	2025-05-17 17:04:51.809	2025-05-17 22:48:53.999	\N	New York	cmasg3kl3001leif86vq1co19	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oq0004leirgapb1fsjy	Michigan Magic Day 2025	michigan-magic-day-2025	2025-05-16 04:00:00	2025-05-17 04:00:00	Detroit	United States	\N	https://detroitmagic.club/michigan-magic-day-2025/	PUBLISHED	{}	2025-05-17 17:04:51.816	2025-05-17 22:48:53.999	\N	Michigan	cmasg3kna002feif8743ltjw9	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oq3004neirgqmfex8xt	New York Magic Conference 2025	new-york-magic-conference-2025	2025-09-27 04:00:00	2025-09-29 04:00:00	Callicoon	United States	\N	https://newyorkmagicconference.com/	PUBLISHED	{}	2025-05-17 17:04:51.82	2025-05-17 22:48:53.999	\N	New York	cmasg3l4j0093eif81gb3k7pj	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9op50045eirgd2pmfjpk	MAGIC Live! 2025	magic-live-2025	2025-08-03 04:00:00	2025-08-06 04:00:00	Las Vegas	United States	\N	https://www.magicconvention.com/	PUBLISHED	{}	2025-05-17 17:04:51.785	2025-05-17 22:48:53.999	\N	Nevada	cmasg3ks8004deif8ycwmqvgv	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oqc004reirgirabtypl	Poe's Magic Conference 2025	poes-magic-conference-2025	2025-08-21 04:00:00	2025-08-24 04:00:00	Baltimore	United States	\N	https://poesmagicconference.com/	PUBLISHED	{}	2025-05-17 17:04:51.828	2025-05-17 22:48:53.999	\N	Maryland	cmasg3ktn004xeif8vl6amaiq	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oqf004teirgaj90nwis	Portland Magic Jam 2025	portland-magic-jam-2025	2025-04-04 04:00:00	2025-04-06 04:00:00	Portland	United States	Portland Airport Sheraton Inn	https://pdxmagicjam.com/	PAST	{}	2025-05-17 17:04:51.832	2025-05-17 22:48:53.999	\N	Oregon	cmasg3kgc0007eif866qowd02	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oqv0051eirgv7ccraau	The Conjuror Community Summit 2025	the-conjuror-community-summit-2025	2025-09-26 04:00:00	2025-09-28 04:00:00	Baltimore	United States	\N	https://conjurorcommunitysummit.com	PUBLISHED	{}	2025-05-17 17:04:51.847	2025-05-17 22:48:53.999	\N	Maryland	cmasg3l33008jeif8j5vkwi23	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oqz0053eirgingr15m7	The Gateway Close-Up Gathering 2026	the-gateway-close-up-gathering-2026	2026-03-26 04:00:00	2026-03-28 04:00:00	Collinsville	United States	\N	https://www.baskervilleproductions.com/gateway2024	PUBLISHED	{}	2025-05-17 17:04:51.851	2025-05-17 22:48:53.999	\N	Illinois	cmasg3khb000heif8ks0wsae4	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oqr004zeirg4jnzg2i4	Texas Association of Magicians (T.A.O.M.) 2025	taom-2025	2025-08-29 04:00:00	2025-08-30 04:00:00	Dallas	United States	\N	https://taom.org	PUBLISHED	{}	2025-05-17 17:04:51.843	2025-05-24 21:30:15.97	TX	Texas	cmasg3kv3005heif8xze7fslo	\N	\N			f	f	\N	\N	f
cmash9orc0059eirgz2vw1g77	WonderBash 2025	wonderbash-2025	2025-04-10 04:00:00	2025-04-12 04:00:00	Grand Rapids	United States	\N	https://morethantricks.com	PAST	{}	2025-05-17 17:04:51.865	2025-05-17 22:48:53.999	\N	Michigan	cmasg3kiy0011eif83c0pu7vv	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9omm002veirgjvpu7p7f	Abbott's Get Together 2025	abbotts-get-together-2025	2025-07-30 04:00:00	2025-08-02 04:00:00	Colon	United States	\N	https://www.magicgettogether.com/	PUBLISHED	{}	2025-05-17 17:04:51.695	2025-05-17 22:48:53.999	\N	Michigan	cmasg3krj0043eif8kp9ach9l	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9omr002xeirgfb20tri4	AbraCORNdabra 2025	abracorndabra-2025	2025-05-16 04:00:00	2025-05-18 04:00:00	Des Moines	United States	\N	http://abracorndabra.com/	PUBLISHED	{}	2025-05-17 17:04:51.699	2025-05-17 22:48:53.999	\N	Iowa	cmasg3kmk0025eif88grqswiz	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9omu002zeirgbtewzzhw	Another Darn Convention 2025	another-darn-convention-2025	2025-04-03 04:00:00	2025-04-05 04:00:00	Cincinnati	United States	\N	https://admcmagicconvention.com/	PAST	{}	2025-05-17 17:04:51.703	2025-05-17 22:48:53.999	\N	Ohio	cmasg3ki5000reif8lx5av41e	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9on30033eirgnj9cgaf4	Collector's Expo 2025	collectors-expo-2025	2025-05-05 04:00:00	2025-05-07 04:00:00	Las Vegas	United States	\N	https://magiccollectorexpo.com/	PAST	{}	2025-05-17 17:04:51.711	2025-05-17 22:48:53.999	\N	Nevada	cmasg3klv001veif811tzk4ht	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9on70035eirg6h1a428y	DC Festival of Magic 2025	dc-festival-of-magic-2025	2025-08-29 04:00:00	2025-09-01 04:00:00	Washington	United States	\N	https://www.dcmagicfestival.com/	PUBLISHED	{}	2025-05-17 17:04:51.715	2025-05-17 22:48:53.999	\N	DC	cmasg3kvt005reif829d2fau5	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9ona0037eirghg428jsz	East Coast Spirit Sessions 9	east-coast-spirit-sessions-9	2026-01-11 05:00:00	2026-01-14 05:00:00	Myrtle Beach	United States	\N	https://tinyurl.com/East-Coast-Spirit-Session-9	PUBLISHED	{}	2025-05-17 17:04:51.719	2025-05-17 22:48:53.999	\N	South Carolina	cmasg3l8s00areif8fbuq8ix1	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9one0039eirg8a8bqj5z	FCM International Convention 2025	fcm-international-convention-2025	2025-07-27 04:00:00	2025-07-31 04:00:00	Danville	United States	\N	https://convention.fcm.org	PUBLISHED	{}	2025-05-17 17:04:51.723	2025-05-17 22:48:53.999	\N	Indiana	cmasg3kqv003teif80nbo3ex4	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9onm003deirgjvuwmyt1	FFFF 2025	ffff-2025	2025-04-23 04:00:00	2025-04-26 04:00:00	Buffalo	United States	\N	http://www.ffffmagic.com/	PAST	{}	2025-05-17 17:04:51.73	2025-05-17 22:48:53.999	\N	New York	cmasg3kk2001beif8fsfzujyu	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oo5003neirgv64pdand	Gator Gate Gathering 2026	gator-gate-gathering-2026	2026-01-11 05:00:00	2026-01-13 05:00:00	Orlando	United States	\N	https://www.facebook.com/GatorGateGathering	PUBLISHED	{}	2025-05-17 17:04:51.75	2025-05-17 22:48:53.999	\N	Florida	cmasg3l9h00b1eif881m2kne4	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9ooh003teirgulf6d692	Kapital Konvention 2026	kapital-konvention-2026	2026-01-30 05:00:00	2026-02-01 05:00:00	Washington	United States	\N	https://www.kapitalkidvention.com/	PUBLISHED	{}	2025-05-17 17:04:51.762	2025-05-17 22:48:53.999	\N	DC	cmasg3lbn00bveif8wdjxfe8e	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9ool003veirgsrdn6k3t	KIDabra 2025	kidabra-2025	2025-08-13 04:00:00	2025-08-16 04:00:00	Chattanooga	United States	\N	https://www.kidabra.org/	PUBLISHED	{}	2025-05-17 17:04:51.766	2025-05-17 22:48:53.999	\N	Tennessee	cmasg3ksw004neif8we0usrks	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9oop003xeirgf2d9pkjr	Magicians' Alliance of Eastern States 2025	maes-2025	2025-09-05 04:00:00	2025-09-07 04:00:00	Cherry Hills	United States	\N	https://maesconvention.com/	PUBLISHED	{}	2025-05-17 17:04:51.769	2025-05-17 22:48:53.999	\N	New Jersey	cmasg3kwk0061eif83pprh6ev	\N	\N	\N	\N	f	f	\N	\N	\N
cmash9ood003reirghnb26oht	IBM Convention 2025	ibm-convention-2025	2025-07-09 04:00:00	2025-07-12 04:00:00	Houston	United States	\N	https://www.ibmconvention.com	PUBLISHED	{}	2025-05-17 17:04:51.758	2025-06-05 21:27:51.105		Texas	cmasg3kph0039eif8ng2n0e71	\N	\N			f	f	\N	\N	f
cmash9opk004deirgi05cmepw	Magistrorum 2025	magistrorum-2025	2025-09-18 04:00:00	2025-09-21 04:00:00	Las Colinas	United States	\N	https://www.magistrorum.net/	PUBLISHED	{}	2025-05-17 17:04:51.801	2025-05-24 22:01:14.829	TX	Texas	cmasg3l1j007zeif8hrgxqk8t	\N	\N	<p data-start="75" data-end="135"><strong data-start="75" data-end="135">Magistrorum: A Gathering of Masters in the Mystical Arts</strong></p>\n<p data-start="137" data-end="352">The <em data-start="141" data-end="183">Magistrorum Magic &amp; Mentalism Convention</em> brings together world-class magicians, mentalists, and performers&mdash;including the legendary Jeff McBride&mdash;for four unforgettable days of mystery, performance, and insight.</p>\n<p data-start="354" data-end="449">Join us at the <strong data-start="369" data-end="400">Marriott Dallas Las Colinas</strong>, September 18&ndash;21, 2025. The convention features:</p>\n<ul data-start="451" data-end="623">\n<li data-start="451" data-end="474">\n<p data-start="453" data-end="474">Full-day performances</p>\n</li>\n<li data-start="475" data-end="510">\n<p data-start="477" data-end="510">5-star lectures from top creators</p>\n</li>\n<li data-start="511" data-end="554">\n<p data-start="513" data-end="554">Late-night shows and underground sessions</p>\n</li>\n<li data-start="555" data-end="623">\n<p data-start="557" data-end="623">A massive Dealers Hall with exclusive magic and mentalism products</p>\n</li>\n</ul>\n<p data-start="625" data-end="795">In the lead-up to the event, we host <strong data-start="662" data-end="688">weekly Zoom gatherings</strong> every Tuesday at 6 PM Central (link posted here), where we explore topics in mentalism and bizarre magick.</p>\n<p data-start="797" data-end="929">Whether you're a seasoned performer or passionate student, Magistrorum offers a rare opportunity to learn, connect, and be inspired.</p>	Magistrorum is a four-day convention celebrating magic and mentalism, featuring world-class performers like Jeff McBride. Held at the Marriott Dallas Las Colinas (Sept 18ΓÇô21, 2025), the event includes full-day shows, expert lectures, late-night performances, and a large Dealers Hall. Weekly Zoom sessions every Tuesday at 6 PM CT offer ongoing discussions on mentalism and bizarre magick.	f	f	\N	\N	t
cmash9oqn004xeirggiomuld6	Tampa Bay Festival of Magic 2025	tampa-bay-festival-of-magic-2025	2025-05-31 04:00:00	2025-05-31 04:00:00	Tampa	United States	\N	https://www.tampamagicclub.com/festival-of-magic-1.html	PUBLISHED	{}	2025-05-17 17:04:51.839	2025-05-22 23:31:13.346	FL	Florida	cmasg3ko1002peif8h3122cfl	\N	\N	<div class="imTACenter"><span class="fs18lh1-5"><strong><span class="cf2">Call Ken Spanola BEFORE paying/registering for a Magic Marketplace TABLE or to enter the MAGIC COMPETITION.</span></strong></span></div>\n<div class="imTACenter">&nbsp;</div>\n<div class="imTACenter"><span class="fs18lh1-5">TWO Amazing&nbsp;<strong><span class="cf1">Lectures</span></strong> by<br><span class="cf1">Dan Fleshman and Jimmy Ichihana</span><br></span><span class="fs18lh1-5">Our&nbsp;<strong><span class="cf1">Magic Marketplace</span></strong></span><span class="fs18lh1-5"><br></span></div>\n<div class="imTACenter"><span class="fs18lh1-5">with Flea Market and Dealer tables<br>will start the event.</span></div>\n<div class="imTACenter"><span class="fs18lh1-5">And For The First Time...</span></div>\n<div class="imTACenter"><span class="fs18lh1-5">The Tampa Magic Club's&nbsp;</span><strong class="imUl fs18lh1-5"><span class="cf1">Magic Competition</span><br></strong><strong class="imUl"><span class="cf2"><span class="fs18lh1-5">with a&nbsp;</span><span class="fs24lh1-5">$100 prize</span></span></strong><strong class="fs18lh1-5">&nbsp;for the winner</strong><span class="fs18lh1-5">!!!</span></div>\n<div class="imTACenter"><span class="fs14lh1-5">The competition will be limited to 10 excellent magicians (see Contest Rules below).</span></div>\n<div class="imTACenter">&nbsp;</div>\n<div class="imTACenter"><strong><span class="fs18lh1-5">This will be a FULL - Fun day of magic!</span></strong></div>\n<div class="imTACenter"><strong><span class="fs14lh1-5 cf2">* TWO Outstanding&nbsp;<span class="imUl">Lectures</span></span></strong></div>\n<div class="imTACenter"><strong><span class="fs14lh1-5 cf2">*&nbsp;</span><span class="fs14lh1-5">An exciting</span><span class="fs14lh1-5 cf2">&nbsp;<span class="imUl">Magic Competition</span></span></strong></div>\n<div class="imTACenter"><strong><span class="fs14lh1-5 cf2">*&nbsp;<span class="imUl">Magic Marketplace</span>&nbsp;</span><span class="fs14lh1-5">with Flea Market and Dealers Tables</span></strong></div>\n<div class="imTACenter"><span class="fs14lh1-5"><strong><span class="cf2">* Special&nbsp;</span></strong><span class="cf2">commemorative</span><strong><span class="cf2">&nbsp;<span class="imUl">swag</span>&nbsp;for registrants</span></strong></span></div>\n<div class="imTACenter"><strong class="fs18lh1-5">This is a day you don't want to miss.</strong></div>\n<div class="imTACenter">&nbsp;</div>		t	f	\N	\N	f
\.


--
-- Data for Name: ConventionScheduleItem; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."ConventionScheduleItem" (id, "conventionId", title, description, "locationName", "venueId", "order", "createdAt", "updatedAt", "eventType", "atPrimaryVenue", "dayOffset", "durationMinutes", "startTimeMinutes", "scheduleDayId") FROM stdin;
cmb2k8n7y0015eixo6o1zqzyv	cmash9ool003veirgsrdn6k3t	Registration Opens	Optional Pre-Conference	\N	\N	\N	2025-05-24 18:25:43.822	2025-05-24 18:25:43.822	Other	f	0	30	510	cmb2k00yn000xeixon4qhsolh
cmb2k8n840017eixoat9ytfcv	cmash9ool003veirgsrdn6k3t	TBA	ShowSkills Workshop	\N	\N	\N	2025-05-24 18:25:43.828	2025-05-24 18:25:43.828	Workshop	f	0	90	540	cmb2k00yn000xeixon4qhsolh
cmb2k8n890019eixo6p5r6vou	cmash9ool003veirgsrdn6k3t	Be Seen on Social Media	Jason Fun	\N	\N	\N	2025-05-24 18:25:43.833	2025-05-24 18:25:43.833	Workshop	f	0	90	630	cmb2k00yn000xeixon4qhsolh
cmb2k8n8e001beixomlbqmme9	cmash9ool003veirgsrdn6k3t	Lunch	\N	\N	\N	\N	2025-05-24 18:25:43.838	2025-05-24 18:25:43.838	Other	f	0	60	720	cmb2k00yn000xeixon4qhsolh
cmb2k8n8j001deixodqfc2593	cmash9ool003veirgsrdn6k3t	Email for Booking	Chad Jacobs / Chef Bananas: Using email routines, automations, CRMs and AI for bookings	\N	\N	\N	2025-05-24 18:25:43.843	2025-05-24 18:25:43.843	Workshop	f	0	90	840	cmb2k00yn000xeixon4qhsolh
cmb2k8n8n001feixojm1tcegl	cmash9ool003veirgsrdn6k3t	WE - Client Relations	Chris Weed: Building Better, More Profitable and More Productive Client Relations	\N	\N	\N	2025-05-24 18:25:43.847	2025-05-24 18:25:43.847	Workshop	f	0	90	990	cmb2k00yn000xeixon4qhsolh
cmb2k8n8s001heixoej2dj4x9	cmash9ool003veirgsrdn6k3t	Registration Opens	KIDabra Conference Begins	\N	\N	\N	2025-05-24 18:25:43.852	2025-05-24 18:25:43.852	Other	f	0	120	1020	cmb2k00yn000xeixon4qhsolh
cmb2k8n8w001jeixo0ogmru67	cmash9ool003veirgsrdn6k3t	Welcome Ceremony	With Mark Daniel & Ken Scott and Special Event from Christopher T. Magician	\N	\N	\N	2025-05-24 18:25:43.857	2025-05-24 18:25:43.857	Show	f	0	60	1140	cmb2k00yn000xeixon4qhsolh
cmb2k8n90001leixo81i5dxlm	cmash9ool003veirgsrdn6k3t	Kid Show Magic Auction	Auctioneer: Tim Pressley with Buster	\N	\N	\N	2025-05-24 18:25:43.86	2025-05-24 18:25:43.86	Other	f	0	90	1200	cmb2k00yn000xeixon4qhsolh
cmb2k9hhd001neixom03kgosx	cmash9ool003veirgsrdn6k3t	Registration Opens	\N	\N	\N	\N	2025-05-24 18:26:23.041	2025-05-24 18:26:23.041	Other	f	1	30	540	cmb2k00yt000zeixo2dghh2wz
cmb2k9hhh001peixon4lfxdou	cmash9ool003veirgsrdn6k3t	KIDabra Dealers Open for The First Time	\N	\N	\N	\N	2025-05-24 18:26:23.045	2025-05-24 18:26:23.045	Dealers	f	1	30	540	cmb2k00yt000zeixo2dghh2wz
cmb2k9hhm001reixoslsahped	cmash9ool003veirgsrdn6k3t	Yarden Shalev	\N	\N	\N	\N	2025-05-24 18:26:23.05	2025-05-24 18:26:23.05	Lecture	f	1	90	570	cmb2k00yt000zeixo2dghh2wz
cmb2k9hhs001teixo7ywjs1re	cmash9ool003veirgsrdn6k3t	Wonder, Whimsy and Warm Fuzzies	John Reid	\N	\N	\N	2025-05-24 18:26:23.056	2025-05-24 18:26:23.056	Lecture	f	1	60	660	cmb2k00yt000zeixo2dghh2wz
cmb2k9hhy001veixosx9vxvfv	cmash9ool003veirgsrdn6k3t	Lunch	\N	\N	\N	\N	2025-05-24 18:26:23.062	2025-05-24 18:26:23.062	Other	f	1	60	720	cmb2k00yt000zeixo2dghh2wz
cmb2k9hi3001xeixoi579c71q	cmash9ool003veirgsrdn6k3t	Why New!	David Ginn	\N	\N	\N	2025-05-24 18:26:23.067	2025-05-24 18:26:23.067	Lecture	f	1	90	840	cmb2k00yt000zeixo2dghh2wz
cmb2k9hi8001zeixozgtu4cmm	cmash9ool003veirgsrdn6k3t	Cris Johnson and Anthony Lindan aka 'Scoop McCoy'	\N	\N	\N	\N	2025-05-24 18:26:23.072	2025-05-24 18:26:23.072	Lecture	f	1	60	990	cmb2k00yt000zeixo2dghh2wz
cmb2k9hid0021eixodwrnzhti	cmash9ool003veirgsrdn6k3t	Dinner	\N	\N	\N	\N	2025-05-24 18:26:23.077	2025-05-24 18:26:23.077	Other	f	1	90	1050	cmb2k00yt000zeixo2dghh2wz
cmb2k9hih0023eixobkfdcfd7	cmash9ool003veirgsrdn6k3t	Highlight Event	A Very Special Evening Presentation	\N	\N	\N	2025-05-24 18:26:23.081	2025-05-24 18:26:23.081	Show	f	1	120	1140	cmb2k00yt000zeixo2dghh2wz
cmb2k9hik0025eixorasvwafp	cmash9ool003veirgsrdn6k3t	Dealers Show	Dedicated to Dave Hill, followed by visiting and shopping in the Dealers Room	\N	\N	\N	2025-05-24 18:26:23.085	2025-05-24 18:26:23.085	Show	f	1	60	1260	cmb2k00yt000zeixo2dghh2wz
cmb2ka1bz0027eixoqjsyn15l	cmash9ool003veirgsrdn6k3t	Library Performers Jam	\N	\N	\N	\N	2025-05-24 18:26:48.767	2025-05-24 18:26:48.767	Panel	f	2	60	480	cmb2k00yx0011eixojwv0geky
cmb2ka1c50029eixoa0y21o46	cmash9ool003veirgsrdn6k3t	Registration Opens	Networking Time and Dealers Open	\N	\N	\N	2025-05-24 18:26:48.773	2025-05-24 18:26:48.773	Other	f	2	30	540	cmb2k00yx0011eixojwv0geky
cmb2ka1cc002beixom1rl59f2	cmash9ool003veirgsrdn6k3t	Bri Crabtree	\N	\N	\N	\N	2025-05-24 18:26:48.78	2025-05-24 18:26:48.78	Lecture	f	2	60	570	cmb2k00yx0011eixojwv0geky
cmb2bi9l7003vei501q5xzanm	cmash9ood003reirghnb26oht	Lance Burton Teen Seminar	Youth & Parents Only	Champions III	\N	\N	2025-05-24 14:21:16.171	2025-05-24 14:26:57.633	Workshop	t	-2	300	1020	cmb1axbe50007eiysuupgrelj
cmb2bixvu003xei503p3fk8kg	cmash9ood003reirghnb26oht	Lance Burton Teen Seminar	Youth Only	Champions III	\N	\N	2025-05-24 14:21:47.659	2025-05-24 14:26:57.657	Workshop	t	-1	720	540	cmb1ax92t0005eiysedzweu8y
cmb2bixw50041ei50o8tomeef	cmash9ood003reirghnb26oht	Registration Open	\N	Legends I & II Foyer/DirectorΓÇÖs Room	\N	\N	2025-05-24 14:21:47.669	2025-05-24 14:26:57.659	Other	t	-1	300	900	cmb1ax92t0005eiysedzweu8y
cmb2bixwc0043ei5019rx8v9g	cmash9ood003reirghnb26oht	Early Bird Special ΓÇô Marcus Eddie	\N	Legends I-IV	\N	\N	2025-05-24 14:21:47.676	2025-05-24 14:26:57.661	Show	t	-1	60	1200	cmb1ax92t0005eiysedzweu8y
cmb2bixvz003zei50nx0onp8o	cmash9ood003reirghnb26oht	Dealer Load-In and Set-Up	\N	Legends V-VI	\N	\N	2025-05-24 14:21:47.663	2025-05-24 14:26:57.658	Dealers	t	-1	360	840	cmb1ax92t0005eiysedzweu8y
cmb2bixwj0045ei507r58rdyu	cmash9ood003reirghnb26oht	JAM Experience	\N	Ballroom Foyer	\N	\N	2025-05-24 14:21:47.683	2025-05-24 14:26:57.662	Other	t	-1	240	1200	cmb1ax92t0005eiysedzweu8y
cmb2bk13m0047ei501njbao8v	cmash9ood003reirghnb26oht	Registration Open	\N	Legends I & II Foyer	\N	\N	2025-05-24 14:22:38.483	2025-05-24 14:26:57.739	Other	t	0	180	540	cmb0ylmry0007ei6o7m65dmfe
cmb2bk13r0049ei50705lrct6	cmash9ood003reirghnb26oht	Lecture ΓÇô Joan Dukore - Strolling Magic	\N	Legends I-IV	\N	\N	2025-05-24 14:22:38.487	2025-05-24 14:26:57.758	Lecture	t	0	60	570	cmb0ylmry0007ei6o7m65dmfe
cmb2bk13v004bei50kdkt0vhi	cmash9ood003reirghnb26oht	Lance Burton Teen Seminar	Youth Only	Champions III	\N	\N	2025-05-24 14:22:38.491	2025-05-24 14:26:57.759	Workshop	t	0	120	600	cmb0ylmry0007ei6o7m65dmfe
cmb2bk13z004dei50lp0jyp6b	cmash9ood003reirghnb26oht	Dealers Open (Welcome and Dealer Room Specials)	\N	Legends V-VI	\N	\N	2025-05-24 14:22:38.496	2025-05-24 14:26:57.759	Dealers	t	0	240	600	cmb0ylmry0007ei6o7m65dmfe
cmb2bk145004fei50eltmczlm	cmash9ood003reirghnb26oht	Lecture ΓÇô Jon Allen	\N	Legends IΓÇôIV	\N	\N	2025-05-24 14:22:38.502	2025-05-24 14:26:57.76	Lecture	t	0	60	660	cmb0ylmry0007ei6o7m65dmfe
cmb2bk14c004hei50joopabeh	cmash9ood003reirghnb26oht	Board Meeting (Mike Dunagan)	\N	Champions V-2nd floor	\N	\N	2025-05-24 14:22:38.508	2025-05-24 14:26:57.76	Other	t	0	60	660	cmb0ylmry0007ei6o7m65dmfe
cmb2bk14g004jei5093pnuqhm	cmash9ood003reirghnb26oht	Lunch ΓÇô Grab-and-Go	\N	Hotel Lobby	\N	\N	2025-05-24 14:22:38.513	2025-05-24 14:26:57.811	Other	t	0	120	720	cmb0ylmry0007ei6o7m65dmfe
cmb2bk14m004lei50ryzr7uqo	cmash9ood003reirghnb26oht	Registration Open	\N	Legends I & II Foyer	\N	\N	2025-05-24 14:22:38.518	2025-05-24 14:26:57.834	Other	t	0	240	780	cmb0ylmry0007ei6o7m65dmfe
cmb2bk14q004nei50qb0a6jqo	cmash9ood003reirghnb26oht	Dealers Open	\N	Legends V-VI	\N	\N	2025-05-24 14:22:38.522	2025-05-24 14:26:57.834	Dealers	t	0	180	840	cmb0ylmry0007ei6o7m65dmfe
cmb2bk14t004pei50ikowc3ey	cmash9ood003reirghnb26oht	Mervant ΓÇô One Person Show	\N	Legends I-IV	\N	\N	2025-05-24 14:22:38.526	2025-05-24 14:26:57.835	Show	t	0	60	840	cmb0ylmry0007ei6o7m65dmfe
cmb2bk14y004rei5029ayq49x	cmash9ood003reirghnb26oht	Dealers Open (Silent Auction Opens; 1st Day Raffle Specials)	\N	Legends V-VI	\N	\N	2025-05-24 14:22:38.53	2025-05-24 14:26:57.835	Dealers	t	0	120	900	cmb0ylmry0007ei6o7m65dmfe
cmb2ka1ci002deixo5gcgzeah	cmash9ool003veirgsrdn6k3t	Kleefeld Does Dinosaurs	Jim Kleefeld: Magic with dinosaurs for themed shows. Tricks, routines, and creative ideas.	\N	\N	\N	2025-05-24 18:26:48.786	2025-05-24 18:26:48.786	Lecture	f	2	90	630	cmb2k00yx0011eixojwv0geky
cmb2ka1co002feixouy434hog	cmash9ool003veirgsrdn6k3t	Lunch	Lunch Choices in the Neighborhood	\N	\N	\N	2025-05-24 18:26:48.793	2025-05-24 18:26:48.793	Other	f	2	60	720	cmb2k00yx0011eixojwv0geky
cmb2ka1cu002heixog3oig2xd	cmash9ool003veirgsrdn6k3t	Rethink the E	Dan Nixon: A brand new lecture & a whole new way of thinking	\N	\N	\N	2025-05-24 18:26:48.799	2025-05-24 18:26:48.799	Lecture	f	2	90	840	cmb2k00yx0011eixojwv0geky
cmb2bk152004tei50yk3tjgbg	cmash9ood003reirghnb26oht	Lecture - Danny Orleans	\N	Legends I-IV	\N	\N	2025-05-24 14:22:38.535	2025-05-24 14:26:57.836	Lecture	t	0	60	960	cmb0ylmry0007ei6o7m65dmfe
cmb2blij7005vei5003n3v9io	cmash9ood003reirghnb26oht	Gala Show ΓÇô Marcus Eddie (MC); Liz Toonkel, Nicole Cardoza, Justin Purcell, and Mandy Muden	\N	Legends Ballroom	\N	\N	2025-05-24 14:23:47.731	2025-05-24 14:26:58.212	Show	t	1	60	1200	cmb0ylms30009ei6ogkglrjot
cmb2bk158004vei50ujbvo9e9	cmash9ood003reirghnb26oht	Welcome Orientation and Autographs	\N	Legends Foyer	\N	\N	2025-05-24 14:22:38.541	2025-05-24 14:26:57.892	Other	t	0	60	1110	cmb0ylmry0007ei6o7m65dmfe
cmb2bk15c004xei50ia0jxwnd	cmash9ood003reirghnb26oht	Gala Show ΓÇô Zabrecky Hour	\N	Legends I-IV	\N	\N	2025-05-24 14:22:38.545	2025-05-24 14:26:57.931	Show	t	0	60	1200	cmb0ylmry0007ei6o7m65dmfe
cmb2bk15h004zei50f7d99rid	cmash9ood003reirghnb26oht	JAM Sessions ΓÇ£Share Your MagicΓÇ¥ Ideas/Tricks	\N	Legends Foyer	\N	\N	2025-05-24 14:22:38.549	2025-05-24 14:26:57.932	Other	t	0	210	1290	cmb0ylmry0007ei6o7m65dmfe
cmb2blih00055ei508m4qrlrh	cmash9ood003reirghnb26oht	Close-Up Judges Meeting	\N	Legends VII	\N	\N	2025-05-24 14:23:47.652	2025-05-24 14:26:57.943	Other	t	1	30	540	cmb0ylms30009ei6ogkglrjot
cmb2blih70057ei50j4s4b7uk	cmash9ood003reirghnb26oht	Territorial Vice Presidents Meeting	\N	Champions IV	\N	\N	2025-05-24 14:23:47.659	2025-05-24 14:26:58.007	Other	t	1	30	540	cmb0ylms30009ei6ogkglrjot
cmb2blihn005bei50lxkz2c7b	cmash9ood003reirghnb26oht	Lecture ΓÇô Gaia Elisa Rossi	\N	Legends I-IV	\N	\N	2025-05-24 14:23:47.676	2025-05-24 14:26:58.041	Lecture	t	1	60	600	cmb0ylms30009ei6ogkglrjot
cmb2blihe0059ei502jd7bcdv	cmash9ood003reirghnb26oht	Dealers Open - Silent Auction continues	\N	Legends V-VI	\N	\N	2025-05-24 14:23:47.666	2025-05-24 14:26:58.042	Dealers	t	1	240	600	cmb0ylms30009ei6ogkglrjot
cmb2blii1005fei50v48yyffo	cmash9ood003reirghnb26oht	Lance Burton Teen Seminar	Youth Only	Champions III	\N	\N	2025-05-24 14:23:47.689	2025-05-24 14:26:58.043	Workshop	t	1	60	660	cmb0ylms30009ei6ogkglrjot
cmb2bliia005jei50do0x88jh	cmash9ood003reirghnb26oht	Spouse Event (Trip to Galleria Mall)	\N	Offsite	\N	\N	2025-05-24 14:23:47.699	2025-05-24 14:26:58.129	Other	t	1	60	750	cmb0ylms30009ei6ogkglrjot
cmb2bliih005lei5056vuqrm5	cmash9ood003reirghnb26oht	Registration Open	\N	Legends IΓÇôII Foyer	\N	\N	2025-05-24 14:23:47.705	2025-05-24 14:26:58.148	Other	t	1	240	780	cmb0ylms30009ei6ogkglrjot
cmb2bliim005nei50ix78dd6v	cmash9ood003reirghnb26oht	International Close-up Contest	Hosted by Lady Sarah and Keith Fields	Legends IΓÇôIV	\N	\N	2025-05-24 14:23:47.71	2025-05-24 14:26:58.176	Competition	t	1	120	840	cmb0ylms30009ei6ogkglrjot
cmb2bliiq005pei50axlaofpi	cmash9ood003reirghnb26oht	Dealers Open	\N	Legends V-VI	\N	\N	2025-05-24 14:23:47.715	2025-05-24 14:26:58.176	Dealers	t	1	120	900	cmb0ylms30009ei6ogkglrjot
cmb2bliix005rei502nf8n4bc	cmash9ood003reirghnb26oht	Guests of Honor - Kristy & Randy Pitchford	\N	Legends I-IV	\N	\N	2025-05-24 14:23:47.721	2025-05-24 14:26:58.177	Panel	t	1	75	975	cmb0ylms30009ei6ogkglrjot
cmb2blij2005tei50ywkbp08f	cmash9ood003reirghnb26oht	JAM Close-Up ΓÇô ΓÇ£Share Your MagicΓÇ¥	\N	Ballroom Foyer	\N	\N	2025-05-24 14:23:47.727	2025-05-24 14:26:58.177	Other	t	1	60	1140	cmb0ylms30009ei6ogkglrjot
cmb2blijc005xei50z8w299zt	cmash9ood003reirghnb26oht	Open Mic Night ΓÇô Your Moment to Shine - bring magic to share ΓÇô Hosted by Lady Sarah and Keith Fields	\N	Legends Ballroom	\N	\N	2025-05-24 14:23:47.736	2025-05-24 14:26:58.231	Show	t	1	90	1290	cmb0ylms30009ei6ogkglrjot
cmb2bliji005zei50m29ruhql	cmash9ood003reirghnb26oht	JAM Sessions ΓÇô ΓÇ£Share Your MagicΓÇ¥	\N	Legends Foyer	\N	\N	2025-05-24 14:23:47.742	2025-05-24 14:26:58.256	Other	t	1	150	1350	cmb0ylms30009ei6ogkglrjot
cmb2bogiy0061ei50axx9cfu2	cmash9ood003reirghnb26oht	Registration Open	\N	Legends IΓÇôII Foyer	\N	\N	2025-05-24 14:26:05.098	2025-05-24 14:26:58.257	Other	t	2	180	540	cmb0ylms8000bei6ojsjhbus0
cmb2bogja0065ei50ljg0ii7f	cmash9ood003reirghnb26oht	Lecture: Bebel: Magic from France	\N	Legends I-IV	\N	\N	2025-05-24 14:26:05.11	2025-05-24 14:26:58.257	Lecture	t	2	60	540	cmb0ylms8000bei6ojsjhbus0
cmb2bogjh0067ei50x0mkpb4o	cmash9ood003reirghnb26oht	Lecture: Giacomo Bigliardi	\N	Legends I-IV	\N	\N	2025-05-24 14:26:05.118	2025-05-24 14:26:58.258	Lecture	t	2	60	600	cmb0ylms8000bei6ojsjhbus0
cmb2bogj50063ei509141nwe0	cmash9ood003reirghnb26oht	Dealers Open	\N	Legends VΓÇôVI	\N	\N	2025-05-24 14:26:05.106	2025-05-24 14:26:58.29	Dealers	t	2	240	600	cmb0ylms8000bei6ojsjhbus0
cmb2bogju006bei50rv74ehew	cmash9ood003reirghnb26oht	Lance Burton Teen Seminar	Youth Only	Champions III	\N	\N	2025-05-24 14:26:05.13	2025-05-24 14:26:58.311	Workshop	t	2	60	660	cmb0ylms8000bei6ojsjhbus0
cmb2bogjp0069ei50fo492e5j	cmash9ood003reirghnb26oht	Board Meeting (Stephen Levine)	\N	Champions V	\N	\N	2025-05-24 14:26:05.125	2025-05-24 14:26:58.343	Other	t	2	60	675	cmb0ylms8000bei6ojsjhbus0
cmb2bogk0006dei50y7cwxz5y	cmash9ood003reirghnb26oht	Lunch ΓÇô Grab-and-Go	\N	Hotel Lobby	\N	\N	2025-05-24 14:26:05.136	2025-05-24 14:26:58.344	Other	t	2	120	720	cmb0ylms8000bei6ojsjhbus0
cmb2bogk6006fei50dyml141a	cmash9ood003reirghnb26oht	Group Photo (All Convention Attendees)	\N	TBD	\N	\N	2025-05-24 14:26:05.142	2025-05-24 14:26:58.344	Other	t	2	20	810	cmb0ylms8000bei6ojsjhbus0
cmb2bogk9006hei504r8ewmkl	cmash9ood003reirghnb26oht	Registration Open	\N	Legends IΓÇôII Foyer	\N	\N	2025-05-24 14:26:05.146	2025-05-24 14:26:58.345	Other	t	2	150	810	cmb0ylms8000bei6ojsjhbus0
cmb2bogke006jei50v3n09yjd	cmash9ood003reirghnb26oht	Lecture and Q&A ΓÇô Dan Sperry	\N	Legends IΓÇôIV	\N	\N	2025-05-24 14:26:05.15	2025-05-24 14:26:58.38	Lecture	t	2	90	840	cmb0ylms8000bei6ojsjhbus0
cmb2bogkk006lei50auyespyd	cmash9ood003reirghnb26oht	Dealers Open	\N	Legends VΓÇôVI	\N	\N	2025-05-24 14:26:05.156	2025-05-24 14:26:58.399	Dealers	t	2	120	900	cmb0ylms8000bei6ojsjhbus0
cmb2bogks006pei50r7du47w2	cmash9ood003reirghnb26oht	Grand Banquet Show (Ticket Required) ΓÇô Joan Dukore, Rachel Ling Gordon, Walter King Jr. - The Spellbinder	\N	Discovery Ballroom	\N	\N	2025-05-24 14:26:05.164	2025-05-24 14:26:58.428	Show	t	2	45	1110	cmb0ylms8000bei6ojsjhbus0
cmb2bogkx006rei50yzf977ab	cmash9ood003reirghnb26oht	International Stage Championship Gala Show and Awards ΓÇô Jon Allen (MC), Danny Orleans, Sean RaeVon Wilson, Diego Vargas	\N	Legends I-IV	\N	\N	2025-05-24 14:26:05.169	2025-05-24 14:26:58.428	Show	t	2	120	1200	cmb0ylms8000bei6ojsjhbus0
cmb2ka1cz002jeixoxbe8pvcj	cmash9ool003veirgsrdn6k3t	Dave Moreland	\N	\N	\N	\N	2025-05-24 18:26:48.803	2025-05-24 18:26:48.803	Lecture	f	2	60	990	cmb2k00yx0011eixojwv0geky
cmb2bligu0053ei50tn4zmsdt	cmash9ood003reirghnb26oht	Close-Up Contestants Meeting	\N	Legends VII	\N	\N	2025-05-24 14:23:47.646	2025-05-24 14:26:57.933	Other	t	1	30	510	cmb0ylms30009ei6ogkglrjot
cmb2bligm0051ei502a6gkav2	cmash9ood003reirghnb26oht	Registration Open	\N	Legends IΓÇôII Foyer	\N	\N	2025-05-24 14:23:47.638	2025-05-24 14:26:57.933	Other	t	1	180	540	cmb0ylms30009ei6ogkglrjot
cmb2blii6005hei505jep7zqb	cmash9ood003reirghnb26oht	Lunch ΓÇô Grab-and-Go	\N	Hotel Lobby	\N	\N	2025-05-24 14:23:47.695	2025-05-24 14:26:58.044	Other	t	1	120	720	cmb0ylms30009ei6ogkglrjot
cmb2bogl1006tei5077ibnps9	cmash9ood003reirghnb26oht	Late Night Show: Zabrecky ΓÇô The Late Great Spook Show	\N	Legends I-IV	\N	\N	2025-05-24 14:26:05.174	2025-05-24 14:26:58.429	Show	t	2	60	1350	cmb0ylms8000bei6ojsjhbus0
cmb2bp2ay006vei50flbft552	cmash9ood003reirghnb26oht	Lecture ΓÇô Javi Benitez	\N	Legends IΓÇôIV	\N	\N	2025-05-24 14:26:33.323	2025-05-24 14:26:58.464	Lecture	t	3	60	540	cmb0ylmsc000dei6o63vzthes
cmb2bp2b3006xei500ie5acjj	cmash9ood003reirghnb26oht	Dealers Open	\N	Legends V-VI	\N	\N	2025-05-24 14:26:33.327	2025-05-24 14:26:58.49	Dealers	t	3	240	600	cmb0ylmsc000dei6o63vzthes
cmb2bp2b7006zei500jbnes5f	cmash9ood003reirghnb26oht	Registration Open for St. Louis 2026 Convention	\N	Legends IΓÇôII Foyer	\N	\N	2025-05-24 14:26:33.332	2025-05-24 14:26:58.51	Other	t	3	120	600	cmb0ylmsc000dei6o63vzthes
cmb2bp2be0071ei50sjv11nct	cmash9ood003reirghnb26oht	Dealer Room Silent Auction Closes	\N	Legends V-VI	\N	\N	2025-05-24 14:26:33.338	2025-05-24 14:26:58.511	Dealers	t	3	0	660	cmb0ylmsc000dei6o63vzthes
cmb2bp2bi0073ei50axpmin13	cmash9ood003reirghnb26oht	Lecture ΓÇô Jared Kopf	\N	Legends I-IV	\N	\N	2025-05-24 14:26:33.342	2025-05-24 14:26:58.511	Lecture	t	3	60	660	cmb0ylmsc000dei6o63vzthes
cmb2bp2bo0075ei50xsc1w1jz	cmash9ood003reirghnb26oht	Lance Burton Teen Seminar	Youth Only	Champions III	\N	\N	2025-05-24 14:26:33.349	2025-05-24 14:26:58.512	Workshop	t	3	60	660	cmb0ylmsc000dei6o63vzthes
cmb2bp2bv0077ei50nq509kwv	cmash9ood003reirghnb26oht	Merlin Lunch Social (Ticket Required) and Presentation by Randy & Kristy Pitchford	\N	Discovery Ballroom	\N	\N	2025-05-24 14:26:33.355	2025-05-24 14:26:58.545	Other	t	3	90	720	cmb0ylmsc000dei6o63vzthes
cmb2bp2c00079ei50kbhpr90g	cmash9ood003reirghnb26oht	Lunch ΓÇô Grab-and-Go	\N	Hotel Lobby	\N	\N	2025-05-24 14:26:33.36	2025-05-24 14:26:58.567	Other	t	3	90	720	cmb0ylmsc000dei6o63vzthes
cmb2bp2c5007bei50tr8ygs9y	cmash9ood003reirghnb26oht	Lecture ΓÇô Rob Zabrecky: ABZΓÇÖs of Magic	\N	Legends IΓÇôIV	\N	\N	2025-05-24 14:26:33.365	2025-05-24 14:26:58.589	Lecture	t	3	60	810	cmb0ylmsc000dei6o63vzthes
cmb2bp2ca007dei502lqxhdzt	cmash9ood003reirghnb26oht	Silent Auction ΓÇô Pay for Winning Bid Purchases	\N	Legends VΓÇôVI	\N	\N	2025-05-24 14:26:33.371	2025-05-24 14:26:58.589	Dealers	t	3	150	810	cmb0ylmsc000dei6o63vzthes
cmb2bp2cg007fei50kq3rh743	cmash9ood003reirghnb26oht	Dealers Open (Last Call)	\N	Legends V-VI	\N	\N	2025-05-24 14:26:33.376	2025-05-24 14:26:58.59	Dealers	t	3	120	900	cmb0ylmsc000dei6o63vzthes
cmb2bp2ck007hei50naihxjt0	cmash9ood003reirghnb26oht	Close-Up Gala ΓÇô Diego Vargas (MC), Justin Purcell, Bebel, Giacomo Bigliardi, Joan Dukore, Jared Kopf, Javi Benitez	\N	Legends I-IV	\N	\N	2025-05-24 14:26:33.38	2025-05-24 14:26:58.591	Show	t	3	90	930	cmb0ylmsc000dei6o63vzthes
cmb2bp2cp007jei50on3nn0iu	cmash9ood003reirghnb26oht	JAM Close-Up ΓÇô Open to All	\N	Legends Foyer	\N	\N	2025-05-24 14:26:33.385	2025-05-24 14:26:58.632	Other	t	3	60	1140	cmb0ylmsc000dei6o63vzthes
cmb2bp2cw007lei50l40kpaww	cmash9ood003reirghnb26oht	Grand Finale Magic Show ΓÇô Mervant (MC), Gaia Elisa Rossi, Javi Benitez, Jon Allen, Dan Sperry	\N	Legends I-IV	\N	\N	2025-05-24 14:26:33.392	2025-05-24 14:26:58.644	Show	t	3	90	1200	cmb0ylmsc000dei6o63vzthes
cmb2bp2d0007nei50xe7nyd71	cmash9ood003reirghnb26oht	Farewell Party and Final JAM Sessions	\N	Ballroom Foyer	\N	\N	2025-05-24 14:26:33.397	2025-05-24 14:26:58.66	Other	t	3	180	1320	cmb0ylmsc000dei6o63vzthes
cmb2cib1w007tei503vklv5a4	cmash9oqn004xeirggiomuld6	Magic Marketplace Open	\N	\N	\N	\N	2025-05-24 14:49:17.684	2025-05-24 14:50:02.919	Dealers	f	0	150	480	cmayeaim80007eizsfcdkzqhf
cmb2cib1r007rei502mzr75r5	cmash9oqn004xeirggiomuld6	Registration Opens	\N	\N	\N	\N	2025-05-24 14:49:17.68	2025-05-24 14:50:02.918	Other	f	0	0	480	cmayeaim80007eizsfcdkzqhf
cmb2cib24007vei509qr59eou	cmash9oqn004xeirggiomuld6	Jimmy Ichihana Lecture	\N	\N	\N	\N	2025-05-24 14:49:17.692	2025-05-24 14:50:02.92	Lecture	f	0	90	630	cmayeaim80007eizsfcdkzqhf
cmb2cib2a007xei50nrds3fzk	cmash9oqn004xeirggiomuld6	Lunch	\N	\N	\N	\N	2025-05-24 14:49:17.699	2025-05-24 14:50:02.921	Other	f	0	90	720	cmayeaim80007eizsfcdkzqhf
cmb2cib2f007zei50y8juprvw	cmash9oqn004xeirggiomuld6	Magic Competition	\N	\N	\N	\N	2025-05-24 14:49:17.704	2025-05-24 14:50:02.922	Competition	f	0	60	810	cmayeaim80007eizsfcdkzqhf
cmb2cib1l007pei50e4dpbmmb	cmash9oqn004xeirggiomuld6	Flea Market, Dealers Load In & Set Up	\N	\N	\N	\N	2025-05-24 14:49:17.673	2025-05-24 14:50:02.923	Dealers	f	0	60	420	cmayeaim80007eizsfcdkzqhf
cmb2cib2l0081ei50twsaaigm	cmash9oqn004xeirggiomuld6	Dan Fleischman Lecture	\N	\N	\N	\N	2025-05-24 14:49:17.709	2025-05-24 14:50:02.981	Lecture	f	0	135	885	cmayeaim80007eizsfcdkzqhf
cmb2cib2q0083ei50zy2jwdly	cmash9oqn004xeirggiomuld6	Winners Announced, Raffle Drawing	\N	\N	\N	\N	2025-05-24 14:49:17.715	2025-05-24 14:50:02.994	Other	f	0	30	1020	cmayeaim80007eizsfcdkzqhf
cmb2cib2v0085ei50gmvjaswm	cmash9oqn004xeirggiomuld6	Convention Ends	\N	\N	\N	\N	2025-05-24 14:49:17.719	2025-05-24 14:50:02.995	Other	f	0	0	1050	cmayeaim80007eizsfcdkzqhf
cmb2kaqk9002reixomq3ar5jq	cmash9ool003veirgsrdn6k3t	Santa Morning Jam	Calling all Santas, Mrs. Claus and Elves for a post breakfast visit. Hosted by Santa Tate	\N	\N	\N	2025-05-24 18:27:21.466	2025-05-24 18:27:21.466	Panel	f	3	60	480	cmb2k00z30013eixo74l8bmid
cmb2ka1d4002leixopiwz7w6y	cmash9ool003veirgsrdn6k3t	Dinner	\N	\N	\N	\N	2025-05-24 18:26:48.809	2025-05-24 18:26:48.809	Other	f	2	90	1050	cmb2k00yx0011eixojwv0geky
cmb2ka1da002neixocrxhowro	cmash9ool003veirgsrdn6k3t	Breaking The Creativity Barry-er	Barry Mitchell: A special evening presentation	\N	\N	\N	2025-05-24 18:26:48.815	2025-05-24 18:26:48.815	Show	f	2	90	1140	cmb2k00yx0011eixojwv0geky
cmb2ka1dh002peixonwpgmsfp	cmash9ool003veirgsrdn6k3t	Foam Jam	With Chris and Cesar	\N	\N	\N	2025-05-24 18:26:48.821	2025-05-24 18:26:48.821	Other	f	2	60	1290	cmb2k00yx0011eixojwv0geky
cmb2kaqkd002teixoh7nv3006	cmash9ool003veirgsrdn6k3t	Registration and Dealers Open	Networking Time	\N	\N	\N	2025-05-24 18:27:21.47	2025-05-24 18:27:21.47	Other	f	3	30	540	cmb2k00z30013eixo74l8bmid
cmb2kaqki002veixordmxq8ur	cmash9ool003veirgsrdn6k3t	Arthur Atsma	\N	\N	\N	\N	2025-05-24 18:27:21.474	2025-05-24 18:27:21.474	Lecture	f	3	60	570	cmb2k00z30013eixo74l8bmid
cmb2oyvf60041eixox87t9lge	cmash9oqr004zeirg4jnzg2i4	TAOM Board Meeting	\N	TBD	\N	\N	2025-05-24 20:38:05.97	2025-05-24 20:38:05.97	Other	f	0	60	960	cmb2konha003neixoeszlp1mu
cmb2kaqkm002xeixoua398b6b	cmash9ool003veirgsrdn6k3t	KID Talks	\N	\N	\N	\N	2025-05-24 18:27:21.479	2025-05-24 18:27:21.479	Panel	f	3	60	630	cmb2k00z30013eixo74l8bmid
cmb2kaqkq002zeixon4p5bmf7	cmash9ool003veirgsrdn6k3t	Lunch	\N	\N	\N	\N	2025-05-24 18:27:21.483	2025-05-24 18:27:21.483	Other	f	3	60	720	cmb2k00z30013eixo74l8bmid
cmb2kaqku0031eixoxjfcnyrp	cmash9ool003veirgsrdn6k3t	A Show For All Ages	Christopher T. Magician: The Brand New Lecture and Book World Premiere	\N	\N	\N	2025-05-24 18:27:21.487	2025-05-24 18:27:21.487	Lecture	f	3	90	840	cmb2k00z30013eixo74l8bmid
cmb2oyvfc0043eixoszqbf5nx	cmash9oqr004zeirg4jnzg2i4	Dinner Buffet	\N	TBD	\N	\N	2025-05-24 20:38:05.976	2025-05-24 20:38:05.976	Other	f	0	60	1080	cmb2konha003neixoeszlp1mu
cmb30jv750009eiicf8nphoin	cmash9oqz0053eirgingr15m7	Myers Magic	Tennessee Magic Emporium, SEO Magic	\N	\N	\N	2025-05-25 02:02:21.233	2025-05-25 02:04:40.6	Dealers	t	0	60	960	cmb30amo90001eiicjqkefmlm
cmb2kaqkz0033eixo1ohthjvq	cmash9ool003veirgsrdn6k3t	Final Shopping in Dealers Room	After Steve's Lecture	\N	\N	\N	2025-05-24 18:27:21.491	2025-05-24 18:27:21.491	Dealers	f	3	60	930	cmb2k00z30013eixo74l8bmid
cmb2kaql30035eixomy53vzky	cmash9ool003veirgsrdn6k3t	The KIDabra Gala Show	Starring an International Roster of KIDabra Stars! Badge is your ticket. Guests may purchase tickets.	\N	\N	\N	2025-05-24 18:27:21.495	2025-05-24 18:27:21.495	Show	f	3	120	1200	cmb2k00z30013eixo74l8bmid
cmb2oyvfg0045eixoufzmbwcm	cmash9oqr004zeirg4jnzg2i4	Dealer Exhibition	\N	TBD	\N	\N	2025-05-24 20:38:05.981	2025-05-24 20:38:05.981	Dealers	f	0	60	1200	cmb2konha003neixoeszlp1mu
cmb2oyvfm0047eixodbne65p4	cmash9oqr004zeirg4jnzg2i4	Midnight Madness	\N	TBD	\N	\N	2025-05-24 20:38:05.986	2025-05-24 20:38:05.986	Show	f	1	60	0	cmb2konhg003peixoju6v7hyf
cmb30jv7i000feiicv46dsav4	cmash9oqz0053eirgingr15m7	LECTURE - STEVE FRIEDBERG	\N	\N	\N	\N	2025-05-25 02:02:21.246	2025-05-25 02:04:40.602	Lecture	t	0	60	1260	cmb30amo90001eiicjqkefmlm
cmb2ozosd0049eixoyliups5o	cmash9oqr004zeirg4jnzg2i4	Breakfast	\N	TBD	\N	\N	2025-05-24 20:38:44.029	2025-05-24 20:38:44.029	Other	f	1	60	480	cmb2konhg003peixoju6v7hyf
cmb2ozosk004beixo7hg3vnr3	cmash9oqr004zeirg4jnzg2i4	Lecture	\N	TBD	\N	\N	2025-05-24 20:38:44.036	2025-05-24 20:38:44.036	Lecture	f	1	60	570	cmb2konhg003peixoju6v7hyf
cmb2ozosq004deixo68q62rin	cmash9oqr004zeirg4jnzg2i4	Lecture	\N	TBD	\N	\N	2025-05-24 20:38:44.043	2025-05-24 20:38:44.043	Lecture	f	1	60	660	cmb2konhg003peixoju6v7hyf
cmb2ozosw004feixord8p0wfq	cmash9oqr004zeirg4jnzg2i4	Lunch	\N	TBD	\N	\N	2025-05-24 20:38:44.049	2025-05-24 20:38:44.049	Other	f	1	60	750	cmb2konhg003peixoju6v7hyf
cmb2ozot1004heixocrf37h18	cmash9oqr004zeirg4jnzg2i4	Lecture	\N	TBD	\N	\N	2025-05-24 20:38:44.054	2025-05-24 20:38:44.054	Lecture	f	1	60	840	cmb2konhg003peixoju6v7hyf
cmb2ozot6004jeixoazf3v1v5	cmash9oqr004zeirg4jnzg2i4	Lecture	\N	TBD	\N	\N	2025-05-24 20:38:44.059	2025-05-24 20:38:44.059	Lecture	f	1	60	960	cmb2konhg003peixoju6v7hyf
cmb2ozotc004leixoahd8joez	cmash9oqr004zeirg4jnzg2i4	TAOM General Meeting and Memoriam	\N	TBD	\N	\N	2025-05-24 20:38:44.064	2025-05-24 20:38:44.064	Other	f	1	30	1110	cmb2konhg003peixoju6v7hyf
cmb2ozoth004neixodcfp7sh4	cmash9oqr004zeirg4jnzg2i4	Picnic BBQ Dinner Buffet	\N	TBD	\N	\N	2025-05-24 20:38:44.07	2025-05-24 20:38:44.07	Other	f	1	60	1140	cmb2konhg003peixoju6v7hyf
cmb2ozotm004peixob50jzooa	cmash9oqr004zeirg4jnzg2i4	A Night of Prestidigitation	\N	TBD	\N	\N	2025-05-24 20:38:44.074	2025-05-24 20:38:44.074	Show	f	1	90	1200	cmb2konhg003peixoju6v7hyf
cmb2ozotq004reixo6u55dcq3	cmash9oqr004zeirg4jnzg2i4	TAOM 2026 Convention and Officer Swearing-In	\N	TBD	\N	\N	2025-05-24 20:38:44.079	2025-05-24 20:38:44.079	Other	f	1	30	1350	cmb2konhg003peixoju6v7hyf
cmb2ozotw004teixoj3jdu2pk	cmash9oqr004zeirg4jnzg2i4	Midnight Madness	\N	TBD	\N	\N	2025-05-24 20:38:44.085	2025-05-24 20:38:44.085	Show	f	2	60	0	cmb2konhl003reixorzan87ff
cmb2rcojk0075eixo23ht0uiq	cmash9opk004deirgi05cmepw	Dealer Room	\N	\N	\N	\N	2025-05-24 21:44:49.473	2025-05-24 21:44:49.473	Dealers	t	3	60	540	cmb2r21xk0053eixoe8oz75jp
cmb2rcojs0077eixo7yxelf22	cmash9opk004deirgi05cmepw	Weebo	\N	\N	\N	\N	2025-05-24 21:44:49.481	2025-05-24 21:44:49.481	Lecture	t	3	30	615	cmb2r21xk0053eixoe8oz75jp
cmb2rcojx0079eixol02mc9lp	cmash9opk004deirgi05cmepw	Andrew deRuiter & Closing	\N	\N	\N	\N	2025-05-24 21:44:49.485	2025-05-24 21:44:49.485	Other	t	3	30	660	cmb2r21xk0053eixoe8oz75jp
cmb30jv7d000deiic6tgtywj0	cmash9oqz0053eirgingr15m7	LECTURE - STEVE MYERS	\N	\N	\N	\N	2025-05-25 02:02:21.241	2025-05-25 02:04:40.601	Lecture	t	0	90	1170	cmb30amo90001eiicjqkefmlm
cmb30kdrt000heiicgbjjf93a	cmash9oqz0053eirgingr15m7	FREE BREAKFAST BUFFET	For hotel guests	\N	\N	\N	2025-05-25 02:02:45.305	2025-05-25 02:04:40.602	Other	t	1	180	360	cmb30amog0003eiicqao8brzd
cmb30kds0000jeiicpc8btaxs	cmash9oqz0053eirgingr15m7	LECTURE - LUKE DANCY	\N	\N	\N	\N	2025-05-25 02:02:45.313	2025-05-25 02:04:40.673	Lecture	t	1	90	540	cmb30amog0003eiicqao8brzd
cmb30kds5000leiicpkrs84sg	cmash9oqz0053eirgingr15m7	BREAKOUT SESSION	Chad Long, Luke Dancy, Danny Cheng	\N	\N	\N	2025-05-25 02:02:45.318	2025-05-25 02:04:40.685	Workshop	t	1	90	630	cmb30amog0003eiicqao8brzd
cmb30kdsa000neiicxtm1xanv	cmash9oqz0053eirgingr15m7	LUNCH	\N	\N	\N	\N	2025-05-25 02:02:45.322	2025-05-25 02:04:40.713	Other	t	1	60	720	cmb30amog0003eiicqao8brzd
cmb30kdsf000peiicrcq2smvy	cmash9oqz0053eirgingr15m7	MARLO LECTURE - KEVIN KELLY & RANDY WAKEMAN	\N	\N	\N	\N	2025-05-25 02:02:45.328	2025-05-25 02:04:40.714	Lecture	t	1	180	780	cmb30amog0003eiicqao8brzd
cmb30kdsk000reiicj8cii8nq	cmash9oqz0053eirgingr15m7	DINNER	On your own	\N	\N	\N	2025-05-25 02:02:45.333	2025-05-25 02:04:40.714	Other	t	1	60	1020	cmb30amog0003eiicqao8brzd
cmb30koud000zeiicwr0faosx	cmash9oqz0053eirgingr15m7	LECTURE - CHAD LONG	\N	\N	\N	\N	2025-05-25 02:02:59.653	2025-05-25 02:04:40.787	Lecture	t	2	90	540	cmb30amok0005eiicoj1w643f
cmb30koul0013eiicwov0lyny	cmash9oqz0053eirgingr15m7	LUNCH	\N	\N	\N	\N	2025-05-25 02:02:59.662	2025-05-25 02:04:40.787	Other	t	2	60	720	cmb30amok0005eiicoj1w643f
cmb30kouh0011eiicaf9jqlyy	cmash9oqz0053eirgingr15m7	BREAKOUT SESSION	Randy Wakeman, Kevin Kelly, Steve Friedberg, Jimmy Ichihana	\N	\N	\N	2025-05-25 02:02:59.657	2025-05-25 02:04:40.788	Workshop	t	2	90	630	cmb30amok0005eiicoj1w643f
cmb30kouq0015eiick17a2tpi	cmash9oqz0053eirgingr15m7	LECTURE - JIMMY ICHIHANA	\N	\N	\N	\N	2025-05-25 02:02:59.666	2025-05-25 02:04:40.788	Lecture	t	2	90	810	cmb30amok0005eiicoj1w643f
cmb30kouu0017eiicuhbuj6eu	cmash9oqz0053eirgingr15m7	LECTURE - ??????	\N	\N	\N	\N	2025-05-25 02:02:59.671	2025-05-25 02:04:40.825	Lecture	t	2	30	900	cmb30amok0005eiicoj1w643f
cmb30kouy0019eiicydhv5rju	cmash9oqz0053eirgingr15m7	DINNER	On your own	\N	\N	\N	2025-05-25 02:02:59.674	2025-05-25 02:04:40.826	Other	t	2	60	1020	cmb30amok0005eiicoj1w643f
cmb30kov2001beiic2w2xfifd	cmash9oqz0053eirgingr15m7	CLOSE UP SHOW	Chad Long, Luke Dancy, Danny Cheng, ??????	\N	\N	\N	2025-05-25 02:02:59.678	2025-05-25 02:04:40.837	Show	t	2	90	1140	cmb30amok0005eiicoj1w643f
cmb30kov6001deiic73pwpeu3	cmash9oqz0053eirgingr15m7	DEALERS OPEN	Until ???	\N	\N	\N	2025-05-25 02:02:59.682	2025-05-25 02:04:40.837	Dealers	t	2	30	1260	cmb30amok0005eiicoj1w643f
cmb2rc7z3006deixo7uta7l34	cmash9opk004deirgi05cmepw	Dealer Room	\N	\N	\N	\N	2025-05-24 21:44:28	2025-05-24 21:44:28	Dealers	t	2	60	540	cmb2r21xe0051eixov0cn4mjj
cmb2rc7z8006feixohak8pjw8	cmash9opk004deirgi05cmepw	Melody the Magnificent	\N	\N	\N	\N	2025-05-24 21:44:28.005	2025-05-24 21:44:28.005	Lecture	t	2	30	615	cmb2r21xe0051eixov0cn4mjj
cmb2rc7zd006heixo88hehia6	cmash9opk004deirgi05cmepw	William Draven	\N	\N	\N	\N	2025-05-24 21:44:28.009	2025-05-24 21:44:28.009	Lecture	t	2	30	660	cmb2r21xe0051eixov0cn4mjj
cmb2rc7zg006jeixor4b4xcrg	cmash9opk004deirgi05cmepw	Lunch	\N	\N	\N	\N	2025-05-24 21:44:28.013	2025-05-24 21:44:28.013	Other	t	2	60	690	cmb2r21xe0051eixov0cn4mjj
cmb2rc7zl006leixopy5t0ng6	cmash9opk004deirgi05cmepw	Dealer Room	\N	\N	\N	\N	2025-05-24 21:44:28.017	2025-05-24 21:44:28.017	Dealers	t	2	60	750	cmb2r21xe0051eixov0cn4mjj
cmb2rb7ma0055eixotnpeuhqv	cmash9opk004deirgi05cmepw	Vendor & Stage Set-Up	\N	\N	\N	\N	2025-05-24 21:43:40.882	2025-05-24 21:43:40.882	Other	t	0	60	480	cmb2r21wz004xeixopa9uluzp
cmb2rb7mf0057eixo935t9bcf	cmash9opk004deirgi05cmepw	Greetings	\N	\N	\N	\N	2025-05-24 21:43:40.888	2025-05-24 21:43:40.888	Other	t	0	15	540	cmb2r21wz004xeixopa9uluzp
cmb2rb7mj0059eixo2r2wn86f	cmash9opk004deirgi05cmepw	Opening Ceremonies	\N	\N	\N	\N	2025-05-24 21:43:40.892	2025-05-24 21:43:40.892	Other	t	0	60	555	cmb2r21wz004xeixopa9uluzp
cmb2rb7mo005beixoowdw8yvi	cmash9opk004deirgi05cmepw	Golden Finger Challenge	\N	\N	\N	\N	2025-05-24 21:43:40.896	2025-05-24 21:43:40.896	Competition	t	0	60	900	cmb2r21wz004xeixopa9uluzp
cmb2rb7ms005deixoy57dqa0v	cmash9opk004deirgi05cmepw	Dealer Room	\N	\N	\N	\N	2025-05-24 21:43:40.9	2025-05-24 21:43:40.9	Dealers	t	0	120	960	cmb2r21wz004xeixopa9uluzp
cmb2rb7mw005feixoj557pym3	cmash9opk004deirgi05cmepw	Susan Gerbic	\N	\N	\N	\N	2025-05-24 21:43:40.904	2025-05-24 21:43:40.904	Lecture	t	0	60	1080	cmb2r21wz004xeixopa9uluzp
cmb2rb7mz005heixo5x3973c3	cmash9opk004deirgi05cmepw	Bruce Chadwick	\N	\N	\N	\N	2025-05-24 21:43:40.908	2025-05-24 21:43:40.908	Lecture	t	0	45	1115	cmb2r21wz004xeixopa9uluzp
cmb2rb7n6005jeixokmez1fa3	cmash9opk004deirgi05cmepw	Richard Green	\N	\N	\N	\N	2025-05-24 21:43:40.915	2025-05-24 21:43:40.915	Lecture	t	0	45	1125	cmb2r21wz004xeixopa9uluzp
cmb2rb7na005leixos94fk7pp	cmash9opk004deirgi05cmepw	Remy Connor	\N	\N	\N	\N	2025-05-24 21:43:40.918	2025-05-24 21:43:40.918	Lecture	t	0	45	1235	cmb2r21wz004xeixopa9uluzp
cmb2rbv24005neixospeizmki	cmash9opk004deirgi05cmepw	Dealer Room	\N	\N	\N	\N	2025-05-24 21:44:11.26	2025-05-24 21:44:11.26	Dealers	t	1	60	540	cmb2r21x7004zeixosz578rmd
cmb2rc7zq006neixob79fu2mo	cmash9opk004deirgi05cmepw	Jeff McBride	\N	\N	\N	\N	2025-05-24 21:44:28.022	2025-05-24 21:44:28.022	Lecture	t	2	60	810	cmb2r21xe0051eixov0cn4mjj
cmb2rc7zu006peixosrp29php	cmash9opk004deirgi05cmepw	Doug Gorman	\N	\N	\N	\N	2025-05-24 21:44:28.026	2025-05-24 21:44:28.026	Lecture	t	2	30	885	cmb2r21xe0051eixov0cn4mjj
cmb2rc7zy006reixo6ka1k04n	cmash9opk004deirgi05cmepw	Dealer Room	\N	\N	\N	\N	2025-05-24 21:44:28.03	2025-05-24 21:44:28.03	Dealers	t	2	105	915	cmb2r21xe0051eixov0cn4mjj
cmb2rc802006teixoqy4pupnv	cmash9opk004deirgi05cmepw	Dinner	\N	\N	\N	\N	2025-05-24 21:44:28.035	2025-05-24 21:44:28.035	Other	t	2	60	1020	cmb2r21xe0051eixov0cn4mjj
cmb2rc807006veixojz79si2n	cmash9opk004deirgi05cmepw	Crispy Knight	\N	\N	\N	\N	2025-05-24 21:44:28.039	2025-05-24 21:44:28.039	Lecture	t	2	45	1080	cmb2r21xe0051eixov0cn4mjj
cmb2rbv2a005peixo90q3eobh	cmash9opk004deirgi05cmepw	Rolando Santos	\N	\N	\N	\N	2025-05-24 21:44:11.266	2025-05-24 21:44:11.266	Lecture	t	1	60	615	cmb2r21x7004zeixosz578rmd
cmb2rbv2i005reixoa3pe1l8o	cmash9opk004deirgi05cmepw	Daniel Gastellum	\N	\N	\N	\N	2025-05-24 21:44:11.275	2025-05-24 21:44:11.275	Lecture	t	1	30	690	cmb2r21x7004zeixosz578rmd
cmb2rbv2p005teixotnktb9j5	cmash9opk004deirgi05cmepw	Lunch	\N	\N	\N	\N	2025-05-24 21:44:11.281	2025-05-24 21:44:11.281	Other	t	1	60	720	cmb2r21x7004zeixosz578rmd
cmb2rbv2v005veixoanxu0k52	cmash9opk004deirgi05cmepw	Dealer Room	\N	\N	\N	\N	2025-05-24 21:44:11.287	2025-05-24 21:44:11.287	Dealers	t	1	90	780	cmb2r21x7004zeixosz578rmd
cmb2rbv32005xeixozbsfnl81	cmash9opk004deirgi05cmepw	John Gilmore	\N	\N	\N	\N	2025-05-24 21:44:11.295	2025-05-24 21:44:11.295	Lecture	t	1	30	870	cmb2r21x7004zeixosz578rmd
cmb2rbv38005zeixobbj2kdi7	cmash9opk004deirgi05cmepw	Jeff McBride	\N	\N	\N	\N	2025-05-24 21:44:11.301	2025-05-24 21:44:11.301	Lecture	t	1	30	885	cmb2r21x7004zeixosz578rmd
cmb2rbv3g0061eixoq30pvjra	cmash9opk004deirgi05cmepw	Andreas Sebring	\N	\N	\N	\N	2025-05-24 21:44:11.308	2025-05-24 21:44:11.308	Lecture	t	1	60	960	cmb2r21x7004zeixosz578rmd
cmb2rbv3n0063eixomhaz5tbx	cmash9opk004deirgi05cmepw	Dinner	\N	\N	\N	\N	2025-05-24 21:44:11.315	2025-05-24 21:44:11.315	Other	t	1	60	1020	cmb2r21x7004zeixosz578rmd
cmb2rbv3v0065eixo74clangt	cmash9opk004deirgi05cmepw	Dealer Room	\N	\N	\N	\N	2025-05-24 21:44:11.323	2025-05-24 21:44:11.323	Dealers	t	1	60	1080	cmb2r21x7004zeixosz578rmd
cmb2rbv410067eixoa7695wf6	cmash9opk004deirgi05cmepw	Jordan Jonas	\N	\N	\N	\N	2025-05-24 21:44:11.329	2025-05-24 21:44:11.329	Lecture	t	1	30	1140	cmb2r21x7004zeixosz578rmd
cmb2rbv480069eixoawodzvgo	cmash9opk004deirgi05cmepw	Mysterion	\N	\N	\N	\N	2025-05-24 21:44:11.336	2025-05-24 21:44:11.336	Lecture	t	1	45	1165	cmb2r21x7004zeixosz578rmd
cmb2rbv4e006beixo5v0h0fqu	cmash9opk004deirgi05cmepw	Terry Tyson's S├⌐ance Master Class	\N	\N	\N	\N	2025-05-24 21:44:11.342	2025-05-24 21:44:11.342	Workshop	t	1	180	1260	cmb2r21x7004zeixosz578rmd
cmb2rc80b006xeixoswn1i9mp	cmash9opk004deirgi05cmepw	Traveler Award	\N	\N	\N	\N	2025-05-24 21:44:28.043	2025-05-24 21:44:28.043	Other	t	2	15	1125	cmb2r21xe0051eixov0cn4mjj
cmb2rc80e006zeixo0ix79ov7	cmash9opk004deirgi05cmepw	Ari Rose	\N	\N	\N	\N	2025-05-24 21:44:28.047	2025-05-24 21:44:28.047	Lecture	t	2	30	1140	cmb2r21xe0051eixov0cn4mjj
cmb2rc80j0071eixoebho3dah	cmash9opk004deirgi05cmepw	Rocco Kult	\N	\N	\N	\N	2025-05-24 21:44:28.051	2025-05-24 21:44:28.051	Lecture	t	2	30	1200	cmb2r21xe0051eixov0cn4mjj
cmb2rc80n0073eixoxw0a8ydj	cmash9opk004deirgi05cmepw	Jeff McBride Master Class	\N	\N	\N	\N	2025-05-24 21:44:28.055	2025-05-24 21:44:28.055	Workshop	t	2	180	1260	cmb2r21xe0051eixov0cn4mjj
cmb30jv79000beiic4urvceqg	cmash9oqz0053eirgingr15m7	Welcoming Party	Cash bar, chance to perform or be entertained by notable 'workers'	Lounge Area	\N	\N	2025-05-25 02:02:21.238	2025-05-25 02:04:40.6	Other	t	0	120	1020	cmb30amo90001eiicjqkefmlm
cmb30jv6z0007eiiccd6kb1e8	cmash9oqz0053eirgingr15m7	REGISTRATION OPENS	\N	\N	\N	\N	2025-05-25 02:02:21.227	2025-05-25 02:04:40.603	Other	t	0	60	900	cmb30amo90001eiicjqkefmlm
cmb30kdsp000teiicb43rxft8	cmash9oqz0053eirgingr15m7	CLOSE UP SHOW	Randy Wakeman, Kevin Kelly, Steve Friedberg, Jimmy Ichihana	\N	\N	\N	2025-05-25 02:02:45.337	2025-05-25 02:04:40.715	Show	t	1	90	1140	cmb30amog0003eiicqao8brzd
cmb30kdst000veiicgrxio4kz	cmash9oqz0053eirgingr15m7	LECTURE - DANNY CHENG	\N	\N	\N	\N	2025-05-25 02:02:45.341	2025-05-25 02:04:40.763	Lecture	t	1	60	1260	cmb30amog0003eiicqao8brzd
cmb30kou9000xeiicm0ft6gnw	cmash9oqz0053eirgingr15m7	FREE BREAKFAST BUFFET	For hotel guests	\N	\N	\N	2025-05-25 02:02:59.649	2025-05-25 02:04:40.763	Other	t	2	180	360	cmb30amok0005eiicoj1w643f
cmb2bogkn006nei505dfdtlf8	cmash9ood003reirghnb26oht	Grand Banquet (Ticket Required)		Discovery Ballroom	\N	\N	2025-05-24 14:26:05.16	2025-06-05 17:36:56.62	Other	t	2	60	1050	cmb0ylms8000bei6ojsjhbus0
cmb2bliht005dei50i00yhcbp	cmash9ood003reirghnb26oht	Annual Business Meeting		Champions V	\N	\N	2025-05-24 14:23:47.682	2025-06-05 21:28:48.988	Other	t	1	60	675	cmb0ylms30009ei6ogkglrjot
cmbjxb5s4000neidgwltg4sax	cmash9omm002veirgjvpu7p7f	The Open Colon "No Frills" Golf Classic	with Al The Only		\N	\N	2025-06-05 22:03:41.188	2025-06-05 22:03:41.188	Other	t	-1	240	480	cmbjxb5s2000leidgelpc0fza
cmbjxc0sx000peidg1ld16p68	cmash9omm002veirgjvpu7p7f	Registration Opens		Abbott Plant	\N	\N	2025-06-05 22:04:21.393	2025-06-05 22:04:21.393	Other	t	0	30	570	cmayw6n9z0005eicwpp5t9c54
cmbjxc0t0000reidgako5auvu	cmash9omm002veirgjvpu7p7f	Abbott's Dealers Room Opens	Requires Registration		\N	\N	2025-06-05 22:04:21.396	2025-06-05 22:04:21.396	Dealers	t	0	480	600	cmayw6n9z0005eicwpp5t9c54
cmbjxc0t2000teidg3jfcdka5	cmash9omm002veirgjvpu7p7f	Abbott's Super Showroom Specials Begins	Requires Registration		\N	\N	2025-06-05 22:04:21.399	2025-06-05 22:04:21.399	Other	t	0	90	630	cmayw6n9z0005eicwpp5t9c54
cmbjxc0t6000veidg3l6qxq3i	cmash9omm002veirgjvpu7p7f	Lecture: Craig Diamond	Requires Registration		\N	\N	2025-06-05 22:04:21.403	2025-06-05 22:04:21.403	Lecture	t	0	60	780	cmayw6n9z0005eicwpp5t9c54
cmbjxc0t9000xeidgotwegsub	cmash9omm002veirgjvpu7p7f	Magic Show	$5	Abbott's Magic Showroom Theatre	\N	\N	2025-06-05 22:04:21.406	2025-06-05 22:04:21.406	Show	t	0	60	780	cmayw6n9z0005eicwpp5t9c54
cmbjxc0td000zeidggt4oos3a	cmash9omm002veirgjvpu7p7f	Lecture: David Charvet	Requires Registration		\N	\N	2025-06-05 22:04:21.41	2025-06-05 22:04:21.41	Lecture	t	0	60	900	cmayw6n9z0005eicwpp5t9c54
cmbjxc0th0011eidgch7js3r0	cmash9omm002veirgjvpu7p7f	Magic Show	$5	Abbott's Magic Showroom Theatre	\N	\N	2025-06-05 22:04:21.413	2025-06-05 22:04:21.413	Show	t	0	60	930	cmayw6n9z0005eicwpp5t9c54
cmbjxc0tk0013eidgnkvfnnbh	cmash9omm002veirgjvpu7p7f	Dinner on your own			\N	\N	2025-06-05 22:04:21.416	2025-06-05 22:04:21.416	Other	t	0	105	1080	cmayw6n9z0005eicwpp5t9c54
cmbjxc0tq0015eidgxyp4xbwk	cmash9omm002veirgjvpu7p7f	Preshow Live Organ Music	by John Sturk		\N	\N	2025-06-05 22:04:21.422	2025-06-05 22:04:21.422	Other	t	0	15	1185	cmayw6n9z0005eicwpp5t9c54
cmbjxc0tw0017eidggkaflgk4	cmash9omm002veirgjvpu7p7f	Get-Together Stage Show ΓÇô Wednesday Night Gala Show	Featuring Lance Burton, BJ Mallen, Keith West, Fielding West, Michael Goodeau\n(Requires Registration or Tickets)		\N	\N	2025-06-05 22:04:21.429	2025-06-05 22:04:21.429	Show	t	0	120	1200	cmayw6n9z0005eicwpp5t9c54
cmbjxc0tz0019eidg5sj1o8lu	cmash9omm002veirgjvpu7p7f	Abbott's Dealers Room Re-Opens	Requires Registration		\N	\N	2025-06-05 22:04:21.431	2025-06-05 22:04:21.431	Dealers	t	0	60	1320	cmayw6n9z0005eicwpp5t9c54
cmbjxcm1v001beidgkxl7v7hx	cmash9omm002veirgjvpu7p7f	Registration Opens		Abbott Plant	\N	\N	2025-06-05 22:04:48.932	2025-06-05 22:04:48.932	Other	t	1	30	570	cmayw6na40007eicwm7notuto
cmbjxcm1z001deidgkn71yyw7	cmash9omm002veirgjvpu7p7f	Abbott's Dealers Room Opens	Requires Registration		\N	\N	2025-06-05 22:04:48.935	2025-06-05 22:04:48.935	Dealers	t	1	480	600	cmayw6na40007eicwm7notuto
cmbjxcm24001feidgvwj7jybt	cmash9omm002veirgjvpu7p7f	Lecture: Mortenn Christiansen	Requires Registration		\N	\N	2025-06-05 22:04:48.941	2025-06-05 22:04:48.941	Lecture	t	1	60	660	cmayw6na40007eicwm7notuto
cmbjxcm27001heidglv74qyve	cmash9omm002veirgjvpu7p7f	Lecture: John Shyrock	Requires Registration		\N	\N	2025-06-05 22:04:48.943	2025-06-05 22:04:48.943	Lecture	t	1	60	780	cmayw6na40007eicwm7notuto
cmbjxcm29001jeidge5boukpk	cmash9omm002veirgjvpu7p7f	Magic Show	$5	Abbott's Magic Showroom Theatre	\N	\N	2025-06-05 22:04:48.946	2025-06-05 22:04:48.946	Show	t	1	60	780	cmayw6na40007eicwm7notuto
cmbjxcm2c001leidgw7yxl4p9	cmash9omm002veirgjvpu7p7f	Vent-O-Rama	Requires Registration	Abbott's Plant	\N	\N	2025-06-05 22:04:48.948	2025-06-05 22:04:48.948	Show	t	1	60	870	cmayw6na40007eicwm7notuto
cmbjxcm2e001neidgrn0xtbvi	cmash9omm002veirgjvpu7p7f	Magic Show	$5	Abbott's Magic Showroom Theatre	\N	\N	2025-06-05 22:04:48.951	2025-06-05 22:04:48.951	Show	t	1	60	930	cmayw6na40007eicwm7notuto
cmbjxcm2h001peidgisqh9ywb	cmash9omm002veirgjvpu7p7f	Famous Magicians Graveyard Tour	Ushered by Al The Only		\N	\N	2025-06-05 22:04:48.954	2025-06-05 22:04:48.954	Other	t	1	60	945	cmayw6na40007eicwm7notuto
cmbjxcm2q001reidg79nfi2tz	cmash9omm002veirgjvpu7p7f	Dinner on your own			\N	\N	2025-06-05 22:04:48.962	2025-06-05 22:04:48.962	Other	t	1	105	1080	cmayw6na40007eicwm7notuto
cmbjxcm2t001teidgo35wnjrz	cmash9omm002veirgjvpu7p7f	Preshow Live Organ Music	by John Sturk		\N	\N	2025-06-05 22:04:48.966	2025-06-05 22:04:48.966	Other	t	1	15	1185	cmayw6na40007eicwm7notuto
cmbjxcm2w001veidglmynsrbr	cmash9omm002veirgjvpu7p7f	Get-Together Stage Show ΓÇô Thursday Night Gala Show	Featuring Mike Caveney, Tom Ewing, David Charvet, Marc DeSouza, Craig Diamond\n(Requires Registration or Tickets)		\N	\N	2025-06-05 22:04:48.969	2025-06-05 22:04:48.969	Show	t	1	120	1200	cmayw6na40007eicwm7notuto
cmbjxcm32001xeidgamzdgvpk	cmash9omm002veirgjvpu7p7f	Abbott's Dealers Room Re-Opens	Requires Registration		\N	\N	2025-06-05 22:04:48.975	2025-06-05 22:04:48.975	Dealers	t	1	60	1320	cmayw6na40007eicwm7notuto
cmbjxd1p4001zeidgq9lq0m23	cmash9omm002veirgjvpu7p7f	Registration Opens		Abbott Plant	\N	\N	2025-06-05 22:05:09.208	2025-06-05 22:05:09.208	Other	t	2	30	570	cmayw6na80009eicwro2vvw5x
cmbjxd1p70021eidgkywoy7ed	cmash9omm002veirgjvpu7p7f	Abbott's Dealers Room Opens	Requires Registration		\N	\N	2025-06-05 22:05:09.211	2025-06-05 22:05:09.211	Dealers	t	2	480	600	cmayw6na80009eicwro2vvw5x
cmbjxd1p90023eidg9y5qmoye	cmash9omm002veirgjvpu7p7f	Lecture: Jeff Hobson	Requires Registration		\N	\N	2025-06-05 22:05:09.214	2025-06-05 22:05:09.214	Lecture	t	2	60	690	cmayw6na80009eicwro2vvw5x
cmbjxd1pc0025eidg8clpuebi	cmash9omm002veirgjvpu7p7f	Magic Show	$5	Abbott's Magic Showroom Theatre	\N	\N	2025-06-05 22:05:09.217	2025-06-05 22:05:09.217	Show	t	2	60	780	cmayw6na80009eicwro2vvw5x
cmbjxd1pf0027eidgu8qcrokl	cmash9omm002veirgjvpu7p7f	Abbott's Close-Up Show	Featuring John Shyrock, Mortenn Christiansen, Marc DeSouza\n(Requires Registration)		\N	\N	2025-06-05 22:05:09.219	2025-06-05 22:05:09.219	Show	t	2	60	870	cmayw6na80009eicwro2vvw5x
cmbjxd1pj0029eidgiozzowbl	cmash9omm002veirgjvpu7p7f	Magic Show	$5	Abbott's Magic Showroom Theatre	\N	\N	2025-06-05 22:05:09.223	2025-06-05 22:05:09.223	Show	t	2	60	930	cmayw6na80009eicwro2vvw5x
cmbjxd1pl002beidgoh8h1z62	cmash9omm002veirgjvpu7p7f	Dinner on your own			\N	\N	2025-06-05 22:05:09.226	2025-06-05 22:05:09.226	Other	t	2	105	1080	cmayw6na80009eicwro2vvw5x
cmbjxd1po002deidgzjcsg8rq	cmash9omm002veirgjvpu7p7f	Preshow Live Organ Music	by John Sturk		\N	\N	2025-06-05 22:05:09.228	2025-06-05 22:05:09.228	Other	t	2	15	1185	cmayw6na80009eicwro2vvw5x
cmbjxd1pq002feidgrdwkl6hk	cmash9omm002veirgjvpu7p7f	Get-Together Stage Show ΓÇô Friday Night Gala Show	Featuring Dale Salwak, Derek Hughes, Mortenn Christiansen, Artem Shchukin\n(Requires Registration or Tickets)		\N	\N	2025-06-05 22:05:09.23	2025-06-05 22:05:09.23	Show	t	2	120	1200	cmayw6na80009eicwro2vvw5x
cmbjxd1ps002heidgt7h8l6qh	cmash9omm002veirgjvpu7p7f	Abbott's Dealers Room Re-Opens	Requires Registration		\N	\N	2025-06-05 22:05:09.232	2025-06-05 22:05:09.232	Dealers	t	2	60	1320	cmayw6na80009eicwro2vvw5x
cmbjxdkdj002jeidgb4ucm1zg	cmash9omm002veirgjvpu7p7f	Registration Opens		Abbott Plant	\N	\N	2025-06-05 22:05:33.415	2025-06-05 22:05:33.415	Other	t	3	30	570	cmayw6nad000beicw16ru8j6u
cmbjxdkdp002leidg35c08ku0	cmash9omm002veirgjvpu7p7f	Abbott's Dealers Room Opens	Requires Registration		\N	\N	2025-06-05 22:05:33.421	2025-06-05 22:05:33.421	Dealers	t	3	480	600	cmayw6nad000beicw16ru8j6u
cmbjxdkds002neidgu5usmhgk	cmash9omm002veirgjvpu7p7f	Lecture: Marc DeSouza	Requires Registration		\N	\N	2025-06-05 22:05:33.424	2025-06-05 22:05:33.424	Lecture	t	3	60	660	cmayw6nad000beicw16ru8j6u
cmbjxdkdw002peidgmeq7n03j	cmash9omm002veirgjvpu7p7f	Lecture: Artem Shchukin	Requires Registration		\N	\N	2025-06-05 22:05:33.429	2025-06-05 22:05:33.429	Lecture	t	3	60	780	cmayw6nad000beicw16ru8j6u
cmbjxdke0002reidgbathrm05	cmash9omm002veirgjvpu7p7f	Magic Show	$5	Abbott's Magic Showroom Theatre	\N	\N	2025-06-05 22:05:33.432	2025-06-05 22:05:33.432	Show	t	3	60	780	cmayw6nad000beicw16ru8j6u
cmbjxdke6002teidgcvv1i4z4	cmash9omm002veirgjvpu7p7f	Lecture: Lance Burton & Friends	Requires Registration		\N	\N	2025-06-05 22:05:33.438	2025-06-05 22:05:33.438	Lecture	t	3	60	900	cmayw6nad000beicw16ru8j6u
cmbjxdke9002veidgo2qzapqq	cmash9omm002veirgjvpu7p7f	Magic Show	$5	Abbott's Magic Showroom Theatre	\N	\N	2025-06-05 22:05:33.442	2025-06-05 22:05:33.442	Show	t	3	60	930	cmayw6nad000beicw16ru8j6u
cmbjxdkee002xeidgg4tlxvq3	cmash9omm002veirgjvpu7p7f	Dinner on your own			\N	\N	2025-06-05 22:05:33.447	2025-06-05 22:05:33.447	Other	t	3	105	1080	cmayw6nad000beicw16ru8j6u
cmbjxdkel002zeidgwd9x33v4	cmash9omm002veirgjvpu7p7f	Preshow Live Organ Music	by John Sturk		\N	\N	2025-06-05 22:05:33.453	2025-06-05 22:05:33.453	Other	t	3	15	1185	cmayw6nad000beicw16ru8j6u
cmbjxdket0031eidgj2fyf319	cmash9omm002veirgjvpu7p7f	Get-Together Stage Show ΓÇô Saturday Night Gala Show	Featuring Greg Frewin & Alexandra, Dan Sperry, John Shyrock\n(Requires Registration or Tickets)		\N	\N	2025-06-05 22:05:33.461	2025-06-05 22:05:33.461	Show	t	3	120	1200	cmayw6nad000beicw16ru8j6u
cmbjxdkez0033eidgvk9yckk1	cmash9omm002veirgjvpu7p7f	Abbott's Dealers Room Re-Opens	Requires Registration		\N	\N	2025-06-05 22:05:33.467	2025-06-05 22:05:33.467	Dealers	t	3	60	1320	cmayw6nad000beicw16ru8j6u
cmbjxdkf30035eidg7wtkwxsi	cmash9omm002veirgjvpu7p7f	Abbott's Performer Awards	Requires Registration		\N	\N	2025-06-05 22:05:33.472	2025-06-05 22:05:33.472	Other	t	3	30	1350	cmayw6nad000beicw16ru8j6u
\.


--
-- Data for Name: ConventionSeries; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."ConventionSeries" (id, name, description, "createdAt", "updatedAt", "organizerUserId", "logoUrl", slug) FROM stdin;
cmasg3kiy0011eif83c0pu7vv	WonderBash	\N	2025-05-17 16:32:06.826	2025-05-17 18:14:47.521	cmasfvd8r0001eisc0j4y9gc5	\N	cs-wonderbash
cmasg3kuc0057eif8m4fdzwht	Magi-Whirl	\N	2025-05-17 16:32:07.237	2025-05-17 18:56:57.408	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magi-whirl
cmasg3l8300aheif8rddlce3i	TRICS	\N	2025-05-17 16:32:07.731	2025-05-20 04:03:43.362	cmasfvd8r0001eisc0j4y9gc5	\N	cs-trics
cmasg3kor002zeif8kerqlog0	Melbourne Magic Festival	\N	2025-05-17 16:32:07.035	2025-05-17 17:04:51.562	cmasfvd8r0001eisc0j4y9gc5	\N	cs-melbourne-magic-festival
cmasg3kv3005heif8xze7fslo	TAOM	\N	2025-05-17 16:32:07.263	2025-05-24 21:30:15.982	cmasfvd8r0001eisc0j4y9gc5	\N	cs-taom
cmasg3kq5003jeif8c0bd8ywl	FISM	\N	2025-05-17 16:32:07.085	2025-05-17 17:04:51.568	cmasfvd8r0001eisc0j4y9gc5	\N	cs-fism
cmasg3kqv003teif80nbo3ex4	FCM	\N	2025-05-17 16:32:07.111	2025-05-17 17:04:51.572	cmasfvd8r0001eisc0j4y9gc5	\N	cs-fcm
cmasg3krj0043eif8kp9ach9l	Abbott's	\N	2025-05-17 16:32:07.135	2025-05-17 17:04:51.576	cmasfvd8r0001eisc0j4y9gc5	\N	cs-abbotts
cmasg3ks8004deif8ycwmqvgv	MAGIC Live!	\N	2025-05-17 16:32:07.161	2025-05-17 17:04:51.579	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magic-live
cmasg3ksw004neif8we0usrks	KIDabra	\N	2025-05-17 16:32:07.185	2025-05-17 17:04:51.583	cmasfvd8r0001eisc0j4y9gc5	\N	cs-kidabra
cmasg3ktn004xeif8vl6amaiq	Poe's Magic Conference	\N	2025-05-17 16:32:07.211	2025-05-17 17:04:51.586	cmasfvd8r0001eisc0j4y9gc5	\N	cs-poes-magic-conference
cmasg3l1j007zeif8hrgxqk8t	Magistrorum	\N	2025-05-17 16:32:07.495	2025-05-24 22:01:14.837	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magistrorum
cmasg3kph0039eif8ng2n0e71	IBM Convention	\N	2025-05-17 16:32:07.061	2025-06-05 21:27:51.117	cmasfvd8r0001eisc0j4y9gc5	\N	cs-ibm-convention
cmasg3kvt005reif829d2fau5	DC Festival of Magic	\N	2025-05-17 16:32:07.289	2025-05-17 17:04:51.596	cmasfvd8r0001eisc0j4y9gc5	\N	cs-dc-festival-of-magic
cmasg3kwk0061eif83pprh6ev	MAES	\N	2025-05-17 16:32:07.316	2025-05-17 17:04:51.599	cmasfvd8r0001eisc0j4y9gc5	\N	cs-maes
cmasg3kx8006beif831jdepz7	Fr├╢hlich Magic Convention	\N	2025-05-17 16:32:07.341	2025-05-17 17:04:51.603	cmasfvd8r0001eisc0j4y9gc5	\N	cs-frohlich-magic-convention
cmasg3kxz006leif830z0kix3	Leeds Magic Jam	\N	2025-05-17 16:32:07.367	2025-05-17 17:04:51.606	cmasfvd8r0001eisc0j4y9gc5	\N	cs-leeds-magic-jam
cmasg3kyp006veif88i1pz05b	Magic at the Beach	\N	2025-05-17 16:32:07.394	2025-05-17 17:04:51.61	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magic-at-the-beach
cmasg3kze0075eif8y4g4ecym	IBM British Ring	\N	2025-05-17 16:32:07.419	2025-05-17 17:04:51.614	cmasfvd8r0001eisc0j4y9gc5	\N	cs-ibm-british-ring
cmasg3l05007feif8ooai5dmy	Magialdia Magic Festival	\N	2025-05-17 16:32:07.445	2025-05-17 17:04:51.617	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magialdia-magic-festival
cmasg3l0t007peif8rr3yjhbl	Original Close-Up Magic Symposium	\N	2025-05-17 16:32:07.469	2025-05-17 17:04:51.62	cmasfvd8r0001eisc0j4y9gc5	\N	cs-original-close-up-magic-symposium
cmasg3l2e0089eif8n36iomv2	Festival de Magie de Qu├⌐bec	\N	2025-05-17 16:32:07.526	2025-05-17 17:04:51.627	cmasfvd8r0001eisc0j4y9gc5	\N	cs-festival-de-magie-de-quebec
cmasg3l33008jeif8j5vkwi23	The Conjuror Community Summit	\N	2025-05-17 16:32:07.551	2025-05-17 17:04:51.63	cmasfvd8r0001eisc0j4y9gc5	\N	cs-the-conjuror-community-summit
cmasg3l3u008teif8qj4i65vz	Abano National Convention	\N	2025-05-17 16:32:07.579	2025-05-17 17:04:51.633	cmasfvd8r0001eisc0j4y9gc5	\N	cs-abano-national-convention
cmasg3l4j0093eif81gb3k7pj	New York Magic Conference	\N	2025-05-17 16:32:07.603	2025-05-17 17:04:51.636	cmasfvd8r0001eisc0j4y9gc5	\N	cs-new-york-magic-conference
cmasg3l5a009deif8ifd8m6hi	French Championship of Magic	\N	2025-05-17 16:32:07.63	2025-05-17 17:04:51.64	cmasfvd8r0001eisc0j4y9gc5	\N	cs-french-championship-of-magic
cmasg3l5y009neif83ceb6sbh	MAGICA	\N	2025-05-17 16:32:07.655	2025-05-17 17:04:51.643	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magica
cmasg3l6o009xeif8dzwh6tvt	Magic Valley Magic Convention	\N	2025-05-17 16:32:07.681	2025-05-17 17:04:51.646	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magic-valley-magic-convention
cmasg3l7d00a7eif8xb5y7d0q	South Tyneside International Magic Festival	\N	2025-05-17 16:32:07.705	2025-05-17 17:04:51.649	cmasfvd8r0001eisc0j4y9gc5	\N	cs-south-tyneside-international-magic-festival
cmasg3la600bbeif8wjc93wbv	The Session	\N	2025-05-17 16:32:07.806	2025-05-21 20:27:15.637	cmasfvd8r0001eisc0j4y9gc5	\N	cs-the-session
cmasg3l8s00areif8fbuq8ix1	East Coast Spirit Sessions	\N	2025-05-17 16:32:07.756	2025-05-17 17:04:51.655	cmasfvd8r0001eisc0j4y9gc5	\N	cs-east-coast-spirit-sessions
cmasg3l9h00b1eif881m2kne4	Gator Gate Gathering	\N	2025-05-17 16:32:07.782	2025-05-17 17:04:51.659	cmasfvd8r0001eisc0j4y9gc5	\N	cs-gator-gate-gathering
cmasg3ko1002peif8h3122cfl	Tampa Bay Festival of Magic	\N	2025-05-17 16:32:07.009	2025-05-22 23:31:13.356	cmasfvd8r0001eisc0j4y9gc5	\N	cs-tampa-bay-festival-of-magic
cmasg3lax00bleif82n4s9w0v	Magi-Fest	\N	2025-05-17 16:32:07.833	2025-05-17 17:04:51.665	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magi-fest
cmasg3lbn00bveif8wdjxfe8e	Kapital Konvention	\N	2025-05-17 16:32:07.859	2025-05-17 17:04:51.668	cmasfvd8r0001eisc0j4y9gc5	\N	cs-kapital-konvention
cmasg3lcd00c5eif8ghan0m9y	Flasoma	\N	2025-05-17 16:32:07.885	2025-05-17 17:04:51.672	cmasfvd8r0001eisc0j4y9gc5	\N	cs-flasoma
cmasg3ld200cfeif8nsnvvm05	Blackpool Convention	\N	2025-05-17 16:32:07.911	2025-05-17 17:04:51.675	cmasfvd8r0001eisc0j4y9gc5	\N	cs-blackpool-convention
cmasg3ldq00cpeif80gvab5he	Magic Capital Close-Up Convention	\N	2025-05-17 16:32:07.935	2025-05-17 17:04:51.679	cmasfvd8r0001eisc0j4y9gc5	\N	cs-magic-capital-close-up-convention
cmasg3khb000heif8ks0wsae4	The Gateway Close-Up Gathering	\N	2025-05-17 16:32:06.768	2025-05-17 17:04:51.682	cmasfvd8r0001eisc0j4y9gc5	\N	cs-the-gateway-close-up-gathering
cmasg3ki5000reif8lx5av41e	Another Darn Convention	\N	2025-05-17 16:32:06.797	2025-05-17 18:14:22.05	cmasfvd8r0001eisc0j4y9gc5	\N	cs-another-darn-convention
cmasg3kgc0007eif866qowd02	Portland Magic Jam	\N	2025-05-17 16:32:06.732	2025-05-17 18:14:42.552	cmasfvd8r0001eisc0j4y9gc5	\N	cs-portland-magic-jam
cmasg3kk2001beif8fsfzujyu	FFFF	\N	2025-05-17 16:32:06.867	2025-05-17 18:14:53.438	cmasfvd8r0001eisc0j4y9gc5	\N	cs-ffff
cmasg3kl3001leif86vq1co19	MAWNY	\N	2025-05-17 16:32:06.903	2025-05-17 18:14:58.573	cmasfvd8r0001eisc0j4y9gc5	\N	cs-mawny
cmasg3kmk0025eif88grqswiz	AbraCORNdabra	\N	2025-05-17 16:32:06.956	2025-05-17 17:04:51.551	cmasfvd8r0001eisc0j4y9gc5	\N	cs-abracorndabra
cmasg3klv001veif811tzk4ht	Collector's Expo	\N	2025-05-17 16:32:06.931	2025-05-17 18:15:08.43	cmasfvd8r0001eisc0j4y9gc5	\N	cs-collectors-expo
cmasg3kna002feif8743ltjw9	Michigan Magic Day	\N	2025-05-17 16:32:06.983	2025-05-17 17:04:51.555	cmasfvd8r0001eisc0j4y9gc5	\N	cs-michigan-magic-day
\.


--
-- Data for Name: Hotel; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."Hotel" (id, "conventionId", "isPrimaryHotel", "isAtPrimaryVenueLocation", "hotelName", description, "websiteUrl", "googleMapsUrl", "streetAddress", city, "stateRegion", "postalCode", country, "contactEmail", "contactPhone", "groupRateOrBookingCode", "groupPrice", "bookingLink", "bookingCutoffDate", amenities, "parkingInfo", "publicTransportInfo", "overallAccessibilityNotes", "createdAt", "updatedAt") FROM stdin;
b81b3b67-cb72-427c-a6d3-48457b9f35ed	cmash9or40055eirgc7jv3ygo	t	f	The Premiere Hotel														\N	{}				2025-05-20 15:50:15.86	2025-05-21 20:27:15.679
ab92dab1-e575-427b-bc4f-8e7931cf4cbf	cmash9or40055eirgc7jv3ygo	f	f	The Continental														\N	{}				2025-05-20 15:49:48.651	2025-05-21 20:27:15.692
\.


--
-- Data for Name: HotelPhoto; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."HotelPhoto" (id, "hotelId", url, caption, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PriceDiscount; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."PriceDiscount" (id, "conventionId", "cutoffDate", "priceTierId", "discountedAmount", "createdAt", "updatedAt") FROM stdin;
cmb2ie06p0005ei8oms54hii2	cmash9omm002veirgjvpu7p7f	2025-06-02 00:00:00	cmb2idej20003ei8od4oj7yvz	350.000000000000000000000000000000	2025-05-24 17:33:54.674	2025-05-24 17:33:54.674
\.


--
-- Data for Name: PriceTier; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."PriceTier" (id, "conventionId", label, amount, "order", "createdAt", "updatedAt") FROM stdin;
cmb2ri6uz007deixoed3x8rdz	cmash9opk004deirgi05cmepw	Full Convention Pass	170.000000000000000000000000000000	0	2025-05-24 21:49:06.491	2025-05-24 22:01:14.864
cmb2ri6v4007feixojflzrig5	cmash9opk004deirgi05cmepw	Friday & Saturday Only Pass	150.000000000000000000000000000000	1	2025-05-24 21:49:06.496	2025-05-24 22:01:14.869
cmavau4tw0003eiis303y432v	cmash9or40055eirgc7jv3ygo	VIP	300.000000000000000000000000000000	1	2025-05-19 16:28:07.028	2025-05-21 20:27:15.706
cmasro1kx000heilc8nuszmp3	cmash9or80057eirggwzrchnv	Magician Registration	260.000000000000000000000000000000	0	2025-05-17 21:55:57.826	2025-05-20 04:03:43.397
cmasro1ky000jeilcroez909j	cmash9or80057eirggwzrchnv	Jr. Magician	165.000000000000000000000000000000	1	2025-05-17 21:55:57.827	2025-05-20 04:03:43.401
cmasro1l0000leilcdujckfl3	cmash9or80057eirggwzrchnv	Spouse	165.000000000000000000000000000000	2	2025-05-17 21:55:57.828	2025-05-20 04:03:43.405
cmasro1l1000neilc00a7ki63	cmash9or80057eirggwzrchnv	Show Ticket - Friday	30.000000000000000000000000000000	3	2025-05-17 21:55:57.83	2025-05-20 04:03:43.41
cmasro1l3000peilcvkwanc9y	cmash9or80057eirggwzrchnv	Show Ticket - Saturday	30.000000000000000000000000000000	4	2025-05-17 21:55:57.831	2025-05-20 04:03:43.414
cmatu8ast0001eiro20ci2nss	cmash9or40055eirgc7jv3ygo	Standard Registration	175.000000000000000000000000000000	0	2025-05-18 15:55:28.301	2025-05-21 20:27:15.71
cmb2ri6v9007heixohembankm	cmash9opk004deirgi05cmepw	Saturday Only Pass	100.000000000000000000000000000000	2	2025-05-24 21:49:06.502	2025-05-24 22:01:14.873
cmb2ri6ve007jeixorpfdw26b	cmash9opk004deirgi05cmepw	Jeff McBride's Master Class	100.000000000000000000000000000000	3	2025-05-24 21:49:06.507	2025-05-24 22:01:14.877
cmb2ri6vh007leixoafhjzz0b	cmash9opk004deirgi05cmepw	Paranormal Crossroads Theatrical Seance Workshop - Limited to 10 People	60.000000000000000000000000000000	4	2025-05-24 21:49:06.509	2025-05-24 22:01:14.88
cmb2idej20003ei8od4oj7yvz	cmash9omm002veirgjvpu7p7f	Full Convention Price	400.000000000000000000000000000000	0	2025-05-24 17:33:26.607	2025-05-24 17:33:26.607
cmaxas04f0009eipow546xlsj	cmash9oqn004xeirggiomuld6	Tampa Magic Club Member	50.000000000000000000000000000000	0	2025-05-21 02:01:59.967	2025-05-24 18:12:26.888
cmaxat499000deipoawo8csjz	cmash9oqn004xeirggiomuld6	Non-Members	60.000000000000000000000000000000	1	2025-05-21 02:02:51.982	2025-05-24 18:12:26.892
cmaxat49c000feipow6qfxkdl	cmash9oqn004xeirggiomuld6	Flea Market Table	15.000000000000000000000000000000	2	2025-05-21 02:02:51.984	2025-05-24 18:12:26.895
cmaxat49f000heipo3igqur5r	cmash9oqn004xeirggiomuld6	Magic Competition Fee	10.000000000000000000000000000000	3	2025-05-21 02:02:51.987	2025-05-24 18:12:26.897
cmb2kgpsy0037eixo4jzll9v9	cmash9ool003veirgsrdn6k3t	Standard Registration	279.950000000000000000000000000000	0	2025-05-24 18:32:00.419	2025-05-24 18:32:18.329
cmb2kgpt30039eixopmr6etfx	cmash9ool003veirgsrdn6k3t	Spouse/Partner	169.950000000000000000000000000000	1	2025-05-24 18:32:00.423	2025-05-24 18:32:18.332
cmb2kgpt5003beixoopj09i36	cmash9ool003veirgsrdn6k3t	Youth	169.950000000000000000000000000000	2	2025-05-24 18:32:00.425	2025-05-24 18:32:18.335
cmb2kgpt7003deixotex4o517	cmash9ool003veirgsrdn6k3t	Optional ShowSkills Workshops (with Registration)	99.950000000000000000000000000000	3	2025-05-24 18:32:00.427	2025-05-24 18:32:18.337
\.


--
-- Data for Name: RoleApplication; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."RoleApplication" (id, "userId", "requestedRole", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ScheduleDay; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."ScheduleDay" (id, "conventionId", "dayOffset", "isOfficial", label) FROM stdin;
cmayea0gm0001eizsy6ixyyg4	cmash9or40055eirgc7jv3ygo	0	t	Day 1
cmayea0gs0003eizsd13eb5jp	cmash9or40055eirgc7jv3ygo	1	t	Day 2
cmayea0gv0005eizs9nd5vfne	cmash9or40055eirgc7jv3ygo	2	t	Day 3
cmayeaim80007eizsfcdkzqhf	cmash9oqn004xeirggiomuld6	0	t	Day 1
cmayw6n9z0005eicwpp5t9c54	cmash9omm002veirgjvpu7p7f	0	t	Day 1
cmayw6na40007eicwm7notuto	cmash9omm002veirgjvpu7p7f	1	t	Day 2
cmayw6na80009eicwro2vvw5x	cmash9omm002veirgjvpu7p7f	2	t	Day 3
cmayw6nad000beicw16ru8j6u	cmash9omm002veirgjvpu7p7f	3	t	Day 4
cmb0ylmry0007ei6o7m65dmfe	cmash9ood003reirghnb26oht	0	t	Day 1
cmb0ylms30009ei6ogkglrjot	cmash9ood003reirghnb26oht	1	t	Day 2
cmb0ylms8000bei6ojsjhbus0	cmash9ood003reirghnb26oht	2	t	Day 3
cmb0ylmsc000dei6o63vzthes	cmash9ood003reirghnb26oht	3	t	Day 4
cmb1ax92t0005eiysedzweu8y	cmash9ood003reirghnb26oht	-1	f	Pre-Con Day 1
cmb1axbe50007eiysuupgrelj	cmash9ood003reirghnb26oht	-2	f	Pre-Con Day 2
cmb2ck5910087ei50t0rvnrhy	cmash9oop003xeirgf2d9pkjr	0	t	Day 1
cmb2ck5970089ei50k7k0ayuh	cmash9oop003xeirgf2d9pkjr	1	t	Day 2
cmb2ck59c008bei50ocd4t5no	cmash9oop003xeirgf2d9pkjr	2	t	Day 3
cmb2k00yn000xeixon4qhsolh	cmash9ool003veirgsrdn6k3t	0	t	Day 1
cmb2k00yt000zeixo2dghh2wz	cmash9ool003veirgsrdn6k3t	1	t	Day 2
cmb2k00yx0011eixojwv0geky	cmash9ool003veirgsrdn6k3t	2	t	Day 3
cmb2k00z30013eixo74l8bmid	cmash9ool003veirgsrdn6k3t	3	t	Day 4
cmb2konha003neixoeszlp1mu	cmash9oqr004zeirg4jnzg2i4	0	t	Day 1
cmb2konhg003peixoju6v7hyf	cmash9oqr004zeirg4jnzg2i4	1	t	Day 2
cmb2konhl003reixorzan87ff	cmash9oqr004zeirg4jnzg2i4	2	f	Day 3
cmb2r21wz004xeixopa9uluzp	cmash9opk004deirgi05cmepw	0	t	Day 1
cmb2r21x7004zeixosz578rmd	cmash9opk004deirgi05cmepw	1	t	Day 2
cmb2r21xe0051eixov0cn4mjj	cmash9opk004deirgi05cmepw	2	t	Day 3
cmb2r21xk0053eixoe8oz75jp	cmash9opk004deirgi05cmepw	3	t	Day 4
cmb30amo90001eiicjqkefmlm	cmash9oqz0053eirgingr15m7	0	t	Day 1
cmb30amog0003eiicqao8brzd	cmash9oqz0053eirgingr15m7	1	t	Day 2
cmb30amok0005eiicoj1w643f	cmash9oqz0053eirgingr15m7	2	t	Day 3
cmbjx6rlt000beidgcrv7n2uc	cmash9one0039eirg8a8bqj5z	0	t	Day 1
cmbjx6rm1000deidgvug4w03r	cmash9one0039eirg8a8bqj5z	1	t	Day 2
cmbjx6rm4000feidgsdbhxvy9	cmash9one0039eirg8a8bqj5z	2	t	Day 3
cmbjx6rm8000heidgqflnddvh	cmash9one0039eirg8a8bqj5z	3	t	Day 4
cmbjx6rmd000jeidgaupuom6e	cmash9one0039eirg8a8bqj5z	4	t	Day 5
cmbjxb5s2000leidgelpc0fza	cmash9omm002veirgjvpu7p7f	-1	f	Day 0 (Auto-created)
\.


--
-- Data for Name: ScheduleEventBrandLink; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."ScheduleEventBrandLink" (id, "scheduleItemId", "brandProfileId") FROM stdin;
\.


--
-- Data for Name: ScheduleEventFeeTier; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."ScheduleEventFeeTier" (id, "scheduleItemId", label, amount) FROM stdin;
\.


--
-- Data for Name: ScheduleEventTalentLink; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."ScheduleEventTalentLink" (id, "scheduleItemId", "talentProfileId") FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."Session" (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."User" (id, name, email, "emailVerified", image, "hashedPassword", roles, "createdAt", "updatedAt", bio, "resetToken", "resetTokenExpiry", timezone) FROM stdin;
cmasfvd8r0001eisc0j4y9gc5	Joe Blow	jafo@getjafo.com	\N	\N	$2b$10$7X0eksdDHhpUWZzn1Mp1KuNlYeyif/REXYyFqiBcF3s.nv7Fya.Ya	{USER,TALENT,ORGANIZER}	2025-05-17 16:25:44.139	2025-05-17 17:04:51.506	\N	\N	\N	\N
cmasfvd940004eiscv49xg1tc	Test03	test03@example.com	\N	\N	$2b$10$7X0eksdDHhpUWZzn1Mp1KuNlYeyif/REXYyFqiBcF3s.nv7Fya.Ya	{USER}	2025-05-17 16:25:44.152	2025-05-17 17:04:51.517	\N	\N	\N	\N
cmasfvd980005eiscnnptc9v5	Test04	test04@example.com	\N	\N	$2b$10$7X0eksdDHhpUWZzn1Mp1KuNlYeyif/REXYyFqiBcF3s.nv7Fya.Ya	{USER}	2025-05-17 16:25:44.156	2025-05-17 17:04:51.521	\N	\N	\N	\N
cmasfvd8z0003eisc0xike4z8	Test02	test02@example.com	\N	\N	$2b$10$7X0eksdDHhpUWZzn1Mp1KuNlYeyif/REXYyFqiBcF3s.nv7Fya.Ya	{USER,ADMIN}	2025-05-17 16:25:44.148	2025-06-06 03:41:29.241	\N	\N	\N	\N
\.


--
-- Data for Name: Venue; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."Venue" (id, "conventionId", "isPrimaryVenue", "venueName", description, "websiteUrl", "googleMapsUrl", "streetAddress", city, "stateRegion", "postalCode", country, "contactEmail", "contactPhone", amenities, "parkingInfo", "publicTransportInfo", "overallAccessibilityNotes", "createdAt", "updatedAt") FROM stdin;
fed0b615-4525-421d-94fb-5326c2b191ea	cmash9opk004deirgi05cmepw	t	Marriott Dallas Las Colinas		https://www.marriott.com/en-us/hotels/dalcl-marriott-dallas-las-colinas/overview/	https://www.google.com/maps/place/Marriott+Dallas+Las+Colinas/@32.8722334,-96.944355,17z/data=!4m9!3m8!1s0x864e82bd8b12b855:0x9e10bade2e8e42c!5m2!4m1!1i2!8m2!3d32.8722289!4d-96.9417801!16s%2Fg%2F1tz964lx?entry=ttu&g_ep=EgoyMDI1MDUyMS4wIKXMDSoASAFQAw%3D%3D	223 West Las Colinas Boulevard	Irving	TX	75039	United States			{"Heated indoor pool (open 7:00 AM ΓÇô 10:00 PM daily)","24-hour fitness center with cardio machines and free weights","Concierge Lounge (open 6:30 AMΓÇô9:30 AM MonΓÇôFri, 5:30 PMΓÇô10:30 PM SunΓÇôThu)","Complimentary Wi-Fi in public areas","Dry cleaning and laundry services","Daily housekeeping","Evening turndown service","Mobile key access","Digital check-in","Self-parking (complimentary)","Valet parking ($18.00 per day)","Multiple meeting rooms with AV services","On-site catering for events","Business center access"}	Self-Parking: Complimentary\nValet Parking: $18.00 per day 			2025-05-24 21:56:54.649	2025-05-24 22:01:14.848
f920bc9d-3036-41d8-adea-9c96b1d9e26f	cmash9or40055eirgc7jv3ygo	t	London Hilton											{}				2025-05-20 15:48:42.863	2025-05-21 20:27:15.646
2281ebfb-2bca-477b-8323-8ace439af454	cmash9or40055eirgc7jv3ygo	f	The Globe Theater											{}				2025-05-20 15:49:16.357	2025-05-21 20:27:15.658
15d99d87-f72c-4ea1-af34-71d54f2baa39	cmash9or80057eirggwzrchnv	t	Hilton Charlotte University Place	<p>We're glad you can join us for 2025 TRICS CONVENTION.</p>\n<p>We have a room block reserved at Hilton Charlotte University Place for November 19, 2025 through November 23, 2025. Booking your room is simple, just select "Book a Room" to receive your group's preferred rate.</p>\n<p>We're looking forward to seeing you in November! We hope you enjoy your stay and your group's event!</p>\n<p>We&rsquo;re off I-85, steps from the Shoppes at University Place and a half mile from The University of North Carolina at Charlotte. Charlotte Motor Speedway, zMAX Dragway, and PNC Music Pavilion are within five miles. We offer event space and a full-service restaurant. Enjoy our seasonal outdoor pool, fitness center, and caf&eacute; serving Starbucks&reg; coffee.</p>	https://www.hilton.com/en/attend-my-event/clthuhf-trics-2f85e42f-49b1-4898-ac02-f787382d9ba6/	https://www.google.com/maps/search/?api=1&query=Hilton+Charlotte+University+Place%2C+8629+JM+Keynes+Drive+Charlotte%2C+NC+US	8629 JM Keynes Drive	Charlotte	NC	28262	United States	CLTHU_GM@hilton.com	+1 704-547-7444	{"Connecting Rooms","Free parking","Free WiFi","Non-smoking rooms","Digital Key",Concierge,"Executive lounge","Streaming entertainment","On-site restaurant","Outdoor pool","Fitness center","Meeting rooms","Pets not allowed"}	Self-parking: Complimentary\nValet parking: Not available\nEV charging: Nearby, 3 miles\nSecured: Not available\nCovered: Not available\nIn/Out privileges: Available	Concord Regional Airport: Not available\nCharlotte/Douglas International Airport: Not available\nPiedmont Triad International Airport: Not available		2025-05-20 03:58:21.562	2025-05-20 04:03:43.373
1fa1eb3b-0bf4-4cf3-8446-d74b19cb31c1	cmash9oqn004xeirggiomuld6	t	Lions Eye Institute			https://www.google.com/maps/place/Central+Florida+Lions+Eye/data=!4m2!3m1!1s0x0:0x592e193d8afdb0ea?sa=X&ved=1t:2428&ictx=111	1410 N. 21st St,	Tampa	FL	33605	United States			{}				2025-05-21 02:04:54.511	2025-05-22 23:31:13.364
\.


--
-- Data for Name: VenuePhoto; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."VenuePhoto" (id, "venueId", url, caption, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public."VerificationToken" (identifier, token, expires) FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: jafo38583
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
854afffa-c099-40c3-a228-88ba3bd98c0f	a8e3a0177d780d317a8f56f4ae782a0d2b5059b4f449dfc5619dc8a5de163ec8	2025-05-17 16:09:58.375896+00	20250510022657_init	\N	\N	2025-05-17 16:09:58.29626+00	1
20ed1af0-4cbb-43ae-8077-5f715bf735e7	6e46e7e28682a16cb97be35b67a33e9683cf3d67571eb865581587c4f37aef3a	2025-05-17 16:09:58.38894+00	20250511205923_add_user_bio	\N	\N	2025-05-17 16:09:58.379078+00	1
9a701af3-2806-4864-a3ad-f92b3b2b5771	27a91d5ebc4b6b5aa455fd8300712389974f85389222af87b9058896a0a1d761	2025-05-17 16:22:46.74555+00	20250517162246_fix_convention_fields	\N	\N	2025-05-17 16:22:46.697732+00	1
ae4af86e-2624-46ba-b435-65d1cfc6c84b	e51852d3d1e70b5751ee9aa7497c316e2826a66164cc869e5cfc26b5f1fc8654	2025-05-17 16:09:58.420003+00	20250511224224_add_role_application	\N	\N	2025-05-17 16:09:58.392148+00	1
060e3516-bd6d-467e-8c77-c8fdd2bf27ed	50b419fc59308cd75172aeebf31d614af3f80e9c11df7fc3f36dc0b4139542e0	2025-05-17 16:09:58.450617+00	20250512033050_add_convention_model_and_status	\N	\N	2025-05-17 16:09:58.423405+00	1
de0d707c-6a37-43d4-ad9b-a629660743a2	d34329cb7f8b26e99e72c6e4ca7cb17cbb59dee620b22a1781c3c73cdfc76bc1	2025-05-21 01:41:21.084376+00	20250521014120_add_event_type_to_schedule_itme	\N	\N	2025-05-21 01:41:21.075253+00	1
1eccc6b0-603e-4ac6-8f31-860d7aa2ada0	6ec5dd88ee2038b45435dc04cae0827bf2ff27ee056399576f50948d9aa8b077	2025-05-17 16:09:58.463678+00	20250512225703_add_convention_type	\N	\N	2025-05-17 16:09:58.453675+00	1
e06a596a-bc09-4330-b10d-3c967517ba31	8e5b5a388cd359cebc15681f52415292b845e561529925b25f833f24c465485e	2025-05-17 18:27:37.677536+00	20250517182737_	\N	\N	2025-05-17 18:27:37.667985+00	1
6b7700b6-67ad-4122-ac23-67e410e35c3c	08fd2f40167bfecb63baf271b5df3a6f95dd65bc403d37d213558db3d65db878	2025-05-17 16:09:58.476225+00	20250513144144_state_update	\N	\N	2025-05-17 16:09:58.466655+00	1
b2c83d18-1387-4f52-b1c7-8bbe423ed65c	8c2b19097cb96f65be63f473ce53743f90f9a8e9e0038d5f66dc7b52acac8cce	2025-05-17 16:09:58.519868+00	20250513184105_add_convention_series	\N	\N	2025-05-17 16:09:58.47911+00	1
ce548d2f-1895-4a13-8795-836529458603	eb3b2507f380786b0bc32634241862eb7f7c8f8cd9e81c765cbebceb9ef1f55e	2025-05-17 16:09:58.534449+00	20250513184614_add_convention_series	\N	\N	2025-05-17 16:09:58.523257+00	1
c3d08404-bd3e-405e-8063-9fac91c77ea2	51f626e53655353e7bba659ad807204870b22375c13d481ab411eebd6a5afeab	2025-05-17 18:29:45.368134+00	20250517182943_rename_convention_timezone_field	\N	\N	2025-05-17 18:29:45.358133+00	1
d799b46c-e74d-4249-8e8a-89c6b2e83027	bc1d0ad152ff6025438180aa53105ffa1358706260557e7d1001bf0cd266b334	2025-05-17 16:09:58.5526+00	20250513220303_add_slug_and_logo	\N	\N	2025-05-17 16:09:58.537437+00	1
2be2d1da-6326-4239-a54d-36df62f147b3	69632734a9f19ef0e0d9f2b7ed8587d72b7b6b4a2640e54b59ff1df54be7c7ff	2025-05-17 16:09:58.58491+00	20250514201258_replace_active_upcoming_with_published	\N	\N	2025-05-17 16:09:58.555959+00	1
3fc0fba2-917e-449e-93d3-e1b9baf953d7	707c9e4bf90e9e3ef9d54007a374b27e6b4d85d66032ac8dcb61b8b79fc63355	2025-05-17 16:09:58.604168+00	20250514204525_add_reset_token_fields	\N	\N	2025-05-17 16:09:58.588652+00	1
48ee27e9-ff99-4c17-a1a4-d870ed2599f5	c476d4eef7c886cfc053af3890ae18ab9f797a0d2d9db180afbb2b727d8cc30a	2025-05-18 02:56:26.956638+00	20250518025626_add_venue_hotel_models	\N	\N	2025-05-18 02:56:26.899797+00	1
293684f3-68dd-4112-9df0-adeea4f2011d	003854455811a8f13b5ffd2ce02dd22588f0ebe26cae04c50adbd5969598f426	2025-05-17 16:09:58.617262+00	20250514210420_fix_convention_series_relationships	\N	\N	2025-05-17 16:09:58.607542+00	1
d7b10f1e-d0b1-4915-90f6-cef655bd16bc	61cdb39cf6442b9277e9c2f0b9637e307a4c9f3921b47c90b2a5f8879fc63e1e	2025-05-17 16:09:58.630011+00	20250514230919_add_soft_delete_to_conventions	\N	\N	2025-05-17 16:09:58.620455+00	1
efc4a85e-7a5f-4341-bd63-4ca6d03ec418	8629b4123e86fd3d426f104e262e4cfb60cd2c3e760da7b75e7b71ac91de8b26	2025-05-21 01:44:00.698019+00	20250521014400_add_at_primary_venue_to_schedule_item	\N	\N	2025-05-21 01:44:00.68907+00	1
278d0701-b556-4406-900d-b188a5733bc3	87911bee5c3a67c0ab92509ddbaf6b14e8819e8060090913c84db90e6206d373	2025-05-18 19:04:24.67967+00	20250518190424_add_guests_stay_at_primary_venue_to_convention	\N	\N	2025-05-18 19:04:24.669408+00	1
1526e6b7-eebf-4a0f-8f86-79bad047356d	762499d4321cb33a883e7e429c9c801dd32c4ce9c5fcc147390b5bde65f5eae5	2025-05-19 15:04:51.664605+00	20250519150451_add_guest_stay_at_primary_venue_to_convention	\N	\N	2025-05-19 15:04:51.647405+00	1
d56692bb-8757-4b63-be6a-5d8c04a75aea	a35d9974caf4f1b9b0a410a58fdf299501ec8579ec762e9f1e5c0a2c89771547	2025-05-20 15:01:07.602948+00	20250520150106_add_schedule_modles	\N	\N	2025-05-20 15:01:07.542791+00	1
16eb15ea-01ec-4fd0-8a63-cb3221fba57e	e1b4625f48de5d188f6b4ec343d526da54f44c3e9343e576829d965278de3198	2025-05-21 15:05:46.428678+00	20250521150545_remove_absolute_event_times	\N	\N	2025-05-21 15:05:46.417109+00	1
0266dec5-acf8-4f19-a22f-cfe41c6fe454	38e5a9b94a224fb62f684b8bb7dbd3c0988d2674e497aa77f9c390296befb0d8	2025-05-21 01:37:58.809946+00	20250521013755_make_schedule_times_optional	\N	\N	2025-05-21 01:37:58.800242+00	1
a0bfbdb4-7941-4ba1-8645-51e38d560904	65ca1165a04b1b5ba54bd679410bfd155831efbe9653284f9a89dd4cf8a2c614	2025-05-21 15:20:56.934977+00	20250521152056_add_schedule_day_table	\N	\N	2025-05-21 15:20:56.91074+00	1
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: ConventionScheduleItem ConventionScheduleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ConventionScheduleItem"
    ADD CONSTRAINT "ConventionScheduleItem_pkey" PRIMARY KEY (id);


--
-- Name: ConventionSeries ConventionSeries_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ConventionSeries"
    ADD CONSTRAINT "ConventionSeries_pkey" PRIMARY KEY (id);


--
-- Name: Convention Convention_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Convention"
    ADD CONSTRAINT "Convention_pkey" PRIMARY KEY (id);


--
-- Name: HotelPhoto HotelPhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."HotelPhoto"
    ADD CONSTRAINT "HotelPhoto_pkey" PRIMARY KEY (id);


--
-- Name: Hotel Hotel_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Hotel"
    ADD CONSTRAINT "Hotel_pkey" PRIMARY KEY (id);


--
-- Name: PriceDiscount PriceDiscount_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."PriceDiscount"
    ADD CONSTRAINT "PriceDiscount_pkey" PRIMARY KEY (id);


--
-- Name: PriceTier PriceTier_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."PriceTier"
    ADD CONSTRAINT "PriceTier_pkey" PRIMARY KEY (id);


--
-- Name: RoleApplication RoleApplication_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."RoleApplication"
    ADD CONSTRAINT "RoleApplication_pkey" PRIMARY KEY (id);


--
-- Name: ScheduleDay ScheduleDay_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ScheduleDay"
    ADD CONSTRAINT "ScheduleDay_pkey" PRIMARY KEY (id);


--
-- Name: ScheduleEventBrandLink ScheduleEventBrandLink_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ScheduleEventBrandLink"
    ADD CONSTRAINT "ScheduleEventBrandLink_pkey" PRIMARY KEY (id);


--
-- Name: ScheduleEventFeeTier ScheduleEventFeeTier_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ScheduleEventFeeTier"
    ADD CONSTRAINT "ScheduleEventFeeTier_pkey" PRIMARY KEY (id);


--
-- Name: ScheduleEventTalentLink ScheduleEventTalentLink_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ScheduleEventTalentLink"
    ADD CONSTRAINT "ScheduleEventTalentLink_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VenuePhoto VenuePhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."VenuePhoto"
    ADD CONSTRAINT "VenuePhoto_pkey" PRIMARY KEY (id);


--
-- Name: Venue Venue_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Venue"
    ADD CONSTRAINT "Venue_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: ConventionSeries_slug_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "ConventionSeries_slug_key" ON public."ConventionSeries" USING btree (slug);


--
-- Name: Convention_slug_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "Convention_slug_key" ON public."Convention" USING btree (slug);


--
-- Name: PriceDiscount_conventionId_priceTierId_cutoffDate_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "PriceDiscount_conventionId_priceTierId_cutoffDate_key" ON public."PriceDiscount" USING btree ("conventionId", "priceTierId", "cutoffDate");


--
-- Name: RoleApplication_userId_requestedRole_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "RoleApplication_userId_requestedRole_key" ON public."RoleApplication" USING btree ("userId", "requestedRole");


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_resetToken_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "User_resetToken_key" ON public."User" USING btree ("resetToken");


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: jafo38583
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConventionScheduleItem ConventionScheduleItem_conventionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ConventionScheduleItem"
    ADD CONSTRAINT "ConventionScheduleItem_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES public."Convention"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConventionScheduleItem ConventionScheduleItem_scheduleDayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ConventionScheduleItem"
    ADD CONSTRAINT "ConventionScheduleItem_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES public."ScheduleDay"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConventionScheduleItem ConventionScheduleItem_venueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ConventionScheduleItem"
    ADD CONSTRAINT "ConventionScheduleItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConventionSeries ConventionSeries_organizerUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ConventionSeries"
    ADD CONSTRAINT "ConventionSeries_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Convention Convention_seriesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Convention"
    ADD CONSTRAINT "Convention_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES public."ConventionSeries"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HotelPhoto HotelPhoto_hotelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."HotelPhoto"
    ADD CONSTRAINT "HotelPhoto_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES public."Hotel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Hotel Hotel_conventionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Hotel"
    ADD CONSTRAINT "Hotel_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES public."Convention"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PriceDiscount PriceDiscount_conventionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."PriceDiscount"
    ADD CONSTRAINT "PriceDiscount_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES public."Convention"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PriceDiscount PriceDiscount_priceTierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."PriceDiscount"
    ADD CONSTRAINT "PriceDiscount_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES public."PriceTier"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PriceTier PriceTier_conventionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."PriceTier"
    ADD CONSTRAINT "PriceTier_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES public."Convention"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleApplication RoleApplication_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."RoleApplication"
    ADD CONSTRAINT "RoleApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ScheduleDay ScheduleDay_conventionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ScheduleDay"
    ADD CONSTRAINT "ScheduleDay_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES public."Convention"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ScheduleEventBrandLink ScheduleEventBrandLink_scheduleItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ScheduleEventBrandLink"
    ADD CONSTRAINT "ScheduleEventBrandLink_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES public."ConventionScheduleItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ScheduleEventFeeTier ScheduleEventFeeTier_scheduleItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ScheduleEventFeeTier"
    ADD CONSTRAINT "ScheduleEventFeeTier_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES public."ConventionScheduleItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ScheduleEventTalentLink ScheduleEventTalentLink_scheduleItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."ScheduleEventTalentLink"
    ADD CONSTRAINT "ScheduleEventTalentLink_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES public."ConventionScheduleItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VenuePhoto VenuePhoto_venueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."VenuePhoto"
    ADD CONSTRAINT "VenuePhoto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Venue Venue_conventionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jafo38583
--

ALTER TABLE ONLY public."Venue"
    ADD CONSTRAINT "Venue_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES public."Convention"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: jafo38583
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

