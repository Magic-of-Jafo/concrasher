# Epic 5: Community Features (MVP) - Focused on Forums

**Goal:** To introduce foundational community features, specifically a basic forum focused on enabling users to coordinate ride-sharing and find roommates for performance magic conventions. This epic aims to address the "Lack of a Centralized Community Hub" problem by providing initial, practical avenues for user interaction and content generation, with basic Admin moderation capabilities built-in. Data interactions will use Prisma and Next.js API Routes/Server Actions.

**Note on Scope Change:** Features related to direct commenting and reviews on convention listings (originally Stories 5.1-5.4) have been deferred from the MVP to manage initial scope and potential moderation complexities. This epic now focuses solely on the Forum.

## Story List

### Story 5.1: Convention Comments/Reviews - Data Model & API
- **Status:** DEFERRED FROM MVP
- **Original User Story / Goal:** Technical Story - To define the data model for convention comments/reviews and implement API endpoints...
- **Reason for Deferral:** Decision made to simplify MVP scope and avoid potential complexities with managing user-generated comments on conventions/profiles at this stage.

---

### Story 5.2: User - Post Comment/Review on Convention Listing
- **Status:** DEFERRED FROM MVP
- **Original User Story / Goal:** As a logged-in User, I want to post a textual comment and optionally a star rating on a convention listing...

---

### Story 5.3: Public - View Comments/Reviews on Convention Listing
- **Status:** DEFERRED FROM MVP
- **Original User Story / Goal:** As any user, I want to view comments and reviews left by other users on a convention listing...

---

### Story 5.4: User - Edit/Delete Own Comment/Review
- **Status:** DEFERRED FROM MVP
- **Original User Story / Goal:** As a logged-in User, I want to be able to edit or delete my own comments/reviews...

---

### Story 5.5: Basic Forum - Data Models & API (Categories, Threads, Posts)
- **User Story / Goal:** Technical Story - To ensure the Prisma schema correctly implements the `ForumCategory`, `ForumThread`, and `ForumPost` models (as defined in `docs/data-models.md`) and implement core API endpoints (or Server Actions) for their management, focusing on ride-sharing and roommate seeking.
- **Detailed Requirements:**
  - Verify `ForumCategory`, `ForumThread`, `ForumPost` models in `prisma/schema.prisma`.
  - API endpoints (or Server Actions) for:
    - Listing `ForumCategory` records (e.g., initial categories like "Ride Sharing," "Roommate Search," potentially allowing dynamic creation or sub-categories per region/convention later).
    - Listing `ForumThread` records within a category (paginated, sorted by `lastActivityAt`, fetched via Prisma).
    - Viewing a single `ForumThread` with its `ForumPost` records (paginated, fetched via Prisma).
    - Creating a new `ForumThread` (by authenticated users, title validated with Zod). The first post of the thread is also created.
    - Creating a new `ForumPost` (reply) in an existing `ForumThread` (by authenticated users, content validated with Zod).
    - Editing/Deleting own `ForumThread`s (only the initial post content if applicable) and `ForumPost`s by their author.
    - Admin capabilities (see Story 5.9) for broader content management (delete any thread/post, pin/lock threads).
  - All data interactions must use Prisma Client. User authentication via Auth.js session.
- **Acceptance Criteria (ACs):**
  - AC1: Prisma schemas for `ForumCategory`, `ForumThread`, `ForumPost` are correctly defined as per `docs/data-models.md`, and migrations apply.
  - AC2: APIs/Server Actions allow retrieval of categories, threads within categories (paginated, sorted), and posts within threads (paginated), using Prisma.
  - AC3: Authenticated users (verified by Auth.js session) can create new `ForumThread`s (with an initial `ForumPost`) and new `ForumPost`s (replies) via API/Server Actions, with data (validated by Zod) persisted by Prisma.
  - AC4: Users can edit/delete their own `ForumThread`s (initial post) and `ForumPost`s via API/Server Actions, with ownership (`userId === session.user.id`) checked before Prisma update/delete. Admins have override capabilities (see 5.9).

---

### Story 5.6: Basic Forum - UI to View Categories & Threads
- **User Story / Goal:** As any user, I want to view a list of forum categories (focused on ride-sharing/roommates) and, within each category, a list of discussion threads, so that I can navigate the forum and find relevant topics.
- **Detailed Requirements:**
  - A main forum page (e.g., `/forum`) listing all `ForumCategory` records fetched via Prisma. Initial categories should be pre-defined (e.g., "General Ride Share Board," "General Roommate Search," or more specific categories if a convention context is added).
  - Clicking a category name leads to a page (e.g., `/forum/{categorySlug}`) listing `ForumThread` records in that category.
  - Thread list should display: `ForumThread.title`, author's `User.name`, number of replies (derived from `ForumPost._count`), `ForumThread.lastActivityAt`. Displayed using Material UI components.
  - Threads should be sortable (e.g., by `lastActivityAt`, creation date) and paginated (server-side using Prisma `skip`/`take`).
