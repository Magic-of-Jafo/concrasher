# Epic 4: Talent & Brand Profiles

**Goal:** To enable users with the self-activated ` ` role to create and manage rich `TalentProfile` records showcasing their skills and convention history. Similarly, to allow logged-in users to create and manage `BrandProfile` records (with role-based management via `BrandUser` for primary owners and managers) for entities like magic shops or manufacturers. Both Talent and Brand profiles should be publicly viewable, searchable (via Prisma queries), and linkable to relevant `Convention` listings (via `ConventionTalent` and `ConventionBrand` join tables), thereby increasing visibility and discoverability. Image uploads will follow the defined object storage strategy (TS3).

## Story List

### Story 4.1: Talent Profile - Data Model & Basic CRUD API
- **User Story / Goal:** Technical Story - To ensure the `TalentProfile` data model in Prisma (as defined in `docs/data-models.md`) is correctly implemented, including fields for skills, biography, past conventions link, contact information, and profile picture URL. Implement basic API endpoints (or Server Actions) for CRUD operations on these profiles.
- **Detailed Requirements:**
  - Verify the `TalentProfile` model in `prisma/schema.prisma`. Key fields: `userId` (unique FK to `User`, establishing 1:1), `displayName`, `tagline`, `bio` (`@db.Text`), `profilePictureUrl`, `websiteUrl`, `contactEmail`, `skills` (`String[]`).
  - API endpoints (e.g., under `/api/talent-profiles`) or Server Actions for:
    - `POST /api/talent-profiles` (Create): Callable if the authenticated user's `User.roles` array includes `TALENT` and no `TalentProfile` already exists for their `userId`.
    * `GET /api/talent-profiles/{userId}` (Get one by `userId`).
    * `PUT /api/talent-profiles/{userId}` (Update): Callable if `session.user.id === TalentProfile.userId` (owner) or `session.user.roles` includes `ADMIN`.
    * `GET /api/talent-profiles` (List all - public, paginated, for discovery).
  - All data interactions must use Prisma Client.
- **Acceptance Criteria (ACs):**
  - AC1: The Prisma schema for `TalentProfile` (and its relation to `User` and the `ConventionTalent` join table) is correctly defined as per `docs/data-models.md`, and migrations apply.
  - AC2: A user whose `User.roles` includes `TALENT` can successfully create their `TalentProfile` (linked to their `User.id`) via an API Route or Server Action, with data persisted by Prisma. Only one profile per user is allowed (enforced by `TalentProfile.userId @unique`).
  - AC3: The owner of a `TalentProfile` (where `TalentProfile.userId === session.user.id`) or an `ADMIN` user can update it via an API Route or Server Action, with changes persisted by Prisma.
  - AC4: `TalentProfile` data (single by `userId` and list for public view) can be retrieved via API, with data fetched by Prisma.
  - AC5: An attempt to create a `TalentProfile` by a user without the `TALENT` role, or an attempt to create a second profile by a user who already has one, is rejected.

---

### Story 4.1.5: Note on Deferred Story 2.10 (Talent Tab in Convention Editor)
- **Note:** Story 2.10 ("Implement Tabbed Convention Editor - Talent Tab") from Epic 2 was deferred because its core functionality (searching for and linking existing Talent profiles to a convention) depends on the completion of Story 4.1 (Talent Profile Data Model & API) and Story 4.2 (Talent Profile Creation UI).
- The full definition for the deferred Story 2.10 can be found in `ai/stories/2.10.story.md`.
- This placeholder (4.1.5) serves as a reminder that the functionality of linking talent within the convention editor (originally Story 2.10) should be re-evaluated and potentially integrated or re-prioritized after Talent Profiles are established (i.e., after Story 4.2 is complete). Story 4.7 also covers linking Talent/Brands to convention listings and may supersede or incorporate the original intent of Story 2.10.

---

