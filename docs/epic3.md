# Epic 3: Organizer Tools (Event Management & Idea Validation)

**Goal:** To empower Organizers (users with the `ORGANIZER` role) with specialized tools that streamline event management, specifically through an intuitive drag-and-drop interface (WCAG 2.2 AA compliant) for ordered lists (like schedules) within their convention listings. Additionally, this epic will introduce the "Event Idea Validation" tool, allowing Organizers to propose new convention concepts using the `ProposedConvention` model and gather non-binding interest and feedback (`UserInterest`, `ProposedConventionComment` models) from the User community. All data interactions will utilize Prisma and Next.js API Routes/Server Actions.

## Story List

### Story 3.1: Data Model for Convention Schedule/Ordered Lists
- **User Story / Goal:** Technical Story - To ensure the `ConventionScheduleItem` data model in Prisma (as defined in `docs/data-models.md`) is correctly implemented to support ordered lists associated with a convention, such as an event schedule (item name, time, description, location/room, order).
- **Detailed Requirements:**
  - Verify the `ConventionScheduleItem` model in `prisma/schema.prisma`. Key fields: `conventionId` (FK to `Convention`), `title`, `startTime`, `endTime` (optional), `description` (optional, `@db.Text`), `locationName` (optional), and `order` (integer for sorting).
  - Ensure the model can be easily queried in the correct order using Prisma (e.g., `orderBy: { order: 'asc' }`).
  - API endpoints (or Server Actions) must be available to manage these list items (CRUD operations), callable by authorized Organizers for conventions they manage. These endpoints will be associated with a specific convention (e.g., `POST /api/conventions/{conventionId}/schedule-items`).
- **Acceptance Criteria (ACs):**
  - AC1: The Prisma schema for `ConventionScheduleItem` is correctly defined as per `docs/data-models.md`, and migrations apply successfully.
  - AC2: Authorized Organizers (or Admins) can perform Create, Read (ordered), Update, and Delete operations on `ConventionScheduleItem` records for a convention they manage, via API Routes or Server Actions, with changes persisted by Prisma.
  - AC3: The `order` field correctly dictates the sequence of `ConventionScheduleItem` records when retrieved from the database using Prisma (e.g., `orderBy: { order: 'asc' }`).

---

### Story 3.2: Organizer - Manage Convention Schedule with Drag-and-Drop UI
- **User Story / Goal:** As an Organizer, I want to manage the schedule for my convention using an intuitive drag-and-drop interface (e.g., using a library like `dnd-kit` or `React Beautiful DnD`), so that I can easily create, order, and update schedule items.
- **Detailed Requirements:**
  - In the convention management area (e.g., within the "Edit Convention" form), provide a dedicated section for managing the event schedule.
  - Display existing `ConventionScheduleItem` records in an ordered list.
  - Allow Organizers to add new schedule items (with fields like title, time, description, location), edit existing items, and delete items. Forms should use Material UI components and Zod for validation.
  - Implement drag-and-drop functionality for reordering schedule items using a suitable React library (e.g., `dnd-kit`).
  - Changes to the schedule (add, edit, reorder, delete) must be persisted to the backend via API calls or Server Actions, updating the `ConventionScheduleItem` records (including the `order` field for reordering) using Prisma. Consider batch updates for reordering if supported by the chosen drag-and-drop library and backend logic.
  - The UI, including drag-and-drop, **must be built with WCAG 2.2 Level AA accessibility in mind**, providing full keyboard alternatives for all drag-and-drop operations (e.g., using arrow keys to move items, a "move to position" input).
- **Acceptance Criteria (ACs):**
  - AC1: An Organizer can add new items (e.g., sessions, workshops) with validated details (Zod) to their convention schedule, saved via Prisma.
  - AC2: An Organizer can edit the details (title, time, description, etc.) of existing schedule items, with changes saved via Prisma.
  - AC3: An Organizer can visually drag and drop schedule items to reorder them; the new order is saved to the database by updating the `order` field of affected `ConventionScheduleItem` records via Prisma.
  - AC4: An Organizer can delete schedule items, with records removed by Prisma.
  - AC5: The drag-and-drop interface is responsive and provides clear visual feedback (using Material UI styled elements) during interaction.
  - AC6: Full keyboard navigation and operation for reordering, adding, editing, and deleting schedule items is implemented and functional, meeting WCAG 2.2 AA standards.

