## Developer Briefing: Implementing a Robust Timezone System for ConventionCrasher

**Project Goal:** To implement a cohesive, unifying, and user-friendly timezone system for ConventionCrasher, ensuring accurate display of dates and times for global conventions and users. This enhancement primarily addresses potential confusion arising from differing timezones, such as price reduction cutoff dates appearing incorrectly.

**Why This is Important:**

  * **Accuracy:** Eliminate discrepancies in date/time displays (e.g., price cutoff dates) caused by timezone differences.
  * **User Experience:** Provide a clear and intuitive way for organizers to select convention timezones and for all users to understand event timings relative to their own location.
  * **Consistency:** Establish a single source of truth for timezone data and handling logic across the application.

### I. Core Architectural Strategy

1.  **Store All Dates & Times in UTC (Universal Coordinated Time):**

      * **Rule:** Every date and time stored in the PostgreSQL database (e.g., `startDate`, `endDate`, `cutoffDate`, `createdAt`, `updatedAt`, `expires`, schedule event times) MUST be stored as UTC. This is the global standard, free from daylight saving time complexities or regional shifts, ensuring a single, unambiguous point in time.
      * **Impact:** All data input (from forms, external sources) representing a specific point in time *must be converted to UTC before storage*. All data retrieval will yield UTC timestamps.

2.  **Utilize IANA Timezone Identifiers for Specificity:**

      * **Rule:** For entities that represent a specific geographical timezone (e.g., Conventions, User's preferred timezone), store the canonical IANA Timezone Identifier (e.g., `"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`).
      * **Rationale:** IANA IDs inherently encapsulate all historical and future daylight saving rules and offsets for a given region, allowing for accurate conversion to local times.
      * **Source Data:** The comprehensive list of timezones, including their IANA IDs (under the `utc` field), is available in this JSON file: docs\timezones.json

### II. Database Implementation (`schema.prisma` & Data Seeding)

1.  **New `Timezone` Lookup Table:**

      * **Goal:** Create a static lookup table to store the canonical timezone data. This table will be read-only after initial population.
      * **Proposed Prisma Model:**
        ```prisma
        // prisma/schema.prisma
        model Timezone {
          id               String    @id @default(cuid()) // Primary key
          ianaId           String    @unique // e.g., "America/New_York", "Europe/London" - crucial for conversions
          value            String?   // e.g., "Mountain Standard Time (Mexico)" - for display
          abbr             String?   // e.g., "MDT" - for display abbreviation
          offset           Int?      // Offset in hours (e.g., -6) - for display/filtering, not calculations
          isdst            Boolean?  // Indicates if currently observing DST - for display/filtering
          text             String?   // e.g., "(UTC-07:00) Chihuahua, La Paz, Mazatlan" - for display
          utcAliases       String[]  // All IANA IDs associated with this entry (e.g., ["America/Chihuahua", "America/Mazatlan"])
          
          // Relationships to models that will reference this timezone
          users            User[]
          conventions      Convention[]
          conventionSettings ConventionSetting[] // If settings can reference this
        }
        ```
      * **Seed Data:** Implement a `prisma/seed.ts` script to parse the `timezones.json` file (linked above) and populate this `Timezone` table. The `utc` array in the JSON should be mapped to the `ianaId` (for the primary entry) and `utcAliases` fields.

2.  **Update Existing Models to Reference `Timezone` Table:**

      * **Goal:** Replace existing string-based `timezone` fields with a foreign key relationship to the new `Timezone` table.
      * **Proposed Changes:**
        ```prisma
        // prisma/schema.prisma
        model User {
          // ... existing fields ...
          timezoneId       String?   // Foreign key to Timezone.id, allowing users to set a preferred display timezone
          timezone         Timezone? @relation(fields: [timezoneId], references: [id])
          // ... rest of User model ...
        }

        model Convention {
          // ... existing fields ...
          // Replace the current 'timezone: String?' field
          timezoneId       String?   // Foreign key to Timezone.id, for the convention's local timezone
          timezone         Timezone? @relation(fields: [timezoneId], references: [id])
          // ... rest of Convention model ...
        }

        // For ConventionSetting, if key='timezone', its value would now be a Timezone.id
        // No schema change needed here if 'value' is already String, but application logic changes.
        ```
      * **Migration:** A Prisma migration will be required to introduce the `Timezone` table and modify the `User` and `Convention` schemas. Consider a data migration script to populate `timezoneId` for existing records if an equivalent IANA ID can be inferred from current `timezone` string values.

### III. Frontend Implementation (User Selection & Display)

1.  **User-Friendly Timezone Selector (Convention Editor & User Settings):**

      * **Goal:** Create a highly usable selector for Organizers to choose a convention's timezone and for Users to set their preferred display timezone.
      * **Key Design Principles (from NN/g research):**
          * **Auto-Detection/Pre-selection:** On load, attempt to detect and pre-select the user's local timezone (or the convention's current timezone if editing) in the selector.
          * **Search Functionality (within dropdown):** Implement a search field directly within the selector dropdown. This should be easily discoverable when the dropdown is active.
          * **Search Criteria:** Allow users to search by:
              * **City** (most common search term).
              * **Country/State**.
              * **Common timezone names** (e.g., "Eastern Time", "Pacific Time").
          * **Display Format in Selector:** Options in the dropdown should be displayed clearly, primarily sorted alphabetically by **City**, including the **Country** (and State if relevant) and the **current offset/abbreviation**. Example: `"Adelaide, Australia (UTC+09:30)"` or `"New York (Eastern Time) (UTC-04:00)"`.
          * **Avoid Offset-Only Ordering:** Do not sort the primary list solely by UTC offset.
          * **Consider Grouping:** If grouping (e.g., by continent) is implemented, ensure common regions for your audience appear at the top.
      * **Implementation Note:** This selector will query the new `Timezone Lookup API` (see below) to fetch the timezone data for filtering and display.