### Story 4.2: Talent - Create & Edit Own Talent Profile UI
- **User Story / Goal:** As a Talent (user with `TALENT` role), I want a form (React with Material UI) to create and edit my public `TalentProfile`, including my bio, skills (tag input), photo (upload to object storage via TS3 strategy), and list of conventions I've participated in, so that I can effectively showcase myself.
- **Detailed Requirements:**
  - Provide a UI form accessible to users whose `User.roles` array includes `TALENT` to create/edit their `TalentProfile`.
  - Form fields for all `TalentProfile` attributes. `skills` should be manageable as a tag-like input. Profile picture upload mechanism should use presigned URLs to upload directly to object storage, with the final URL saved in `TalentProfile.profilePictureUrl`.
  - Allow Talent to link their profile to `Convention`s they've been part of (UI to search/select existing conventions, creating/deleting `ConventionTalent` entries via API/Server Actions using Prisma).
  - Client-side (e.g., React Hook Form + Zod) and server-side (Zod in API/Server Action) validation for all fields.
- **Acceptance Criteria (ACs):**
  - AC1: A user with the `TALENT` role (verified by Auth.js session) can access a form to create or edit their talent profile.
  - AC2: User can fill in and save all profile details, including uploading a profile picture (URL saved by Prisma). Input is validated by Zod.
  - AC3: User can select and link/unlink conventions they have participated in; `ConventionTalent` records are created/deleted in the database via Prisma.
  - AC4: Saved profile information is displayed correctly on their public profile page.
  - AC5: Only the Talent user themself (where `TalentProfile.userId === session.user.id`) or an `ADMIN` can edit the profile; authorization is enforced server-side.

---

### Story 4.3: Public - View Talent Profile
- **User Story / Goal:** As any user, I want to view the public profile page of a Talent, so that I can learn about their skills, experience, and convention appearances.
- **Detailed Requirements:**
  - Create a public-facing page template using Next.js dynamic routing (e.g., `/talent/{userId}` or `/talent/{vanitySlug}` if implemented) to display `TalentProfile` information fetched via Prisma.
  - Display all relevant public fields: `displayName`, `tagline`, `bio`, `profilePictureUrl`, `skills` (displayed appropriately, e.g., as tags), `websiteUrl`, `contactEmail`.
  - List associated conventions (names and dates) by querying through `ConventionTalent` and `Convention` models, with each convention name linking to its respective detail page.
  - Ensure clear, professional, and accessible (WCAG 2.2 AA) presentation using Material UI.
- **Acceptance Criteria (ACs):**
  - AC1: Any user can navigate to and view a public talent profile page.
  - AC2: All public information from the `TalentProfile` record (including `skills`) is displayed.
  - AC3: Linked conventions (via `ConventionTalent` join table and `Convention` model) are displayed with names and dates, and are clickable, leading to the correct convention detail pages.
  - AC4: The page gracefully handles cases where a talent profile for the given identifier is not found (e.g., shows a "404 Not Found" page).

---

### Story 4.4: Brand Profile - Data Model & Basic CRUD API
- **User Story / Goal:** Technical Story - To ensure the `BrandProfile` and `BrandUser` data models in Prisma (as defined in `docs/data-models.md`, including `BrandUserRole` enum) are correctly implemented. Implement basic API endpoints (or Server Actions) for CRUD operations on `BrandProfile` records.
- **Detailed Requirements:**
  - Verify `BrandProfile` model (`brandName`, `description`, `logoUrl`, `websiteUrl`, `category`) and `BrandUser` model (`userId`, `brandProfileId`, `role: BrandUserRole`) in `prisma/schema.prisma`.
  - API endpoints (e.g., under `/api/brands`) or Server Actions for:
    - `POST /api/brands` (Create): Callable by any authenticated user. Creates a `BrandProfile` and a `BrandUser` entry linking the creator as `PRIMARY_OWNER`.
    * `GET /api/brands/{id}` (or `/{slug}` if `BrandProfile` has a unique slug) (Get one).
    * `PUT /api/brands/{id}` (Update): Callable if authenticated user is a `PRIMARY_OWNER` or `MANAGER` for that `BrandProfile` (verified via `BrandUser` table) or an `ADMIN`.
    * `DELETE /api/brands/{id}` (Delete): Callable if authenticated user is a `PRIMARY_OWNER` for that `BrandProfile` or an `ADMIN`.
    * `GET /api/brands` (List all - public, paginated, for discovery).
  - All data interactions must use Prisma Client.
