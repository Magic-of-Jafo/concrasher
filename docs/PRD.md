# ConventionCrasher Product Requirements Document (PRD)

## Intro

ConventionCrasher (conventioncrasher.com) is envisioned as the definitive online hub for the performance magic convention community. This document outlines the requirements for the Minimum Viable Product (MVP), which aims to solve information fragmentation, provide efficient event management tools, and foster a centralized community. The MVP will connect Organizers, Talent, Brands, and Hobbyists/Users, with a strict focus on performance magic.

## Goals and Context

-   **Project Objectives:**
    * Establish ConventionCrasher as a trusted, centralized platform for discovering performance magic conventions.
    * Provide Organizers with intuitive tools for managing convention listings and validating new event ideas.
    * Enable Talent and Brands to create and manage profiles to gain visibility within the community.
    * Offer Users (Hobbyists) easy ways to find conventions, engage with content, and connect with others.
    * Lay the foundation for a vibrant online community around performance magic conventions.
    * Champion local and regional conventions by providing equitable visibility.
-   **Measurable Outcomes:**
    * Reduced friction in discovering relevant conventions for Users.
    * Increased efficiency for Organizers in managing event information and gauging interest for new concepts.
    * Growth in the number of active Organizer, Talent, and Brand profiles.
    * Positive user feedback regarding ease of use, particularly for Organizers.
    * Demonstrable engagement with community features (forum posts, comments, reviews).
-   **Success Criteria:**
    * The platform is regularly used by members of the performance magic community to find and list conventions.
    * Organizers successfully use the Event Idea Validation tool to gather interest.
    * Core profile and listing management functionalities operate smoothly for all user roles.
    * Users can effectively search, filter, and discover conventions relevant to their interests.
    * Foundational community features are actively used.
    * The platform is perceived as supporting local and regional conventions.
-   **Key Performance Indicators (KPIs):**
    * Number of registered Users (Hobbyists, Organizers, Talent).
    * Number of created Brand profiles.
    * Number of active convention listings.
    * Number of "Proposed Conventions" created using the Event Idea Validation tool.
    * Number of "I'm Interested" indications on Proposed Conventions.
    * Average number of comments/reviews per convention.
    * User engagement metrics (e.g., time on site, pages per visit, forum activity).
    * Search query volume and success rate.
    * Organizer satisfaction score (if surveyed).

## Scope and Requirements (MVP / Current Version)

### Functional Requirements (High-Level)

-   **User Registration & Profile Management:**
    * Users can register for a basic "User/Hobbyist" account.
    * Registered users can apply for/activate "Organizer" or "Talent" roles.
    * Users can create and manage "Brand" profiles (linking their individual account as a manager).
    * Support for users holding multiple roles (e.g., Organizer and Talent).
    * Admin users can manage user roles and profiles.
    * Comprehensive profile data models for each role.
-   **Convention Listing Management (for Organizers):**
    * Organizers can create, read, update, and delete (CRUD) convention listings.
    * Listings include details such as name, dates, location, description, schedule, talent, associated brands, etc.
    * Organizers can manage ordered lists (e.g., event schedules, talent lists) using a drag-and-drop interface.
-   **Convention Discovery (for all Users):**
    * Users can search for conventions using various attributes (e.g., name, date, location, keywords, talent, brands).
    * Users can filter and sort convention search results.
    * Features to support the "Local-First" marketing angle (e.g., highlighting local/regional events).
-   **Event Idea Validation Tool (for Organizers):**
    * Organizers can create "Proposed Convention" listings to gauge interest.
    * Users can indicate non-binding interest ("I'm Interested") in Proposed Conventions.
    * Users can leave comments on Proposed Conventions.
-   **Talent Profile Management:**
    * Users with "Talent" role can create and manage their profiles, showcasing their skills, past events, etc.
    * Talent profiles are searchable and can be linked to convention listings.
-   **Brand Profile Management:**
    * Users can create and manage Brand profiles (e.g., for magic shops, manufacturers, publications).
    * Brand profiles are searchable and can be linked to convention listings.
-   **Community Features (MVP):**
    * Basic forum functionality for discussions related to performance magic conventions.
    * System for Users to leave comments and reviews on convention listings.
    * Basic moderation tools/considerations for forum and comments/reviews.
-   **Admin Functionality:**
    * User account management (role validation, suspension, etc.).
    * Content moderation oversight (forums, reviews, listings).
    * Platform configuration settings (if any for MVP).
-   **Utility Pages:**
    * Standard informational pages: About Us, Contact Us, Terms of Service, Privacy Policy, FAQ.

