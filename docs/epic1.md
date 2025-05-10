# Epic 1: Core Platform Setup, User Authentication & Roles

**Goal:** Establish the foundational project structure, local development environment using Next.js (App Router), Prisma with PostgreSQL, and Auth.js. Implement user registration, authentication, and a multi-role user model (User, Organizer, Talent, Admin), including admin capabilities for Organizer role management and self-activation for Talent roles. This epic ensures a secure and functional base for all subsequent platform features.

## Story List

### Story 1.1: Project Scaffolding & Local Development Environment Setup
- **User Story / Goal:** Technical Story - To set up the initial Next.js (latest stable, e.g., 14.x, App Router) project structure, integrate Prisma (latest stable, e.g., 5.x) with a local PostgreSQL (16.x via Docker), and configure basic Auth.js (latest stable, e.g., v5+) for local development, enabling a runnable local environment for developers.
- **Detailed Requirements:**
  - Initialize a new Next.js application using `create-next-app` with the App Router.
  - Install and configure Prisma ORM (latest stable version).
  - Define initial Prisma schema for a local PostgreSQL 16.x database.
  - Set up database connection for the local PostgreSQL instance using `docker-compose.yml` for easy management (referencing Technical Story TS1 for Docker Compose setup).
  - Install and perform initial configuration of Auth.js (latest stable version, e.g., v5+).
  - Ensure basic project can run locally (`npm run dev` or chosen package manager equivalent).
  - Create initial `README.md` with setup instructions for local development, including Docker Compose usage and environment variable setup (`.env.local` from `.env.example`).
  - Project will use `npm` as the package manager and have initial dependencies from `tech-stack.md` installed.