2.  **Dynamic Date & Time Display Logic:**

      * **Goal:** Consistently display all UTC-stored dates and times in the appropriate local timezone, with clear indicators.
      * **Client-Side Library:** Utilize a robust JavaScript date/time library with full timezone support (e.g., `date-fns-tz` with IANA timezone data, or `Moment.js` with `moment-timezone`).
      * **Display Scenarios:**
          * **Convention Dates & Schedule (Primary):**
              * Retrieve the UTC `startDate`, `endDate`, `PriceDiscount.cutoffDate`, and `ConventionScheduleItem` times.
              * Retrieve the associated `Convention.timezone.ianaId`.
              * **Always convert and display these relative to the *convention's local timezone***.
              * **Always include the timezone abbreviation** in the display (e.g., "July 9th, 5:00 PM EDT"). This clearly indicates the context.
              * For pricing cutoff dates, this ensures the correct "local" cutoff is shown in the event's context.
          * **User-Specific Timestamps:**
              * For timestamps like `User.createdAt`, `User.updatedAt`, forum post times, or comment times.
              * Convert the UTC timestamp to the `User.timezone.ianaId` (if set by the user) or the browser's detected local timezone.
              * Display with the relevant timezone abbreviation.

### IV. Backend API & Service Layer (`src/app/api/`, `src/lib/services/`)

1.  **Timezone Lookup API (New):**

      * **Goal:** Provide the timezone data to the frontend selector.
      * **Endpoint:** e.g., `GET /api/timezones` (perhaps `GET /api/timezones?search=query`).
      * **Functionality:** Query the new `Timezone` database table, allow filtering/searching based on `value`, `abbr`, `text`, and `ianaId`, and return the relevant timezone data for frontend display.

2.  **Date/Time Handling within Existing APIs:**

      * **Goal:** Ensure all existing API routes (`/api/conventions`, `/api/users`, etc.) correctly handle date/time conversions on input and output.
      * **Input Conversion:** When receiving date/time data from the frontend (which might be in a local timezone), ensure it is parsed and converted to **UTC before being stored** in the database. This might involve inferring the original timezone from the user's settings or the convention's specified timezone.
      * **Output Consistency:** While primary storage is UTC, backend services might occasionally need to perform conversions for internal logic (e.g., sorting by local time, applying timezone-specific rules). The **Timezone Service/Utility** (see below) will be used for this.

3.  **Timezone Service / Utility (New `src/lib/services/timezoneService.ts` or `src/lib/utils/timezoneUtils.ts`):**

      * **Goal:** Centralize all timezone conversion logic to ensure consistency.
      * **Functions:**
          * `convertToUTC(localDateTime, ianaId)`: Converts a local date/time (and its associated IANA ID) to a UTC `Date` object for storage.
          * `convertFromUTC(utcDateTime, ianaId)`: Converts a UTC `Date` object to a `Date` object representing the specified `ianaId`'s local time.
          * `getOffset(ianaId, date)`: Returns the UTC offset for a given IANA ID at a specific date/time (handles DST).
          * `getAbbreviation(ianaId, date)`: Returns the timezone abbreviation (e.g., "EDT", "PST") for a given IANA ID at a specific date/time.
          * `getTimezoneData(searchQuery)`: Interfaces with the `Timezone` database table (via Prisma) to retrieve timezone lookup data.

### V. Impact on Existing Modules & Testing Considerations

  * **Convention Management Editor:** Significant changes will be needed to how date/time input fields operate, how data is sent to APIs, and how it's validated for timezone consistency.
  * **Convention Display Pages:** All date/time displays will need to use the new conversion logic.
  * **User Profile:** The timezone setting field will use the new selector and store the IANA ID.
  * **Testing:**
      * **Unit Tests:** For the new `TimezoneService` and any date/time conversion utilities.
      * **Integration Tests:** To verify correct UTC storage via APIs and accurate retrieval/conversion.
      * **End-to-End (E2E) Tests:** Crucially, implement E2E tests for key user journeys involving dates and times (e.g., "Organizer creates convention with schedule and discounts in specific timezone, User from different timezone views it and sees correct local times"). Pay special attention to daylight saving transitions if feasible within E2E tests.
