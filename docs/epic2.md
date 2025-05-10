# Epic 2: Convention Listing & Discovery

**Goal:** Enable Organizers (Users with the `ORGANIZER` role) to perform full Create, Read, Update, and Delete (CRUD) operations for convention listings using Prisma for database interactions and Next.js API Routes/Server Actions. Concurrently, provide all users (including anonymous visitors) with robust search, filtering (via Prisma queries), and detailed viewing capabilities to discover these conventions. This epic is central to the platform's value proposition of solving information fragmentation and will also implement initial features supporting the "Local-First" marketing angle (e.g., efficient filtering by location).

## Story List

### Story 2.1: Convention Data Model & Basic CRUD API Endpoints
- **User Story / Goal:** Technical Story - To ensure the `Convention` data model in Prisma (as defined in `docs/data-models.md`) is complete, including all necessary attributes (name, dates, location, description, organizer, series link, status, image URLs), and implement basic API endpoints (Next.js API Routes at `/api/conventions`) for CRUD operations, initially accessible only by users with the `ADMIN` role for testing and setup.
- **Detailed Requirements:**
  - Verify the `Convention` model in `prisma/schema.prisma` aligns with `docs/data-models.md`. Key fields: `name`, `startDate`, `endDate`, `city`, `state`, `country`, `venueName`, `description` (`@db.Text`), `websiteUrl`, `organizerUserId` (linking to `User`), `conventionSeriesId` (optional link to `ConventionSeries`), `status` (using a `ConventionStatus` enum: e.g., `DRAFT`, `UPCOMING`, `ACTIVE`, `PAST`, `CANCELLED`).
  - Include fields for image URLs (e.g., `bannerImageUrl`, `galleryImageUrls: String[]`) which will store paths to files in object storage (or local FS for development). Actual file upload mechanics are part of Technical Story TS3 but URLs are stored here.
  - Implement basic, protected Next.js API Routes (e.g., under `/api/conventions`) for:
    - `POST /api/conventions` (Create)
    - `GET /api/conventions` (List all - with pagination, filtering, sorting capabilities for Story 2.4)
    * `GET /api/conventions/{id}` (Get one by ID or slug)
    - `PUT /api/conventions/{id}` (Update by ID or slug)
    - `DELETE /api/conventions/{id}` (Delete by ID or slug)
  - Initial protection: Only users whose `session.user.roles` array (from Auth.js) includes `ADMIN` can access these API endpoints. Organizer access for specific actions will be refined in subsequent stories.
  - All data interactions must use Prisma Client.
- **Acceptance Criteria (ACs):**
  - AC1: The Prisma schema for the `Convention` model, including its relations (to `User` as organizer, optional `ConventionSeries`) and a `ConventionStatus` enum, is finalized and migrations apply successfully.
  - AC2: An `ADMIN` user (verified by Auth.js session and `User.roles`) can successfully create a new convention listing via the `POST /api/conventions` API endpoint, with data persisted via Prisma.
  - AC3: An `ADMIN` user can retrieve a list of all conventions (paginated) and a single convention by its ID (or slug) via the respective `GET` API endpoints, with data fetched via Prisma.
  - AC4: An `ADMIN` user can update an existing convention listing via the `PUT /api/conventions/{id}` API endpoint, with changes persisted via Prisma.
  - AC5: An `ADMIN` user can delete a convention listing via the `DELETE /api/conventions/{id}` API endpoint, with the record removed/marked by Prisma.

---

### Story 2.2: Organizer - Create Convention Listing Form & Submission
- **User Story / Goal:** As an Organizer (a user with the `ORGANIZER` role), I want a comprehensive form (built with React and Material UI) to create a new convention listing with all relevant details, so that I can accurately present my event to the community.
- **Detailed Requirements:**
  - Create a UI form accessible only to users whose Auth.js `session.user.roles` array includes `ORGANIZER`.
  - Form fields should cover all relevant attributes defined in the `Convention` data model (name, dates, location details, description, website, banner image URL, status, optional association with a `ConventionSeries` they manage).
  - Implement client-side validation (e.g., using React Hook Form with Zod schemas from `src/lib/validators.ts`) and server-side validation (Zod schemas in the API Route or Server Action).
  - On submission, the form data should call the `POST /api/conventions` endpoint (or a dedicated Server Action).
  - The `organizerUserId` should be automatically set to the ID of the logged-in Organizer (`session.user.id`).
  - If the user selects a `ConventionSeries` they manage, the `conventionSeriesId` should be linked.
  - Image uploads (e.g., for `bannerImageUrl`) should follow the strategy in TS3 (e.g., client gets presigned URL, uploads to object storage, server saves the final URL).
  - Provide clear feedback on successful creation or errors.