- **Acceptance Criteria (ACs):**
  - AC1: A developer can clone the repository, set up their `.env.local` file, run `docker-compose up -d` (or equivalent), and successfully run the Next.js application locally.
  - AC2: Prisma is configured and can connect to the Dockerized PostgreSQL 16.x database; initial migrations (if any) run successfully.
  - AC3: Basic Auth.js (v5+) setup is present; placeholder login/logout functionality might be accessible but not fully functional yet, using the PrismaAdapter.
  - AC4: Local PostgreSQL database can be started via Docker Compose and is accessed by the application using the `DATABASE_URL` environment variable.
  - AC5: An `.env.example` file is present in the repository, and local development correctly uses an `.env.local` file for environment variables like `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.

---

### Story 1.2: Basic User Registration (Email/Password)
- **User Story / Goal:** As a new visitor, I want to register for a "User/Hobbyist" account using my email and a password, so that I can access basic platform features and content.
- **Detailed Requirements:**
  - Create a registration page with fields for email, password, and password confirmation.
  - Implement client-side and server-side validation for input fields using Zod schemas (as defined in `src/lib/validators.ts`).
  - Securely hash passwords using algorithms supported by Auth.js (e.g., bcrypt) before storing them.
  - Upon successful registration, create a new user record in the database (via Prisma) with a default role of `Role.USER` (from Prisma `Role` enum).
  - Provide appropriate feedback to the user on success or failure of registration.
- **Acceptance Criteria (ACs):**
  - AC1: A user can navigate to the registration page.
  - AC2: A user can successfully submit the registration form with valid email and matching passwords, validated by Zod schemas.
  - AC3: A new user record is created in the database with the provided email (hashed password) and default `Role.USER`.
  - AC4: User receives clear error messages for invalid input (e.g., email already exists based on database check via Prisma, passwords don't match, invalid email format or password complexity rules as defined by Zod schema).
  - AC5: Upon successful registration, the user is redirected (e.g., to login page or a welcome page).

---

### Story 1.3: User Login & Logout (Email/Password)
- **User Story / Goal:** As a registered user, I want to log in to the platform using my email and password, and log out when I'm done, so that I can securely access my account and protected features.
- **Detailed Requirements:**
  - Create a login page with fields for email and password.
  - Validate user credentials against stored (hashed) passwords using the Auth.js credential provider.
  - Implement session management using Auth.js (with the PrismaAdapter, resulting in database sessions) upon successful login.
  - Provide a clear way for users to log out, which clears their session.
  - Redirect users appropriately after login (e.g., to dashboard) and logout (e.g., to homepage).
- **Acceptance Criteria (ACs):**
  - AC1: A registered user can successfully log in with correct email and password.
  - AC2: An attempt to log in with incorrect credentials results in an error message and no session being created.
  - AC3: Upon successful login, a user session is established (e.g., session cookie set, session record created in the database via Auth.js PrismaAdapter) and maintained.
  - AC4: A logged-in user can successfully log out, and their session is terminated (session record invalidated/removed).
  - AC5: Users are redirected to the appropriate pages after login and logout.

---

### Story 1.4: User Profile - Basic View & Edit
- **User Story / Goal:** As a logged-in user, I want to view my basic profile information and edit some of it (e.g., display name, a short bio), so that I can personalize my presence on the platform.
- **Detailed Requirements:**
  - Create a user profile page accessible to logged-in users.
  - Display basic user information (e.g., email (non-editable), display name, bio).
  - Provide an interface (e.g., an edit form, validated with Zod schemas) for users to update their display name and bio.
  - Save changes to the user's record in the database via an API route or Server Action using Prisma.
  - Ensure only the authenticated user can edit their own profile (authorization checks comparing `session.user.id` against the profile's `userId`). Admins will have separate override capabilities.
- **Acceptance Criteria (ACs):**
  - AC1: A logged-in user can navigate to their profile page and view their current display name and bio.
  - AC2: A user can successfully update their display name and bio via a form, with input validated by Zod.
  - AC3: Changes made to the profile are persisted in the database (via Prisma) and reflected on the profile page.
  - AC4: An attempt by user A to access or submit an edit form for user B's profile is denied with an appropriate error/redirect (unless user A is an Admin).

---

### Story 1.5: User Role System - Data Models & Basic Structure
- **User Story / Goal:** Technical Story - To define and implement the core database schema (using Prisma) for Users, the `Role` enum (`USER`, `ORGANIZER`, `TALENT`, `ADMIN`), and their relationships, to support multi-role assignments and role-based access control foundations.
- **Detailed Requirements:**
  - Define `User` model in Prisma schema, including a `roles Role[]` field.
  * The `Role` enum is defined in the Prisma schema as `enum Role { USER, ORGANIZER, TALENT, ADMIN }`.
  - The `User.roles` array allows a user to hold multiple roles simultaneously (e.g., `[USER, ORGANIZER, TALENT]`).
  - Implement basic helper functions or leverage Auth.js session object (e.g., checking `session.user.roles`) to check a user's roles for UI rendering and API access control.
- **Acceptance Criteria (ACs):**
  - AC1: Prisma schema includes the `User` model with `roles Role[]` field, the `Role` enum, and related authentication models (Account, Session, VerificationToken). Migrations apply successfully.
  - AC2: It's possible to programmatically assign one or more roles to a user by updating the `User.roles` array.
  - AC3: It's possible to programmatically query the roles associated with a user (e.g., by reading `user.roles`).
  - AC4: The `User.roles` array structure is directly usable by Auth.js callbacks (e.g., `signIn`, `jwt`, `session`) and Next.js middleware for determining user capabilities and protecting routes/actions.

---

### Story 1.6: Admin Role - Initial Assignment & Basic Dashboard Placeholder
- **User Story / Goal:** Technical Story - To provide a secure way to assign the "Admin" role to an initial user (via Prisma seed script) and create a basic, access-controlled placeholder page for an Admin Dashboard.
- **Detailed Requirements:**
  - Implement a mechanism to assign the `ADMIN` role to at least one user via a documented Prisma seed script (referencing Technical Story TS4 for advanced seeding). This script should allow specifying a user by email to be made an admin.
  - Create a simple page at a defined admin route (e.g., `/admin/dashboard`).
  - Protect this route and all routes under `/admin/*` using Next.js middleware (`src/middleware.ts`) that checks if the authenticated user's `session.user.roles` array includes `ADMIN`.
  - The placeholder page should indicate it's an admin area.
- **Acceptance Criteria (ACs):**
  - AC1: An `ADMIN` role can be successfully assigned to a user via a documented Prisma seed script.
  - AC2: A user whose `User.roles` array includes `ADMIN` can access the `/admin/dashboard` page.
  - AC3: A user without the `ADMIN` role (including unauthenticated users or users with other roles) is denied access to `/admin/*` routes and redirected appropriately (e.g., to login or a "forbidden" page).
  - AC4: The admin dashboard placeholder page displays basic "Admin Area" content.

---

### Story 1.7: Application for Organizer Role & Self-Activation for Talent Role
- **User Story / Goal (Organizer):** As a logged-in "User/Hobbyist", I want to submit an application to become an "Organizer", so that an Admin can review my request and grant me additional platform privileges for managing conventions.
- **User Story / Goal (Talent):** As a logged-in "User/Hobbyist" or "Organizer", I want to self-activate Talent status through a setting in my profile, so I can create and manage a Talent Profile without needing admin approval.
- **Detailed Requirements (Organizer Application):**
  - On the user's profile page or a dedicated section, provide an option/button to "Apply for Organizer Role".
  - Clicking "apply" should lead to a simple confirmation step or a minimal form (e.g., "Reason for application?"). For MVP, a simple click-to-apply might suffice, generating a pending request.
  - Store these role requests in the `RoleApplication` table (via Prisma) with `status: ApplicationStatus.PENDING`, `requestedRole: RequestedRole.ORGANIZER`, associated with the `userId`.
  - User should receive feedback that their Organizer application has been submitted.
  - A user should not be able to re-apply if an application for the `ORGANIZER` role is already pending for them.
- **Detailed Requirements (Talent Self-Activation):**
  - In the user's profile settings, provide a non-obvious option (e.g., a toggle or button in an "Advanced" or "Profile Type" tab) to "Activate Talent Profile" or "Become a Talent".
  - Activating this option should programmatically add `Role.TALENT` to the `User.roles` array for that user (via an API route or Server Action using Prisma).
  - Upon successful activation, the user should be informed, and UI elements for creating/editing their `TalentProfile` should become available.
  - No `RoleApplication` record is created for Talent activation.
- **Acceptance Criteria (ACs) - Organizer Application:**
  - AC1: A logged-in "User/Hobbyist" can find and use an option to apply for the "Organizer" role.
  - AC2: Upon application for Organizer, a `RoleApplication` record is created in the database with user ID, `requestedRole: RequestedRole.ORGANIZER`, and `status: ApplicationStatus.PENDING`.
  - AC3: User receives confirmation that their Organizer application is submitted.
  - AC4: The apply option for Organizer is disabled or hidden if an application for that specific role is already pending for the user.
- **Acceptance Criteria (ACs) - Talent Self-Activation:**
  - AC5: A logged-in User (any role) can find and use an option in their profile to self-activate Talent status.
  - AC6: Upon self-activation, `Role.TALENT` is added to the `User.roles` array in the database.
  - AC7: User receives confirmation of Talent status activation, and relevant UI options for Talent Profile management become accessible.

---

### Story 1.8: Admin - View Role Applications & Approve/Reject (Organizer Only)
- **User Story / Goal:** As an Admin, I want to view a list of pending **Organizer** role applications and be able to approve or reject them, so that I can manage user permissions and grant access to Organizer-specific features.
- **Detailed Requirements:**
  - In the Admin Dashboard, create a section to list pending `RoleApplication` records where `requestedRole: RequestedRole.ORGANIZER` and `status: ApplicationStatus.PENDING`.
  - The list should display relevant user information (e.g., username/email from the related `User` model) and the requested role (which will be Organizer).
  - Provide "Approve" and "Reject" actions for each pending application.
  - Approving an application should:
    - Update the target `User.roles` array (via Prisma) to include `Role.ORGANIZER`.
    - Change the `RoleApplication.status` to `ApplicationStatus.APPROVED`.
  - Rejecting an application should:
    - Change the `RoleApplication.status` to `ApplicationStatus.REJECTED`.
    - The user's roles are not changed.
  - (Optional for MVP, consider for future: Notify user of application status change).
- **Acceptance Criteria (ACs):**
  - AC1: An Admin can access a page listing all pending `ORGANIZER` role applications.
  - AC2: For each application, the Admin can see the user's identifier and the role they applied for (which will be `ORGANIZER`).
  - AC3: Admin can approve an application; the `ORGANIZER` role is added to the `User.roles` array, and the `RoleApplication.status` is updated to `APPROVED`.
  - AC4: Admin can reject an application; the user is not granted the `ORGANIZER` role, and the `RoleApplication.status` is updated to `REJECTED`.
  - AC5: Approved/rejected applications are no longer listed as "pending".

## Change Log

| Change        | Date       | Version | Description                                                                                                | Author                  |
| ------------- | ---------- | ------- | ---------------------------------------------------------------------------------------------------------- | ----------------------- |
| Initial Draft | 2025-05-09 | 0.1     | First draft of Epic 1 stories                                                                              | Product Manager AI      |
| Revision      | 2025-05-09 | 0.2     | Integrated architectural decisions, refined technical details in requirements and ACs, updated Talent role acquisition process. | Architect Agent         |