---

### Story 3.3: Public - View Convention Schedule
- **User Story / Goal:** As any user, I want to view the detailed schedule for a convention on its public listing page, so that I know what events are happening and when.
- **Detailed Requirements:**
  - On the public convention detail page (Story 2.3), display the convention schedule if `ConventionScheduleItem` records exist for that convention.
  - Present schedule items in their correct order (fetched via Prisma, ordered by `order`).
  - Display all relevant details for each schedule item (title, time, description, location).
  - Ensure the schedule is presented in a clear, readable, and accessible format (WCAG 2.2 AA), using Material UI components for display.
- **Acceptance Criteria (ACs):**
  - AC1: If a convention has associated `ConventionScheduleItem` records, its schedule is displayed on its public detail page.
  - AC2: Schedule items are listed in the `order` set by the Organizer (as retrieved by Prisma `orderBy`).
  - AC3: All defined details (title, time, locationName, description) for each schedule item are visible.
  - AC4: The schedule display is accessible and easy to read on various devices, adhering to WCAG 2.2 AA.

---

### Story 3.4: Data Model for "Proposed Convention" & User Interest
- **User Story / Goal:** Technical Story - To ensure the Prisma schema correctly implements the `ProposedConvention`, `UserInterest`, `ProposedConventionComment` models, and the `ProposedConventionStatus` enum as defined in `docs/data-models.md`, enabling Organizers to propose ideas and users to interact with them.
- **Detailed Requirements:**
  - Verify the `ProposedConvention` model in `prisma/schema.prisma` with fields like `title`, `slug`, `conceptDescription`, `estimatedDates`, `estimatedLocation`, `status` (`ProposedConventionStatus` enum), and `organizerUserId` (linking to `User`).
  - Verify the `UserInterest` model linking `User` and `ProposedConvention`.
  - Verify the `ProposedConventionComment` model linking `User`, `ProposedConvention`, and storing `commentText`.
  - Implement API endpoints (or Server Actions) for:
    - CRUD operations on `ProposedConvention` (Organizers managing their own proposals).
    - Creating/deleting `UserInterest` records (by logged-in users).
    - Creating/deleting own `ProposedConventionComment` records (by logged-in users).
  - All interactions use Prisma Client.
- **Acceptance Criteria (ACs):**
  - AC1: Prisma schemas for `ProposedConvention`, `ProposedConventionStatus` (enum), `UserInterest`, and `ProposedConventionComment` are correctly defined as per `docs/data-models.md`, and migrations apply.
  - AC2: Authorized Organizers (users with `ORGANIZER` role) can create, read, update, and delete their *own* `ProposedConvention` drafts via API Routes or Server Actions, with changes persisted by Prisma (enforcing ownership via `organizerUserId`).
  - AC3: Authenticated users can register/remove their "interest" in a `ProposedConvention` via API/Server Actions, creating/deleting `UserInterest` records in Prisma.
  - AC4: Authenticated users can post textual comments on a `ProposedConvention` and delete their *own* comments via API/Server Actions, creating/deleting `ProposedConventionComment` records in Prisma.

---

### Story 3.5: Organizer - Create & Manage "Proposed Convention" Listing
- **User Story / Goal:** As an Organizer, I want to create and manage a "Proposed Convention" listing to describe a new event concept, so that I can gather feedback and gauge interest from the community before committing to a full event.
- **Detailed Requirements:**
  - Provide a UI form (Material UI components) accessible to users with the `ORGANIZER` role for creating a `ProposedConvention`.
  - Form fields: title, concept description, estimated dates/timeframe (text input), estimated location/city (text input), initial status (e.g., `PROPOSED`). Input validated with Zod.
  - Organizers can view a list of their own `ProposedConvention` records.
  - Organizers can edit and delete their own `ProposedConvention` drafts. Authorization checks must ensure an Organizer can only modify proposals where `ProposedConvention.organizerUserId` matches their `session.user.id`.
  - A "Proposed Convention" is clearly distinct in the UI from a regular "Convention Listing."
  - All operations use Prisma via API Routes or Server Actions.