- **Acceptance Criteria (ACs):**
  - AC1: A user with the `ORGANIZER` role (verified by Auth.js session) can access the "Create Convention" form. A user without this role cannot.
  - AC2: The form includes input fields for all necessary convention details as per the `Convention` model.
  - AC3: Organizers receive clear, field-specific error messages for invalid or missing required fields, based on Zod validation.
  - AC4: On successful submission, a new `Convention` record is created in the database via Prisma, correctly associated with the `organizerUserId` and, if applicable, `conventionSeriesId`. Image URLs are correctly saved.
  - AC5: Organizer is redirected to the newly created convention's detail page or a success message is displayed.

---

### Story 2.3: Public - View Convention Listing Details
- **User Story / Goal:** As any user (anonymous or logged-in), I want to view the detailed information for a specific convention on a public-facing page, so that I can learn everything about it.
- **Detailed Requirements:**
  - Create a public-facing page using Next.js dynamic routing (e.g., `/conventions/[slug]` or `/conventions/[id]`). Ensure `Convention` model has a unique `slug` field, generated from the name if using slug-based routing.
  - Display all relevant information from the `Convention` model: name, dates, location, description, organizer's display name (from related `User` model), website link, banner image, status.
  - If the convention is part of a `ConventionSeries`, display the series name and link to a series detail page (if such a page exists).
  - Page should be shareable via its URL and designed for clear, readable presentation (Material UI components).
  - Data fetched via Prisma, potentially using Server Components for SEO benefits.
- **Acceptance Criteria (ACs):**
  - AC1: Any user can navigate to a convention detail page using a direct link or from a list.
  - AC2: All stored, public details for the `Convention` (name, date, location, description, banner image URL, status, etc.) are displayed clearly.
  - AC3: If an organizer is associated, their `User.name` is displayed. If linked to a `ConventionSeries`, its `name` is displayed (and potentially linked).
  - AC4: The page gracefully handles cases where a convention ID/slug is not found (e.g., shows a "404 Not Found" page).

---

### Story 2.4: Public - List Conventions & Basic Filtering/Sorting
- **User Story / Goal:** As any user, I want to see a list of all `UPCOMING` or `ACTIVE` conventions, with basic filtering (e.g., by date range, location - state/country, keywords) and sorting options, so that I can discover relevant events.
- **Detailed Requirements:**
  - Create a public-facing page (e.g., `/conventions`) that lists conventions, fetched from `GET /api/conventions` or directly via server-side data fetching with Prisma.
  - By default, show `UPCOMING` and `ACTIVE` conventions, paginated server-side (Prisma `skip`/`take`).
  * Filters (MVP - implemented via API query parameters and Prisma `where` clauses):
    - Date range (start/end).
    - Keywords in `name`/`description` (Prisma `contains` or full-text search if configured).
    - `state`, `country`.
    - Optionally, `ConventionSeries.name` or ID.
  * Sorting options (MVP - implemented via API query parameters and Prisma `orderBy`):
    - `startDate` (ascending/descending).
    - `name` (alphabetical).
  - Each item in the list should show key summary information (name, date, location snippet, banner image thumbnail) and link to the full detail page (Story 2.3).
  - "Local-First" aspect: Ensure filtering by `state` and `country` is efficient and prominently available.
- **Acceptance Criteria (ACs):**
  - AC1: Any user can navigate to the convention list page.
  - AC2: A list of conventions (defaulting to upcoming/active) is displayed with summary information and links to detail pages.
  - AC3: User can filter conventions by date range, and results are updated correctly using Prisma queries.
  - AC4: User can sort conventions by start date and name, and the order updates correctly using Prisma queries.
  - AC5: User can filter conventions by `state` and/or `country`, and it functions correctly using Prisma queries.
  - AC6: Server-side pagination is implemented correctly for long lists of conventions.

---