### Non-Functional Requirements (NFRs)

-   **Performance:**
    * The platform must be responsive with fast load times for pages and search results.
    * Efficient handling of data, especially for convention listings and searches.
-   **Scalability:**
    * Architecture must support growth in users, listings, and data.
    * Designed for eventual migration to a scalable cloud production environment.
-   **Reliability/Availability:**
    * High availability for core platform functionalities.
    * Graceful error handling and informative feedback to users.
-   **Security:**
    * Secure user authentication and authorization (Auth.js).
    * Role-based access control to ensure users can only access and modify appropriate data.
    * Protection against common web vulnerabilities.
    * Secure storage of user data.
-   **Maintainability:**
    * Codebase should be well-organized, documented, and easy to maintain, aligning with the "developer local-first" approach.
-   **Usability/Accessibility:**
    * The platform must be intuitive and easy to use, especially for Organizers managing event information.
    * Mandatory compliance with WCAG 2.2 Level AA accessibility standards.
    * Drag-and-drop interface for Organizers managing ordered lists must be user-friendly.
-   **Other Constraints:**
    * Strict focus on performance magic conventions only for the MVP.
    * Development approach must be "developer local-first" and cost-effective.
    * Architecture should not preclude future expansion to other niche convention types.

### User Experience (UX) Requirements (High-Level)

-   **Ease of Use for Organizers:** The primary UX goal is to make creating, managing, and updating event information significantly easier and more intuitive than existing alternatives. This includes seamless drag-and-drop functionality for schedules and talent lists.
-   **Intuitive Discovery:** Users should be able to easily find relevant conventions, talent, and brands with minimal effort through clear search, filtering, and Browse mechanisms.
-   **Clear Role Pathways:** The process for a standard User to activate or apply for Organizer or Talent roles, or to create/manage Brand profiles, must be clear and straightforward.
-   **Highlight Value of Live Attendance:** Features and content should subtly convey the unique benefits and excitement of attending conventions in person, without being overt.
-   **Consistent and Engaging Interface:** A modern, clean, and engaging interface that supports the specific needs of the performance magic community.
-   Detailed UI/UX specifications will be maintained in `docs/ui-ux-spec.md`.

### Integration Requirements (High-Level)

-   No external service integrations are mandated for the MVP, beyond standard identity providers if Auth.js is configured to use them (e.g., Google, Facebook login).

### Testing Requirements (High-Level)

-   The "developer local-first" approach necessitates robust local testing capabilities for all components (PostgreSQL, Prisma, Auth.js, file storage).
-   Comprehensive unit, integration, and end-to-end (E2E) tests are required.
-   Clear testing plans for migration from local development setup to a cloud production environment.
-   Accessibility testing against WCAG 2.2 Level AA.
-   Detailed testing strategy will be maintained in `docs/testing-strategy.md`.

## Epic Overview (MVP / Current Version)

-   **Epic 1: Core Platform Setup, User Authentication & Roles** - Goal: Establish the foundational project structure, local development environment, implement user registration, authentication (Auth.js), and the multi-role user model including admin capabilities for role management.
-   **Epic 2: Convention Listing & Discovery** - Goal: Enable Organizers to perform CRUD operations on convention listings and for all users to search, filter, and view convention details. Implement features supporting the "Local-First" marketing angle.
-   **Epic 3: Organizer Tools (Event Management & Idea Validation)** - Goal: Implement the drag-and-drop UX for Organizers to manage ordered lists within convention details. Develop the Event Idea Validation tool for Organizers to propose conventions and for Users to express interest and comment.
-   **Epic 4: Talent & Brand Profiles** - Goal: Enable users to create, manage, and showcase Talent and Brand profiles, and allow these profiles to be searched and linked to conventions.
-   **Epic 5: Community Features (MVP)** - Goal: Implement the MVP for the community forum and the convention commenting/review system, including basic moderation considerations.
-   **Epic 6: Utility Pages & Initial Content** - Goal: Create standard utility pages (About, Contact, TOS, Privacy, FAQ) and ensure essential content placeholders are ready.

## Key Reference Documents

-   `docs/project-brief.md` (This document is based on the provided "Project Manager Prompt")
-   `docs/architecture.md`
-   `docs/epic1.md`, `docs/epic2.md`, `docs/epic3.md`, `docs/epic4.md`, `docs/epic5.md`, `docs/epic6.md`
-   `docs/tech-stack.md`
-   `docs/api-reference.md`
-   `docs/testing-strategy.md`
-   `docs/ui-ux-spec.md`
-   `docs/data-models.md`

