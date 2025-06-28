```markdown
# ConventionCrasher Product Requirements Document (PRD)

## Intro

ConventionCrasher (conventioncrasher.com) is envisioned as the definitive online hub for the performance magic convention community. This document outlines the requirements for the Minimum Viable Product (MVP). The MVP initially aimed to solve information fragmentation with basic event management tools. It has now evolved to incorporate a significantly enhanced and comprehensive convention management system for Organizers from the outset, empowering them with detailed control over their event presentation. The MVP will connect Organizers, Talent, Brands, and Hobbyists/Users, with a strict focus on performance magic.

## Goals and Context

-   **Project Objectives:**
    * Establish ConventionCrasher as a trusted, centralized platform for discovering performance magic conventions.
    * Provide Organizers with exceptionally intuitive, powerful, and comprehensive tools for creating, managing, and publishing highly detailed convention listings, thereby significantly improving event management efficiency and richness of information.
    * Enable Talent and Brands to create and manage profiles to gain visibility within the community.
    * Offer Users (Hobbyists) easy ways to find conventions, access rich and detailed event information, and connect with others.
    * Lay the foundation for a vibrant online community around performance magic conventions.
    * Champion local and regional conventions by providing equitable visibility.
-   **Measurable Outcomes:**
    * Reduced friction in discovering relevant conventions for Users due to richer and more structured event details.
    * Significantly increased efficiency and satisfaction for Organizers in managing all aspects of their event information through a comprehensive, centralized, tabbed platform interface.
    * Growth in the number of active Organizer, Talent, and Brand profiles.
    * Positive user feedback regarding ease of use, power, and comprehensiveness of the Organizer tools.
    * Demonstrable engagement with community features (forum posts, comments, reviews).
-   **Success Criteria:**
    * The platform is regularly used by members of the performance magic community to find and list highly detailed conventions.
    * Organizers actively utilize the full breadth of the new 8-tab convention editor interface for managing their convention details.
    * Core profile and listing management functionalities (including the advanced convention editor) operate smoothly for all user roles.
    * Users can effectively search, filter, and discover conventions relevant to their interests based on the detailed information provided.
    * Foundational community features are actively used.
    * The platform is perceived as supporting local and regional conventions.
-   **Key Performance Indicators (KPIs):**
    * Number of registered Users (Hobbyists, Organizers, Talent).
    * Number of created Brand profiles.
    * Number of active convention listings, and average completeness score of these listings (e.g., percentage of optional fields/tabs utilized).
    * Number of "Proposed Conventions" created using the Event Idea Validation tool.
    * Number of "I'm Interested" indications on Proposed Conventions.
    * Average number of comments/reviews per convention.
    * User engagement metrics (e.g., time on site, pages per visit, usage of advanced schedule/pricing features by Organizers).
    * Search query volume and success rate, potentially including searches for specific details now available (e.g., specific event types within a convention).
    * Organizer satisfaction score (if surveyed), specifically regarding the convention management tools' comprehensiveness and usability.

## Scope and Requirements (MVP / Current Version)

### Functional Requirements (High-Level)

-   **User Registration & Profile Management:**
    * Users can register for a basic "User/Hobbyist" account.
    * Registered users can apply for/activate "Organizer" or "Talent" roles.
    * Users can create and manage "Brand" profiles.
    * Support for users holding multiple roles.
    * Admin users can manage user roles and profiles.
-   **Convention Listing Management (for Organizers) - Comprehensive Tabbed Interface:**
    * Organizers can create, read, update, and delete (CRUD) convention listings through a **multi-tabbed interface**. This advanced interface replaces earlier simpler forms and allows detailed management of:
        * **Basic Info & Series:** Core convention name (for slug), link to a Convention Series, start/end dates (with "One-Day Event" toggle and TBD/blank date option), location (city/state/country), main and short descriptions, cover image, and profile image (can default from Series logo).
        * **Pricing:** Definition of multiple Price Tiers (label, amount) and sophisticated date-based Price Discounts applicable to these tiers, with dynamic row additions for flexibility. Default currency will be USD, configurable per convention via the "Settings" tab.
        * **Venue/Hotel:** Detailed information for the primary event Venue, including a mechanism to specify if the primary guest hotel is separate. If separate, or if additional hotels are needed, full details (name, address, contact, image, group rate info, parking, transport, accessibility) can be provided for multiple hotels.
        * **Talent:** Linking of existing "Talent" profiles (Users with the Talent role) to the convention for showcasing performers, lecturers, etc.
        * **Schedule:** A dynamic, drag-and-drop interface for building the event schedule. This includes creating event "cards" with attributes like name, event type (predefined and custom, reusable custom types per convention), description, linked Talent/Brands, specific location (from entered Venues/Hotels plus room details), start time (via drag-and-drop), duration (adjustable on timeline), and optional multi-tiered extra fees per event. Supports simultaneous events. Designed for front-page ticker integration.
        * **Dealers:** Listing of dealers (who can be existing Users, Talent, or Brands) with options for Organizer overrides on displayed information for the specific convention.
        * **Media:** Upload of multiple promotional images and linking to YouTube/Vimeo videos, with captions.
        * **Settings:** Convention-specific settings, including default currency for pricing and event timezone.
        * **FAQ:** (Implied capability to add convention-specific FAQs if a dedicated tab for this is developed as part of the editor).
-   **Convention Discovery (for all Users):**
    * Users can search for conventions using various attributes (e.g., name, date, location, keywords from rich descriptions, series).
    * Users can filter and sort convention search results.
    * Public convention detail pages will display all the rich, structured information provided by Organizers from the tabbed interface (including detailed schedules, pricing breakdowns, venue/hotel info, talent/dealer lists, media) in a clear, organized, and user-friendly manner.
    * Features to support the "Local-First" marketing angle.
-   **Event Idea Validation Tool (for Organizers):**
    * Organizers can create "Proposed Convention" listings to gauge interest.
    * Users can indicate non-binding interest and leave comments on Proposed Conventions.
-   **Talent Profile Management:**
    * Users with "Talent" role can create and manage their profiles.
    * Talent profiles are searchable and can be linked to convention listings, schedule events, and dealer lists.
-   **Brand Profile Management:**
    * Users can create and manage Brand profiles.
    * Brand profiles are searchable and can be linked to convention listings, schedule events, and dealer lists.
-   **Community Features (MVP):**
    * Basic forum functionality.
    * System for Users to leave comments and reviews on convention listings.
    * Basic moderation tools.
-   **Admin Functionality:**
    * User account and role management.
    * Content moderation oversight.
    * Management (View, Edit via the full 8-tabbed interface, Delete) of all convention listings.
-   **Utility Pages:**
    * About Us, Contact Us, Terms of Service, Privacy Policy, FAQ.

### Non-Functional Requirements (NFRs)

-   **Performance:**
    * The platform must be responsive with fast load times for pages, search results, and especially the public convention detail pages which will now display extensive, rich content.
    * The multi-tabbed convention editor interface, with its dynamic elements (e.g., drag-and-drop schedule, dynamically added pricing rows) and potentially large data sets per convention, must remain highly responsive and provide a smooth experience for Organizers.
    * Efficient data handling (queries, updates) for complex, interconnected convention structures.
-   **Scalability:**
    * Architecture must support growth in users, listings, the complexity of convention data, and overall traffic.
    * Designed for eventual migration to a scalable cloud production environment.
-   **Reliability/Availability:**
    * High availability for core platform functionalities.
    * Graceful error handling and informative feedback to users, especially within the complex forms of the convention editor. Transactional integrity for saving complex convention data.
-   **Security:**
    * Secure user authentication and authorization (Auth.js).
    * Role-based access control.
    * Protection against common web vulnerabilities.
    * Secure storage of user data and all convention data.
-   **Maintainability:**
    * Codebase should be well-organized, documented, and easy to maintain, especially given the increased complexity of the convention management module.
-   **Usability/Accessibility:**
    * The platform must be intuitive and easy to use. **Crucially, the new comprehensive, 8-tabbed convention editor must be designed with exceptional intuitiveness and efficiency for Organizers. Despite its power and data richness, it must avoid cognitive overload and streamline the process of detailed event setup.**
    * Mandatory compliance with **WCAG 2.2 Level AA** accessibility standards for all user-facing interfaces. This includes specific attention to all dynamic elements of the convention editor: tab navigation, drag-and-drop schedule functionality (requiring keyboard alternatives), conditional form sections, dynamic row additions for pricing/fees, and all form inputs/controls.
-   **Other Constraints:**
    * Strict focus on performance magic conventions only for the MVP.
    * Development approach must be "developer local-first" and cost-effective.
    * Architecture should not preclude future expansion to other niche convention types.

### User Experience (UX) Requirements (High-Level)

-   **Ease of Use for Organizers:** This remains a paramount UX goal. The design of the new comprehensive 8-tab convention editor, while offering extensive features, must prioritize clarity, intuitive workflows, logical information grouping, and overall efficiency to make the detailed event management process significantly easier and more empowering than alternatives.
-   **Intuitive Discovery:** Users should be able to easily find relevant conventions and quickly understand event offerings due to the rich, well-structured, and consistently presented information on convention detail pages.
-   **Clear Role Pathways:** (As previously defined)
-   **Highlight Value of Live Attendance:** (As previously defined)
-   **Consistent and Engaging Interface:** (As previously defined, with Material-UI as a base component library)
-   Detailed UI/UX specifications will be maintained in `docs/ui-ux.md`.

### Integration Requirements (High-Level)

-   Auth.js for authentication.
-   No other external service integrations are mandated for the MVP.

### Testing Requirements (High-Level)

-   Robust local testing capabilities for all components.
-   Comprehensive unit, integration, and end-to-end (E2E) tests, with particular focus on the complex logic, data validation, and state management within the 8-tab convention editor and the persistence of its diverse data.
-   Thorough testing of the public display of all new convention details.
-   Accessibility testing against WCAG 2.2 Level AA across all new interfaces and interactions.
-   Clear testing plans for migration to cloud production.
-   Detailed testing strategy will be maintained in `docs/testing-strategy.md`.

## Epic Overview (MVP / Current Version)

-   **Epic 1: Core Platform Setup, User Authentication & Roles** - Goal: Establish the foundational project structure, local development environment, implement user registration, authentication (Auth.js), and the multi-role user model including admin capabilities for role management.
-   **Epic 2: Convention Listing & Discovery (Revised Goal)** - Goal: *(Phase 1)* Establish basic functionality for Organizers to create, edit, and manage core convention listings, and for users to discover and view these listings. *(Phase 2)* Significantly enhance and revamp convention management by implementing a comprehensive, 8-tabbed interface for Organizers to create and edit highly detailed listings, capturing extensive information (Basic Info, Series, Pricing, Venue/Hotel, Talent, Schedule, Dealers, Media, Settings). Enable all users to discover and view these enriched convention details. Implement features supporting the 'Local-First' marketing angle.
-   **Epic 3: Organizer Tools (Event Management & Idea Validation)** - Goal: Develop the Event Idea Validation tool for Organizers to propose conventions and for Users to express interest and comment. *(Note: The comprehensive schedule management, including drag-and-drop UX, is now a core part of the convention editor within Epic 2, Phase 2).*
-   **Epic 4: Talent & Brand Profiles** - Goal: Enable users to create, manage, and showcase Talent and Brand profiles, and allow these profiles to be searched. These profiles will be linkable within convention listings (via the "Talent" and "Dealers" tabs in the Epic 2 convention editor) and schedule events.
-   **Epic 5: Community Features (MVP)** - Goal: Implement the MVP for the community forum and the convention commenting/review system, including basic moderation considerations.
-   **Epic 6: Utility Pages & Initial Content** - Goal: Create standard utility pages (About, Contact, TOS, Privacy, FAQ) and ensure essential content placeholders are ready.

## Key Reference Documents

-   `docs/project-brief.md`
-   `docs/architecture.md` (Will need significant review/updates by Architect based on these PRD changes)
-   `docs/epic1.md`, `docs/epic2-revised-phased.md`, `docs/epic3.md`, `docs/epic4.md`, `docs/epic5.md`, `docs/epic6.md`
-   `docs/tech-stack.md`
-   `docs/api-reference.md` (Will need significant updates for new convention APIs)
-   `docs/testing-strategy.md`
-   `docs/ui-ux.md` (Requires significant updates for convention editor and display)
-   `docs/data-models-detailed.md` (New document to be created or significantly expanded to detail the complex new convention data structures)

## Post-MVP / Future Enhancements

-   Expansion to support other niche convention types.
-   Advanced community features (direct messaging, groups).
-   Ticketing integration.
-   Mobile application.
-   Advanced analytics for Organizers.
-   Google Maps API integration for dynamic venue mapping.
-   Advanced search/filtering for conventions (e.g., by specific event types, talent participating, price ranges).
-   Organizer-configurable FAQ section per convention (if not in MVP via "FAQ" tab).

## Change Log

| Change                                               | Date       | Version | Description                                                                                                                                                                                                                                                                 | Author             |
| ---------------------------------------------------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Initial Draft                                        | 2025-05-09 | 0.1     | First draft based on Project Manager Prompt.                                                                                                                                                                                                                                | Product Manager AI |
| Major Revision to Convention Management (Attempt 1)  | 2025-05-13 | 0.2     | Expanded convention listing with a new 8-tab interface from Epic 2.2. (Superseded by v0.3)                                                                                                                                                                                      | User & PM AI       |
| Phased Convention Management Revamp                  | 2025-05-13 | 0.3     | Restructured convention management in Epic 2 into two phases. Phase 1 represents original simple functionality. Phase 2 introduces the 8-tab comprehensive editor as a major upgrade, significantly expanding data models, APIs, and UX. Functional Requirements, Epic 2 Goal, and Initial Architect Prompt updated accordingly. | User & PM AI       |

## Initial Architect Prompt

### Technical Infrastructure

-   **Starter Project/Template:** Next.js.
-   **Hosting/Cloud Provider:** Eventual cloud deployment (Provider TBD, e.g., Vercel, AWS).
-   **Frontend Platform:** Next.js (React). Material-UI chosen as base component library.
-   **Backend Platform:** Next.js API routes / Server Actions. Prisma as ORM.
-   **Database Requirements (Significantly Expanded for Phase 2):**
    * **Local Development:** PostgreSQL.
    * **Production:** Managed PostgreSQL service.
    * **Key Data Models (Illustrative - refer to revised Epic 2.1 and `docs/data-models-detailed.md` for full specification):**
        * `User`, `Role`, `UserRole` (as previously defined).
        * `ConventionSeries`: (name, logo, organizer link, etc.).
        * `Convention`: Core entity, heavily expanded for Phase 2. Links to Series. Fields for `name`, `slug`, comprehensive date logic (`startDate`, `endDate`, `isOneDayEvent` flag, `areDatesTBD` flag), location (city, state, country), descriptions (main, short), images (cover, profile), organizer link, status, `currency` (from `ConventionSetting`). Will have relations to numerous new tables for Phase 2 features.
        * `PriceTier`: (convention_id, label, amount, order).
        * `PriceDiscount`: (convention_id, cutoff_date, price_tier_id, discounted_amount).
        * `Venue`: (Primary venue for a convention: convention_id, name, `isPrimaryHotelSeparate` flag, detailed address, contact, image, amenities like parking/transport/accessibility, group rate info).
        * `Hotel`: (Guest accommodation, linked to convention, supports multiple: `isPrimaryAccommodation` flag, name, detailed address, contact, image, group rate info, display order).
        * `ConventionTalentLink`: (convention_id, talent_user_id, role_at_convention).
        * `ScheduleEvent`: (convention_id, name, `eventType` (enum + custom string), description, `startTime` (datetime), `durationMinutes`, location details linking to Venue/Hotel + custom room field, links to talent/brands).
        * `ScheduleEventFeeTier`: (schedule_event_id, label, amount, order).
        * `ConventionDealerLink`: (convention_id, `profileType` (enum: USER, TALENT, BRAND), linked_profile_id, display_name_override, description_override, order).
        * `ConventionMedia`: (convention_id, `mediaType` (enum: IMAGE, VIDEO_LINK), url, caption, order).
        * `ConventionFAQItem`: (convention_id, question, answer, order) - For convention-specific FAQ tab.
        * `ConventionSetting`: (convention_id, `key` (e.g., 'currency', 'timezone'), `value`).
        * Plus other supporting tables/enums as detailed in revised Epic 2.1.
-   **Authentication:** Auth.js (NextAuth.js).
-   **Media Storage:**
    * **Local Development:** Local file system.
    * **Production:** Cloud-based object storage (e.g., AWS S3). Must support multiple image types and quantities per convention (cover, profile, venue(s), hotel(s), media gallery images).

### Technical Constraints

-   Developer Local-First Approach.
-   Performance Magic Focus (MVP).
-   **WCAG 2.2 Level AA Compliance:** Mandatory, especially for the new complex 8-tab convention editor and all its interactive elements.
-   **Drag-and-Drop UX for Organizers:** Required for the Schedule tab; must be highly usable and accessible.
-   **Data Integrity & Validation:** Robust server-side validation and transactional integrity are critical for saving complex, multi-tab convention data.
-   Smooth migration path from local dev setup to cloud production, including any data model migrations between Phase 1 and Phase 2 if applicable.

### API Design Considerations (Revised)
-   APIs for Convention Create/Update will need to handle deeply nested and structured data corresponding to the 8 tabs and their numerous fields/sub-entities.
-   Design should consider strategies for partial saves (e.g., per tab if feasible and user-friendly) versus a single large save operation for the entire convention form. This has UX implications for data loss prevention.
-   Ensure APIs are granular enough to support efficient updates to individual components of a convention (e.g., adding a single schedule event, updating a price tier) without requiring re-submission of all data.
-   Optimize data retrieval APIs for the public convention detail page to efficiently fetch and structure all related data for the rich display. This might involve complex joins or multiple optimized queries.
-   Versioning or clear distinction between APIs supporting the "Phase 1" simple convention model (if any remain in use or for data migration) and the new "Phase 2" advanced model.

### Deployment Considerations

-   Local deployability essential.
-   CI/CD for cloud environments (staging, production).
-   Cost-effective deployment strategies.

### Local Development & Testing Requirements

-   Full local stack runnable (Next.js, PostgreSQL, local file storage).
-   Prisma for schema management and migrations (including potential migrations from a simpler Phase 1 schema to the Phase 2 schema). Seed scripts will be essential for populating test data for the complex convention structures.
-   Robust API testing (automated and manual) for the complex CRUD operations involved in managing advanced convention data.
-   Comprehensive frontend testing (unit, integration, E2E) for the 8-tab convention editor logic, dynamic form elements, state management, and data persistence through the new APIs.

### Other Technical Considerations

-   User Role Architecture (as previously defined; Organizer role now interacts with a much more complex feature set).
-   Event Idea Validation Tool (remains a separate but key Organizer tool).
-   Community Features (Forum & Comments/Reviews).
-   Scalability for future growth in data complexity and volume.
-   Cost-Effectiveness.
-   Search Functionality will need to index the new rich data fields from the advanced convention model for effective and detailed discovery. Consideration for full-text search capabilities on descriptions, schedules, etc.
-   Ticker Feature Integration: The `ScheduleEvent` data (`startTime`, `name`) needs to be easily queryable in real-time or near real-time to support the planned front-page ticker.

```