### Story 2.5: Organizer - Edit & Update Own Convention Listing
- **User Story / Goal:** As an Organizer, I want to edit and update the details of convention listings that I own or manage, so that I can keep the information accurate and current.
- **Detailed Requirements:**
  - On the convention detail page (for Organizers viewing their own/managed events) or a dedicated Organizer dashboard, provide an "Edit" option.
  - Authorization: Access to the edit form/functionality is restricted. The logged-in user must have the `ORGANIZER` role AND either be the `Convention.organizerUserId` OR be a `MANAGER` or `PRIMARY_OWNER` of the `ConventionSeries` to which the `Convention` belongs (if applicable). Admins can also edit. This check must be performed server-side.
  - The "Edit" option leads to a form pre-filled with the existing convention data.
  - On submission, the form data (validated by Zod client and server-side) should call the `PUT /api/conventions/{id}` endpoint or a Server Action.
  - Provide clear feedback on successful update or errors.
- **Acceptance Criteria (ACs):**
  - AC1: An Organizer meeting the authorization criteria can find and access an "Edit" function for conventions they manage.
  - AC2: The edit form is pre-populated with the convention's current details.
  - AC3: Organizer can successfully submit changes (validated by Zod), and the `Convention` record is updated in the database via Prisma.
  - AC4: Updated information is reflected on the convention detail page.
  - AC5: An Organizer who does not meet the authorization criteria for a specific convention cannot access its edit function or successfully submit updates.

---

### Story 2.6: Organizer - Delete Own Convention Listing
- **User Story / Goal:** As an Organizer, I want to delete convention listings that I own or manage, so that I can remove events that are cancelled or no longer relevant.
- **Detailed Requirements:**
  - Provide a "Delete" option for Organizers on conventions they manage (on detail page or dashboard).
  - Implement a confirmation step in the UI before actual deletion.
  - Authorization: Same criteria as Story 2.5 (must be `ORGANIZER` and own/manage the convention/series, or be an `ADMIN`). Server-side check is critical.
  - On confirmation, call the `DELETE /api/conventions/{id}` endpoint or a Server Action, which uses Prisma to delete the record.
  - Provide clear feedback on successful deletion or errors.
- **Acceptance Criteria (ACs):**
  - AC1: An Organizer meeting the authorization criteria can find a "Delete" function for conventions they manage.
  - AC2: A confirmation prompt is displayed before deletion.
  - AC3: Upon confirmation by an authorized user, the `Convention` record is removed from the database (or marked as deleted, e.g., by changing `status` to `CANCELLED` and soft-deleting if preferred, though hard delete is simpler for MVP unless specified otherwise).
  - AC4: The deleted convention no longer appears in public listings or active search results (unless policy is to show cancelled events).
  - AC5: An Organizer who does not meet the authorization criteria cannot delete the convention.

---

### Story 2.7: Admin - Manage All Convention Listings (View, Edit, Delete)
- **User Story / Goal:** As an Admin, I want to be able to view, edit, and delete any convention listing on the platform, so that I can perform moderation and correct information if necessary.
- **Detailed Requirements:**
  - In the Admin Dashboard (`/admin/*`), provide an interface to list all conventions (regardless of status or organizer).
  - From this list, an Admin (user with `ADMIN` in `User.roles`, verified by Auth.js session) should be able to access edit and delete functionalities for any convention.
  - Admin edit form should be similar to the Organizer's edit form.
  - Admin delete should also have a confirmation step.
  - API endpoints used by these admin functions will bypass ownership checks if the request is from an authenticated Admin.
- **Acceptance Criteria (ACs):**
  - AC1: An Admin can view a list of all convention listings in the Admin Dashboard, with data fetched via Prisma.
  - AC2: An Admin can access an edit form for any convention and successfully update its details via API/Server Action and Prisma.
  - AC3: An Admin can delete any convention listing (with confirmation) via API/Server Action and Prisma.
  - AC4: Changes (edits, deletions) made by Admin are reflected publicly as appropriate.

## Change Log

| Change        | Date       | Version | Description                                                                      | Author          |
| ------------- | ---------- | ------- | -------------------------------------------------------------------------------- | --------------- |
| Initial Draft | 2025-05-09 | 0.1     | First draft of Epic 2 stories                                                      | Product Manager AI |
| Revision      | 2025-05-09 | 0.2     | Integrated architectural decisions (Prisma, Next.js API Routes/Server Actions, Zod, Auth.js, role checks, ConventionSeries link), refined technical details in requirements and ACs. | Architect Agent |