- **Acceptance Criteria (ACs):**
  - AC1: Users can navigate to a page listing all forum categories.
  - AC2: Users can click a category to view a list of threads within it.
  - AC3: Thread list displays title, author, reply count, and last activity information (fetched via Prisma), is sortable, and is paginated correctly.

---

### Story 5.7: Basic Forum - UI to View Thread & Posts, Create Post (Reply)
- **User Story / Goal:** As any user, I want to view a specific forum thread, including all its posts. As a logged-in user, I want to reply to a thread by creating a new post, so that I can participate in discussions (e.g., about ride-sharing or finding roommates).
- **Detailed Requirements:**
  - Clicking a thread title leads to a page (e.g., `/forum/threads/{threadSlug}` or `/{threadId}`) displaying the thread's `ForumPost` records in chronological order.
  - Posts should show: author's `User.name`, `ForumPost.contentText`, `ForumPost.createdAt`. Displayed using Material UI components.
  - Posts should be paginated if the thread is long (server-side using Prisma `skip`/`take`).
  - Logged-in users (verified by Auth.js session) see a form (e.g., simple text editor using Material UI, content validated by Zod) to write and submit a new `ForumPost` (reply) to the current thread. Submission via API/Server Action.
- **Acceptance Criteria (ACs):**
  - AC1: Users can view the content of a specific forum thread, including all its `ForumPost` records fetched via Prisma.
  - AC2: Post details (author's `User.name`, content, date) are displayed clearly.
  - AC3: Logged-in users can access a reply form (with Zod validation) within a thread.
  - AC4: Logged-in users can successfully submit a reply; it appears as a new `ForumPost` in the thread, persisted by Prisma.

---

### Story 5.8: Basic Forum - UI to Create New Thread
- **User Story / Goal:** As a logged-in user, I want to create a new discussion thread within a specific forum category (e.g., to offer a ride or seek roommates), by providing a title and initial post content, so that I can start new conversations.
- **Detailed Requirements:**
  - On a `ForumCategory` page, logged-in users (verified by Auth.js session) see an option to "Create New Thread."
  - This leads to a form (Material UI) with fields for: Thread Title, Initial Post Content (simple text editor). Input validated by Zod.
  - User selects the `ForumCategory` (or it's pre-filled if initiated from a category page).
  - On submission, a new `ForumThread` and its initial `ForumPost` are created via an API Route or Server Action, using Prisma. The `ForumThread.userId` and the first `ForumPost.userId` are set to `session.user.id`.
- **Acceptance Criteria (ACs):**
  - AC1: Logged-in users can access a form to create a new forum thread.
  - AC2: User can enter a title and initial post content (validated by Zod) and submit the form.
  - AC3: A new `ForumThread` is created in the selected category via Prisma, with the user as the author. The initial `ForumPost` is also created and associated with the thread and user.
  - AC4: User is redirected to the newly created thread page.

---

### Story 5.9: Basic Moderation Considerations (Admin - Forum Only)
- **User Story / Goal:** As an Admin, I want basic tools/capabilities to moderate forum content (threads/posts), such as deleting inappropriate content and managing thread status (pinning/locking), so that I can maintain a healthy community environment for discussions about ride-sharing and roommates.
- **Detailed Requirements:**
  - Admins (users with `ADMIN` in `User.roles`, verified by Auth.js session) should have the ability to:
    - Delete any `ForumThread`.
    - Delete any individual `ForumPost` within a thread.
    - Pin/Unpin `ForumThread`s (updates `ForumThread.isPinned` field via Prisma).
    - Lock/Unlock `ForumThread`s (updates `ForumThread.isLocked` field via Prisma).
  - UI for these admin actions should be integrated into the admin dashboard or directly on the forum content views when an Admin is logged in. Operations performed via API Routes or Server Actions.
- **Acceptance Criteria (ACs):**
  - AC1: An Admin can delete any `ForumThread` via an API/Server Action, removing it and its associated `ForumPost`s (due to cascading delete in Prisma schema) from the platform.
  - AC2: An Admin can delete any individual `ForumPost` within a thread via an API/Server Action, removing it from the platform.
  - AC3: An Admin can pin/unpin a `ForumThread`; the `ForumThread.isPinned` status is updated by Prisma, and pinned threads are visually distinct and/or prioritized in listings.
  - AC4: An Admin can lock/unlock a `ForumThread`; the `ForumThread.isLocked` status is updated by Prisma, and locked threads prevent new `ForumPost`s from being added (enforced by backend logic).
  - AC5: Deletion actions are confirmed, and moderation actions (pin/lock) are reflected in the UI.

## Change Log

| Change        | Date       | Version | Description                                                                                                                              | Author          |
| ------------- | ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Initial Draft | 2025-05-09 | 0.1     | First draft of Epic 5 stories                                                                                                            | Product Manager AI |
| Revision      | 2025-05-09 | 0.2     | Scope significantly changed: Convention Comments/Reviews (5.1-5.4) deferred from MVP. Forum (5.5-5.8) retained with focus on ride/room sharing. Moderation (5.9) updated for Forum only. Integrated architectural details. | Architect Agent |