- **Acceptance Criteria (ACs):**
  - AC1: The Prisma schemas for `BrandProfile`, `BrandUser`, and `BrandUserRole` enum (and the `ConventionBrand` join table) are correctly defined as per `docs/data-models.md`, and migrations apply.
  - AC2: An authenticated user can create a `BrandProfile` via API/Server Action; a `BrandProfile` record is created by Prisma, and a corresponding `BrandUser` record is created linking the user as `PRIMARY_OWNER`.
  - AC3: An authorized `BrandUser` (with `PRIMARY_OWNER` or `MANAGER` role for that specific brand) or an `ADMIN` user can update the `BrandProfile` via API/Server Action, with changes persisted by Prisma.
  - AC4: An authorized `BrandUser` (with `PRIMARY_OWNER` role for that specific brand) or an `ADMIN` user can delete the `BrandProfile` (and associated `BrandUser` entries due to cascading delete) via API/Server Action and Prisma.
  - AC5: `BrandProfile` data (single and list for public view) can be retrieved via API, with data fetched by Prisma.

---

### Story 4.5: User - Create & Edit Own Brand Profile UI
- **User Story / Goal:** As a registered user, I want a form (React with Material UI) to create a `BrandProfile` I represent. As a `PRIMARY_OWNER` or `MANAGER` of a brand, I want to edit its profile and (if `PRIMARY_OWNER`) manage other users' access to it.
- **Detailed Requirements:**
  - Provide a UI form accessible to authenticated users to create a new `BrandProfile`.
  - Provide UI forms for editing an existing `BrandProfile`, accessible if the user has a `BrandUser` record with role `PRIMARY_OWNER` or `MANAGER` for that specific brand.
  - Form fields for all `BrandProfile` attributes. Logo upload uses TS3 strategy (presigned URLs to object storage, final URL saved). Input validated with Zod.
  - For `PRIMARY_OWNER`s: A section within the Brand Profile management UI to view, add, edit roles of, or remove other `BrandUser`s associated with that `BrandProfile`. (e.g., invite user by email to become a `MANAGER`).
  - A user should be able to manage multiple brand profiles they are associated with (listed in a dashboard area).
- **Acceptance Criteria (ACs):**
  - AC1: An authenticated user can access a form to create a new brand profile.
  - AC2: User can fill in and save all brand profile details (validated by Zod), including uploading a logo (URL saved by Prisma). A `BrandUser` record is created for them as `PRIMARY_OWNER`.
  - AC3: A user with appropriate `BrandUserRole` (`PRIMARY_OWNER` or `MANAGER`) for a specific `BrandProfile` can access and edit its details.
  - AC4: Saved brand profile information is displayed correctly on its public profile page.
  - AC5: Only authorized `BrandUser`s (as per their role) or an `ADMIN` can edit/delete the brand profile. A `PRIMARY_OWNER` can manage other `BrandUser` entries for their brand (create new `BrandUser` records, update roles, delete `BrandUser` records via API/Server Actions using Prisma).

---

### Story 4.6: Public - View Brand Profile
- **User Story / Goal:** As any user, I want to view the public profile page of a Brand, so that I can learn about their products/services and conventions they are associated with.
- **Detailed Requirements:**
  - Create a public-facing page template using Next.js dynamic routing (e.g., `/brands/{id}` or `/brands/{slug}` if `BrandProfile` has a unique slug) to display `BrandProfile` information fetched via Prisma.
  - Display all relevant public fields: `brandName`, `description`, `logoUrl`, `websiteUrl`, `category`.
  - List associated conventions (names and dates) by querying through `ConventionBrand` and `Convention` models, with each convention name linking to its respective detail page.
  - Ensure clear, professional, and accessible (WCAG 2.2 AA) presentation using Material UI.