## Post-MVP / Future Enhancements

-   Expansion to support other niche convention types beyond performance magic.
-   Advanced community features (e.g., direct messaging, user groups).
-   Ticketing integration capabilities.
-   Mobile application development.
-   Advanced analytics for Organizers.
-   Integration with calendaring applications.

## Change Log

| Change        | Date       | Version | Description                  | Author         |
| ------------- | ---------- | ------- | ---------------------------- | -------------- |
| Initial Draft | 2025-05-09 | 0.1     | First draft based on Project Manager Prompt | Product Manager AI |

## Initial Architect Prompt

### Technical Infrastructure

-   **Starter Project/Template:** No specific starter template is mandated. The project will be built using Next.js.
-   **Hosting/Cloud Provider:** The live platform will eventually be deployed to a cloud provider. Specific provider (e.g., AWS, Vercel, Netlify) to be determined, but architecture should be cloud-agnostic where possible. Vercel/Netlify are good candidates for Next.js.
-   **Frontend Platform:** Next.js (React).
-   **Backend Platform:** Next.js API routes / Serverless functions. Prisma as ORM.
-   **Database Requirements:**
    * **Local Development:** PostgreSQL.
    * **Production:** Managed PostgreSQL service (e.g., AWS RDS, Supabase, Neon, Railway).
    * Prisma will be used for database interaction.
-   **Authentication:** Auth.js (NextAuth.js) for user authentication and session management.
-   **Media Storage:**
    * **Local Development:** Local file system.
    * **Production:** Cloud-based object storage (e.g., AWS S3, Cloudinary, Backblaze B2).

### Technical Constraints

-   **Developer Local-First Approach:** Core requirement. The entire system (frontend, backend, database, auth, media storage) must be runnable locally for development and testing.
-   **Performance Magic Focus (MVP):** All features and data models must be tailored to this niche for the MVP.
-   **WCAG 2.2 Level AA Compliance:** Mandatory for all user-facing interfaces.
-   **Drag-and-Drop UX for Organizers:** Requires a frontend solution that is both robust and user-friendly. Technical feasibility for MVP needs to be confirmed.
-   The architecture must be designed to facilitate a smooth migration from the local-first development setup to a scalable cloud production environment for each component (database, auth, media storage).

### Deployment Considerations

-   **Local Development:** Full local deployability is key.
-   **Cloud Deployment:** Plan for CI/CD pipelines for automated testing and deployment to staging and production environments.
-   The platform should support a cost-effective deployment strategy, especially in the early stages.

### Local Development & Testing Requirements

-   **Environment:** Developers must be able to set up and run the complete application stack (Next.js app, PostgreSQL database via Docker or local install, local file storage for media) locally with minimal friction.
-   **Database Management:** Use Prisma for schema migrations and database interaction. Seed scripts for populating test data will be necessary.
-   **API Testing:** Local endpoints must be testable. Consider tools like Postman or automated API tests.
-   **Storage Emulation:** Provide clear instructions or scripts for managing local media files in a way that mimics cloud storage behavior (e.g., consistent paths, potential use of MinIO for S3 compatibility locally if deemed necessary later, but simple file system for MVP).
-   Robust plans and potentially scripts for migrating data and configurations from local PostgreSQL to a cloud-managed PostgreSQL instance, and from local file storage to cloud media storage.

### Other Technical Considerations

-   **User Role Architecture:** Design database schemas and business logic to robustly support distinct user roles (User/Hobbyist, Organizer, Talent, Brand, Admin) and the transitions/links between them (e.g., a User managing multiple Brand profiles, a User being both Organizer and Talent). Consider how Auth.js roles/permissions will integrate with the application's role system.
-   **Event Idea Validation Tool:** Ensure the data model clearly distinguishes "Proposed Conventions" from actual "Convention Listings" and captures user interest effectively.
-   **Community Features (Forum & Comments/Reviews):** Design for basic functionality in MVP, including considerations for content moderation hooks or flags.
-   **Scalability for Future:** While MVP is focused, architectural choices should not severely hinder future scalability or the potential to expand to other convention niches post-MVP.
-   **Cost-Effectiveness:** Align technology choices with the need for a cost-effective solution, especially for cloud services in production. Open-source tools are preferred.
-   **Data Integrity:** Ensure mechanisms for maintaining data integrity, especially with user-generated content and relationships between entities (conventions, users, talent, brands).
-   **Search Functionality:** Design data structures and query mechanisms to support efficient and comprehensive search and filtering across conventions, talent, and brands. Consider indexing strategies for PostgreSQL.