- **Acceptance Criteria (ACs):**
  - AC1: A user with the `ORGANIZER` role can access a form to create a "Proposed Convention."
  - AC2: Organizer can fill in details (validated by Zod) and save the proposal; a new `ProposedConvention` record is created in Prisma with the correct `organizerUserId` and a unique `slug`.
  - AC3: The proposal is listed in a dedicated section for the Organizer (e.g., "My Proposed Events"), showing proposals where `organizerUserId` matches their ID.
  - AC4: Organizer can edit or delete their own `ProposedConvention` records, with authorization enforced server-side (Prisma `where` clauses checking `id` and `organizerUserId`).

---

### Story 3.6: Public - View "Proposed Convention" & Express Interest/Comment
- **User Story / Goal:** As a User (Hobbyist, or any logged-in user), I want to view details of a "Proposed Convention" and be able to indicate "I'm Interested" (non-binding) and leave comments, so that I can show support and provide feedback to the Organizer.
- **Detailed Requirements:**
  - Create a public-facing page (e.g., `/proposals/[slug]`) to display details of a single `ProposedConvention` (fetched via Prisma).
  - Display all relevant information: title, concept description, estimated dates/location, Organizer's `User.name`.
  - Logged-in users see an "I'm Interested" button. Clicking it creates a `UserInterest` record for that user and proposal (via API/Server Action using Prisma). Clicking again removes interest (deletes the `UserInterest` record).
  - Display a count of users who are "Interested" (derived from `UserInterest` records).
  - Logged-in users can view comments (`ProposedConventionComment` records) and add new comments (via a Zod-validated form submitting to an API/Server Action that creates a `ProposedConventionComment` record using Prisma).
  - Users can only delete their own comments (server-side authorization check: `comment.userId === session.user.id`).
- **Acceptance Criteria (ACs):**
  - AC1: Any user can view the details of a `ProposedConvention` fetched via Prisma.
  - AC2: A logged-in user can click an "I'm Interested" button; their interest is recorded in the `UserInterest` table (Prisma create), and the button state/interest count updates on the UI.
  - AC3: A logged-in user can click the button again to remove their interest; the `UserInterest` record is removed (Prisma delete), and the state/count updates.
  - AC4: A logged-in user can add a textual comment (validated by Zod) to the proposal, creating a `ProposedConventionComment` record via Prisma.
  - AC5: Users can view comments left by others, showing `commentText` and `User.name` of the commenter.
  - AC6: Users can delete their own `ProposedConventionComment` records, with authorization enforced server-side before Prisma delete.

---

### Story 3.7: Organizer - View Interest & Comments on Own "Proposed Convention"
- **User Story / Goal:** As an Organizer, I want to view the number of "Interested" users and read all comments on my "Proposed Convention" listings, so that I can assess viability and gather ideas.
- **Detailed Requirements:**
  - On the management page for their "Proposed Convention" (where `ProposedConvention.organizerUserId === session.user.id`), Organizers can see:
    - A clear count of how many users have expressed interest (e.g., using Prisma's `_count` on the `UserInterest` relation).
    - A list of all `ProposedConventionComment` records, with commenter's `User.name` and timestamps, fetched via Prisma.
  - (Optional MVP: List of users who expressed interest by name, if privacy allows and deemed useful, fetched via Prisma `include` on `UserInterest`).
- **Acceptance Criteria (ACs):**
  - AC1: An Organizer can view the total count of "Interested" users (from `UserInterest` `_count`) for each of their proposals.
  - AC2: An Organizer can view all comments (`ProposedConventionComment` records), along with commenter `User.name` and timestamps, for their proposals, fetched via Prisma.
  - AC3: The information is clearly presented and easy for the Organizer to interpret. Authorization ensures they only see this for their own proposals.

## Change Log

| Change        | Date       | Version | Description                                                                      | Author          |
| ------------- | ---------- | ------- | -------------------------------------------------------------------------------- | --------------- |
| Initial Draft | 2025-05-09 | 0.1     | First draft of Epic 3 stories                                                      | Product Manager AI |
| Revision      | 2025-05-09 | 0.2     | Integrated architectural decisions (Prisma, Next.js API Routes/Server Actions, Zod, Auth.js, role checks, WCAG for D&D), refined technical details in requirements and ACs. | Architect Agent |