- **Acceptance Criteria (ACs):**
  - AC1: Any user can navigate to and view a public brand profile page.
  - AC2: All public information from the `BrandProfile` record is displayed.
  - AC3: Linked conventions (via `ConventionBrand` join table and `Convention` model) are displayed with names and dates, and are clickable, leading to the correct convention detail pages.
  - AC4: The page gracefully handles cases where a brand profile for the given identifier is not found.

---

### Story 4.7: Link Talent/Brands to Convention Listings
- **User Story / Goal:** As an Organizer managing a `Convention`, I want to associate registered `TalentProfile`s and `BrandProfile`s with my convention listing. As a Talent/Brand manager, I want to see my profile linked from conventions I'm part of.
- **Detailed Requirements:**
  - **For Organizers:** In the convention creation/edit form (from Epic 2 & 3), provide a UI mechanism (e.g., search-and-select dropdowns/modals) to find existing `TalentProfile`s (by `displayName`) and `BrandProfile`s (by `brandName`) and associate them with the `Convention`.
    - This association creates `ConventionTalent` or `ConventionBrand` join table records via API/Server Actions using Prisma. Organizers must be authorized for the `Convention` they are editing.
  - **Display:** On the public `Convention` detail page, list associated `TalentProfile.displayName`s and `BrandProfile.brandName`s (with links to their respective profiles).
  - **Display:** On public `TalentProfile` and `BrandProfile` pages, list associated `Convention.name`s they are part of (with links to the convention detail pages).
- **Acceptance Criteria (ACs):**
  - AC1: Organizers (authorized for the specific `Convention`) can search for and add existing `TalentProfile`s to their convention listing, creating a `ConventionTalent` record via Prisma.
  - AC2: Organizers (authorized for the specific `Convention`) can search for and add existing `BrandProfile`s to their convention listing, creating a `ConventionBrand` record via Prisma.
  - AC3: Associated Talent (displayNames) and Brands (brandNames) are displayed (and linked to their profiles) on the public convention detail page, data fetched via Prisma relations.
  - AC4: Associated conventions (names) are displayed (and linked to their detail pages) on the public Talent and Brand profile pages, data fetched via Prisma relations.

---

### Story 4.8: Search & Discovery for Talent & Brands
- **User Story / Goal:** As any user, I want to search for Talent (e.g., by name, skill) and Brands (e.g., by name, category), so that I can easily find specific performers or businesses within the community.
- **Detailed Requirements:**
  - Create dedicated public search/directory pages for Talent and Brands (e.g., `/talent`, `/brands`) or integrate into a global search.
  - Backend API endpoints (`GET /api/talent-profiles`, `GET /api/brands`) will support filtering and pagination using Prisma.
    - Talent search filters: `displayName` (partial match), `skills` (array contains/`hasSome`).
    - Brand search filters: `brandName` (partial match), `category`.
  - Search results should display summary cards (Material UI) with key info (name, tagline/category, image) and links to their full profiles.
- **Acceptance Criteria (ACs):**
  - AC1: Users can access a search/directory interface for Talent.
  - AC2: Users can search Talent by `displayName` (Prisma `contains` or similar) and/or `skills` (Prisma array `hasSome` or text search on a denormalized field), and relevant, paginated results are shown.
  - AC3: Users can access a search/directory interface for Brands.
  - AC4: Users can search Brands by `brandName` (Prisma `contains`) and/or `category`, and relevant, paginated results are shown.
  - AC5: Search result items correctly link to the respective Talent or Brand profile pages.

## Change Log

| Change        | Date       | Version | Description                                                                      | Author          |
| ------------- | ---------- | ------- | -------------------------------------------------------------------------------- | --------------- |
| Initial Draft | 2025-05-09 | 0.1     | First draft of Epic 4 stories                                                      | Product Manager AI |
| Revision      | 2025-05-09 | 0.2     | Integrated architectural decisions (Prisma models for Talent/Brand/Join Tables, API Routes/Server Actions, Zod, Auth.js role checks for Talent activation and Brand management), refined technical details. | Architect Agent |