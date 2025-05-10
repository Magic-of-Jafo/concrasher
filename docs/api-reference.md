# ConventionCrasher API Reference

This document provides an overview of the external APIs consumed by ConventionCrasher and the internal APIs it provides.

*(Current Date: 2025-05-09)*

## 1. External APIs Consumed

For the MVP, ConventionCrasher has limited direct external API dependencies beyond standard cloud services accessed via SDKs.

### 1.1. Cloud Object Storage (e.g., AWS S3, Cloudinary)

* **Purpose:** To store and serve user-uploaded media files (profile pictures, brand logos, convention images).
* **Interaction:** Via SDKs (e.g., `@aws-sdk/client-s3`, Cloudinary SDK).
* **Authentication:** Handled by SDKs using credentials specified in environment variables (see `docs/environment-vars.md` for `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUDINARY_URL`, etc.).
* **Key Operations Used (Conceptual via SDK):**
    * `PutObjectCommand` (or equivalent): Uploading files.
    * `GetObjectCommand` (or equivalent): Retrieving files (often served via CDN links).
    * `DeleteObjectCommand` (or equivalent): Deleting files.
* **Link to Official Docs:**
    * AWS S3: [https://aws.amazon.com/s3/](https://aws.amazon.com/s3/)
    * Cloudinary: [https://cloudinary.com/documentation](https://cloudinary.com/documentation)

### 1.2. Authentication Providers via Auth.js (Future)

* **Purpose:** If OAuth providers (e.g., Google, GitHub) are integrated for user login.
* **Interaction:** Auth.js library handles the OAuth flows and communication with provider APIs.
* **Authentication:** OAuth 2.0 client credentials (e.g., `GITHUB_ID`, `GITHUB_SECRET`) stored as environment variables.
* **Note:** For MVP, primary authentication is email/password. This section would be expanded if/when OAuth providers are added.

## 2. Internal APIs Provided (Next.js API Routes & Server Actions)

The ConventionCrasher backend is built using Next.js API Routes (primarily under `src/app/api/`) and potentially Next.js Server Actions for data mutations. These are not versioned, separately deployed microservices but rather the server-side endpoints of the monolithic Next.js application.

* **Base URL:** `/api/` (for API Routes)
* **Authentication/Authorization:** Handled by Auth.js middleware and custom logic checking user roles and ownership before processing requests.
* **Request/Response Format:** JSON.
* **Data Schemas:** Input validation will be performed using Zod (schemas likely in `src/lib/validators.ts`). Output data structures will generally conform to the Prisma models defined in `docs/data-models.md`.

### Key Resource Endpoints (Conceptual List - Not Exhaustive)

This list outlines the main resources and typical CRUD operations. Specific paths and parameters will be defined during development.

* **Users & Auth:**
    * `POST /api/auth/register` (Custom endpoint for email/password registration)
    * Auth.js routes: `/api/auth/*` (handles login, logout, session, callbacks)
    * `GET /api/users/me` (Get current user's profile)
    * `PUT /api/users/me` (Update current user's profile)
    * `POST /api/users/role-applications` (Apply for Organizer role)
    * Admin endpoints for user management (e.g., `/api/admin/users`, `/api/admin/role-applications`).
* **Conventions:**
    * `POST /api/conventions` (Create new convention - Organizers)
    * `GET /api/conventions` (List/search public conventions)
    * `GET /api/conventions/{id}` (Get specific convention details)
    * `PUT /api/conventions/{id}` (Update convention - Organizer/Admin)
    * `DELETE /api/conventions/{id}` (Delete convention - Organizer/Admin)
    * Endpoints for managing `ConventionScheduleItem`, `ConventionTalent`, `ConventionBrand` linked to a convention.
* **Brand Profiles:**
    * `POST /api/brands`
    * `GET /api/brands`, `GET /api/brands/{id}`
    * `PUT /api/brands/{id}`
    * `DELETE /api/brands/{id}`
    * Endpoints for managing `BrandUser` (assigning/revoking managers - Primary Owner/Admin).
* **Talent Profiles:**
    * `POST /api/talent-profiles` (If user has TALENT role)
    * `GET /api/talent-profiles`, `GET /api/talent-profiles/{userId}`
    * `PUT /api/talent-profiles/{userId}`
* **Convention Series:**
    * `POST /api/convention-series`
    * `GET /api/convention-series`, `GET /api/convention-series/{id}`
    * `PUT /api/convention-series/{id}`
    * `DELETE /api/convention-series/{id}`
    * Endpoints for managing `ConventionSeriesUser`.
* **Proposed Conventions:**
    * `POST /api/proposed-conventions`
    * `GET /api/proposed-conventions`, `GET /api/proposed-conventions/{id}`
    * `POST /api/proposed-conventions/{id}/interest` (Express interest)
    * `DELETE /api/proposed-conventions/{id}/interest` (Remove interest)
    * `POST /api/proposed-conventions/{id}/comments` (Add comment)
* **Forum:**
    * `GET /api/forum/categories`
    * `GET /api/forum/categories/{slug}/threads`
    * `POST /api/forum/categories/{slug}/threads` (Create thread)
    * `GET /api/forum/threads/{id}`
    * `POST /api/forum/threads/{id}/posts` (Create post/reply)
    * Admin endpoints for moderating forum content.

**Note on Server Actions:** Next.js Server Actions may be used for form submissions and data mutations directly from React Server Components, potentially reducing the need for some dedicated API route handlers. The principles of authentication, authorization, and validation will still apply to Server Actions. Their "API" is defined by their function signature.

## 3. SDK Usage (Beyond Auth.js and Prisma Client)

* **AWS SDK (or equivalent for other cloud storage providers):**
    * **Purpose:** Interacting with cloud object storage for media uploads/downloads.
    * **SDK Package:** e.g., `@aws-sdk/client-s3` for Node.js.
    * **Key Operations Used:** As listed in section 1.1 (e.g., `PutObjectCommand`, generating presigned URLs).
    * **Resource Identifiers:** Bucket names, etc., from `docs/environment-vars.md`.

## 4. Change Log

| Change        | Date       | Version | Description                                     | Author         |
|---------------|------------|---------|-------------------------------------------------|----------------|
| Initial draft | 2025-05-09 | 0.1     | First draft outlining internal and external APIs. | Architect Agent |

---