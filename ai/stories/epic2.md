# Epic 2: Convention Listing & Discovery (Revised with Phased Enhancements)

**Goal:**
*(Phase 1)* To establish basic functionality for Organizers to create, edit, and manage core convention listings, and for users to discover and view these listings.
*(Phase 2)* To then significantly enhance and revamp convention management by implementing a comprehensive, tabbed interface for Organizers to create and edit highly detailed listings. This includes capturing extensive information across basic details, series linkage, complex pricing, venue/hotel specifics, talent associations, dynamic schedules, dealer information, media, and settings. This phase also aims to enable all users to discover and view these enriched convention details, providing Organizers with an exceptionally powerful tool and addressing the need for efficient, detailed event management.

## Story List

---
**PHASE 1: Basic Convention Management (Assumed largely complete or in testing)**
---

### Story 2.1: (Original) Basic Convention Data Model & CRUD API
- **User Story / Goal:** Technical Story - To define a simple `Convention` data model in Prisma for core details (name, dates, location, description) and implement basic API endpoints for CRUD operations, accessible to Organizers for their own conventions and Admins.
- **Detailed Requirements:**
    - Define initial `Convention` model (Prisma): Fields for `name`, `startDate`, `endDate`, `city`, `state`, `country`, `description`, `organizerUserId` (FK to User).
    - Implement basic API endpoints (e.g., `/api/conventions`) for Create, Read (list and single), Update, Delete.
    - API protection: Organizers manage own; Admins manage all.
- **Acceptance Criteria (ACs):**
  - AC1: Prisma schema for basic `Convention` model is defined; migrations apply.
  - AC2: Organizer can create a new convention via API.
  - AC3: Users can retrieve convention lists and single convention details via API.
  - AC4: Organizer/Admin can update an existing convention via API.
  - AC5: Organizer/Admin can delete a convention via API.

---

### Story 2.2: (Original) Organizer - Create Convention Listing (Simple Form)
- **User Story / Goal:** As an Organizer, I want a simple form to create a new convention listing with essential details, so that I can quickly get my event on the platform.
- **Detailed Requirements:**
  - UI form for Organizers with fields matching the basic `Convention` model (name, dates, location, description).
  - Client-side and server-side validation.
  - Submission calls the `POST /api/conventions` endpoint. `organizerUserId` set automatically.
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can access and submit the "Create Convention" simple form.
  - AC2: A new basic convention record is created.
  - AC3: Appropriate feedback/redirect on success/error.

---

### Story 2.3: (Original) Public - View Convention Listing Details (Simple View)
- **User Story / Goal:** As any user, I want to view the basic details for a specific convention, so that I can learn about it.
- **Detailed Requirements:**
  - Public page to display basic details of a convention (name, dates, location, description).
- **Acceptance Criteria (ACs):**
  - AC1: Any user can view the detail page for a convention.
  - AC2: Basic convention details are displayed clearly.

---

### Story 2.4: (Original) Public - List Conventions & Basic Filtering/Sorting (Simple)
- **User Story / Goal:** As any user, I want to see a list of conventions with basic filtering (e.g., by date) and sorting, so that I can discover events.
- **Detailed Requirements:**
  - Public page listing conventions with summary info (name, date, location snippet).
  - Basic filters (e.g., date range).
  - Basic sorting (e.g., start date).
- **Acceptance Criteria (ACs):**
  - AC1: Any user can view the convention list page.
  - AC2: Conventions are listed with links to their detail page.
  - AC3: Basic filtering and sorting function correctly.

---

### Story 2.5: (Original) Organizer - Edit & Update Own Convention Listing (Simple Form)
- **User Story / Goal:** As an Organizer, I want to edit and update the details of convention listings that I own, so that I can keep the information accurate and current.
- **Detailed Requirements:**
    - On the convention detail page (for Organizers viewing their own events) or a dedicated Organizer dashboard, provide an "Edit" option.
    - The "Edit" option leads to a form pre-filled with the existing convention data (similar to the create form from original Story 2.2).
    - Organizers can only edit conventions where their `organizerUserId` matches the convention's `organizerUserId`.
    - On submission, the form data should call the `PUT /api/conventions/{id}` endpoint.
    - Provide clear feedback on successful update or errors.
- **Acceptance Criteria (ACs):**
  - AC1: An Organizer can find and access an "Edit" function for conventions they manage.
  - AC2: The edit form is pre-populated with the convention's current details.
  - AC3: Organizer can successfully submit changes, and the convention record is updated in the database (for the simple model).
  - AC4: Updated information is reflected on the (simple) convention detail page.
  - AC5: An Organizer cannot edit conventions they do not own.

---
**PHASE 2: Advanced Convention Management & Rich Listings (New Revamp)**
*(The following stories introduce the comprehensive tabbed interface and expanded data capabilities. These will replace the UIs from original 2.2 & 2.5 and require significant changes to original 2.1 & 2.3).*
---

### Story 2.6: Upgrade Convention Data Model & Core APIs for Advanced Features (NEW)
- **User Story / Goal:** Technical Story - To significantly expand and refactor the Prisma data models (building upon the original Story 2.1 model) to support the comprehensive data requirements of the new 8-tab convention editor. This includes defining all new entities (Series, Price Tiers/Discounts, Venues/Hotels, Schedule Events with fees, Dealer links, Media, FAQs, Settings) and their complex relationships. Update/Create core API endpoints to handle CRUD operations for this rich, interconnected data structure with transactional integrity.
- **Detailed Requirements:**
    - Define/Revise Prisma Schemas for all entities as detailed in the "Story 2.1 (Heavily Revised)" section of the *previous comprehensive update I provided*. This includes: `ConventionSeries`, `Convention` (heavily expanded), `PriceTier`, `PriceDiscount`, `Venue`, `Hotel`, `ConventionTalentLink`, `ScheduleEvent`, `ScheduleEventFeeTier`, `ScheduleEventTalentLink`, `ScheduleEventBrandLink`, `ConventionDealerLink`, `ConventionMedia`, `ConventionFAQItem`, `ConventionSetting`.
    - Implement/Upgrade API endpoints (building upon or replacing original Story 2.1 APIs) for managing a `Convention` and all its new related entities.
    - Ensure APIs handle validation for all new fields, interdependencies, and provide for transactional or batched updates for consistency when saving data from the complex tabbed interface.
- **Acceptance Criteria (ACs):**
  - AC1: All Prisma schemas for the *advanced* convention data structure are defined, and migrations (from the basic model to the advanced model) apply successfully.
  - AC2: API allows creation of a full advanced convention object with its related nested entities.
  - AC3: API allows retrieval of a full advanced convention object including all its related data.
  - AC4: API allows granular updates to specific parts of an advanced convention.
  - AC5: API enforces all new data validation rules and maintains integrity.
  - AC6: Organizer/Admin role permissions for these advanced CRUD operations are correctly enforced.

---

### Story 2.7: Implement Tabbed Convention Editor - Basic Info & Series Tab (NEW)
- **User Story / Goal:** As an Organizer, I want to use the "Basic Info & Series" tab within the new convention editor to manage core details like series linkage, convention name, comprehensive date handling (including one-day & TBD options), location, descriptions, and primary images, so that the fundamental identity of my event is clearly defined.
- **Detailed Requirements:** (As per "Tab 1: Basic Info & Series" from your detailed input / my previous full revamp Story 2.2)
    - Convention Series selection/creation.
    - Convention Name (for slug).
    - Start/End Date fields with "One-Day Event" toggle & TBD/blank date logic.
    - City/State/Country.
    - Main/Short Description.
    - Cover/Profile Image Uploads.
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can access and interact with all fields and controls in the "Basic Info & Series" tab.
  - AC2: All data entered (series link, name, dates with TBD/one-day logic, location, descriptions, images) is correctly saved to the expanded data model via the new APIs.
  - AC3: Form validations specific to this tab (e.g., required name, valid dates) are functional.
  - AC4: Existing data for this tab is correctly loaded when editing a convention.

---

### Story 2.8: Implement Tabbed Convention Editor - Pricing Tab (NEW)
- **User Story / Goal:** As an Organizer, I want to use the "Pricing" tab to define multiple Price Tiers and sophisticated date-based Price Discounts for my convention, so that I can flexibly manage my event's pricing structure.
- **Detailed Requirements:** (As per "Tab 2: Pricing" from your detailed input / my previous full revamp Story 2.2)
    - Dynamic Price Tiers (Label, Amount, add/remove/reorder).
    - Dynamic Price Discounts (Cutoff Date, linked Price Tier, Discounted Amount, add/remove tiers per date, add/remove discount dates). Discounts only active after Tiers are saved.
    - Currency display based on convention settings.
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can dynamically add, edit, reorder, and remove Price Tiers; changes are saved.
  - AC2: Price Discounts section is correctly enabled/disabled based on Tier save state.
  - AC3: Organizer can add multiple Discount Dates, and for each date, link multiple Price Tiers with specific discounted amounts (enforcing no duplicate tiers per discount date). All discount data is saved.
  - AC4: All pricing data loads correctly for editing.

---

### Story 2.9: Implement Tabbed Convention Editor - Venue/Hotel Tab (NEW)
- **User Story / Goal:** As an Organizer, I want to use the "Venue/Hotel" tab to provide detailed information about the primary event venue and any associated guest hotels, including addresses, contacts, images, amenities, and group rates, so attendees have comprehensive lodging and location information.
- **Detailed Requirements:** (As per "Tab 3: Venue/Hotel" from your detailed input / my previous full revamp Story 2.2)
    - Primary Venue details.
    - Checkbox logic for "Guests will NOT be staying at this Venue" altering subsequent sections.
    - Conditional Primary Hotel Information section.
    - Dynamic addition of multiple Additional Hotels with full details.
    - Location/Access info (Parking, Transport, Accessibility).
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can input all details for Primary Venue and save.
  - AC2: Checkbox logic for separate Primary Hotel correctly shows/hides relevant form sections and saves data appropriately.
  - AC3: Multiple Additional Hotels with all details can be dynamically added, edited, removed, and saved.
  - AC4: All venue/hotel data loads correctly for editing.

---

### Story 2.10: Implement Tabbed Convention Editor - Talent Tab (NEW)
- **User Story / Goal:** As an Organizer, I want to use the "Talent" tab to search for and link existing Talent profiles from the platform to my convention, so that featured performers and lecturers are showcased.
- **Detailed Requirements:** (As per "Tab 4: Talent" from your detailed input / my previous full revamp Story 2.2)
    - Search and link existing Talent profiles.
    - Display linked Talent with key info.
    - Ability to remove linked Talent.
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can search for platform Talent by name/skill and link them to the convention.
  - AC2: Linked Talent are displayed in the tab and saved correctly.
  - AC3: Linked Talent can be removed.

---

### Story 2.11: Implement Tabbed Convention Editor - Schedule Tab (NEW)
- **User Story / Goal:** As an Organizer, I want to use the highly interactive "Schedule" tab to visually build my convention's schedule by creating detailed event cards, assigning types, linking talent/brands, defining locations and fees, and arranging them on a drag-and-drop timeline that supports simultaneous events, so that I can easily manage and present a complex schedule.
- **Detailed Requirements:** (As per "Tab 5: Schedule" from your detailed input / my previous full revamp Story 2.2. This effectively incorporates & expands original Epic 3 / Story 3.2).
    - Visual timeline/calendar.
    - Event Card creation/editing (Name, Type with custom, Desc, Link Talent/Brands, Location from Venues/Hotels + custom room, multi-tier Extra Fees).
    - Drag-and-drop placement, Start Time set by drop, Duration by resizing.
    - Support for simultaneous events. Event duplication.
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can create Schedule Event cards with all specified details.
  - AC2: Events can be dragged/dropped onto the schedule; Start Time and Duration are correctly saved to the DB.
  - AC3: Interface correctly displays and allows management of simultaneous events.
  - AC4: Events can be duplicated and edited. Extra fees for events are saved.
  - AC5: Schedule data loads correctly for editing. The D&D interface is accessible (WCAG 2.2 AA).

---

### Story 2.12: Implement Tabbed Convention Editor - Dealers Tab (NEW)
- **User Story / Goal:** As an Organizer, I want to use the "Dealers" tab to list businesses or individuals who will be dealers at my convention, linking them from existing User, Talent, or Brand profiles, and optionally overriding their display information for this specific event.
- **Detailed Requirements:** (As per "Tab 6: Dealers" from your detailed input / my previous full revamp Story 2.2)
    - Search and link User/Talent/Brand profiles as dealers.
    - Allow Organizer overrides for dealer display name/description for this convention.
    - List added dealers with edit/remove options.
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can search and link existing profiles (User, Talent, Brand) as dealers.
  - AC2: Organizer-defined overrides for dealer display info are saved.
  - AC3: List of dealers is correctly saved and displayed in the tab.

---

### Story 2.13: Implement Tabbed Convention Editor - Media Tab (NEW)
- **User Story / Goal:** As an Organizer, I want to use the "Media" tab to upload multiple promotional images and add links to YouTube/Vimeo videos for my convention, so I can enhance its public listing with visual content.
- **Detailed Requirements:** (As per "Tab 7: Media" from your detailed input / my previous full revamp Story 2.2)
    - Multi-image upload with captions and reordering.
    - Add multiple video links (YouTube/Vimeo) with captions.
    - Deferred from Story 2.7:
      - Image upload functionality for cover and profile images
      - ImageUploader component implementation
      - File input, preview, and validation
      - Upload progress and error handling
      - Integration with object storage
      - Image URL management in convention data
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can upload multiple promotional images with captions; images are saved and orderable.
  - AC2: Organizer can add multiple YouTube/Vimeo links with captions; links are saved.
  - AC3: Media items load correctly for editing/viewing within the tab.
  - AC4: Cover and profile image upload functionality works as specified in Story 2.7.

---

### Story 2.14: Implement Tabbed Convention Editor - Settings Tab (NEW)
- **User Story / Goal:** As an Organizer, I want to use the "Settings" tab to configure convention-specific options, such as the default currency for pricing and the primary timezone for the event schedule, so these are applied correctly throughout the listing.
- **Detailed Requirements:** (As per "Tab 8: Settings" from your detailed input / my previous full revamp Story 2.2)
    - Select Default Currency (USD, EUR, GBP, CAD, AUD, etc.).
    - Select Timezone.
    - (Other settings TBD).
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can select and save the default currency for the convention.
  - AC2: Organizer can select and save the primary timezone for the convention.
  - AC3: These settings are correctly referenced and applied in other relevant tabs (e.g., currency in Pricing, timezone for Schedule display).

---

### Story 2.15: Revamp Public Convention Detail Page for Advanced Features (NEW)
- **User Story / Goal:** As any user, I want to view a significantly enhanced and well-organized public detail page for a convention, which now showcases all the rich information provided by the Organizer via the new 8-tab editor (including detailed pricing, multiple venues/hotels, interactive schedule, full talent/dealer lists, media gallery, and FAQs), so I can get a complete understanding of the event.
- **Detailed Requirements:** (As per "Story 2.3 Public - View Convention Listing Details (Heavily Revised)" from my previous full revamp)
    - Display all public-facing information from the 8 tabs of the convention creation process.
    - Sections for: Basic Info/Banner, Detailed Pricing, Venue & Hotel(s), Featured Talent, Full Schedule (interactive/readable), Dealers, Media Gallery, Convention FAQs.
    - Ensure responsive and WCAG 2.2 AA compliant layout.
- **Acceptance Criteria (ACs):**
  - AC1: All relevant published data from the advanced convention model is accurately and clearly displayed.
  - AC2: Specific display logic for dates (TBD), pricing (active discounts, currency), multiple venues/hotels, schedule (simultaneous events, fees), media gallery functions correctly.
  - AC3: The page is responsive and meets WCAG 2.2 AA.

---

### Story 2.16: Organizer - Delete Own Convention Listing (Renumbered from original 2.6)
- **User Story / Goal:** As an Organizer, I want to delete convention listings that I own (and all their associated advanced/detailed data), so that I can remove events that are cancelled or no longer relevant.
- **Detailed Requirements:** (Content same as original Story 2.5 / renumbered 2.6, but deletion now implies removing significantly more related data).
    - Confirmation step. Organizer can only delete own.
    - API call must now cascade delete the `Convention` and ALL its associated advanced data from the new, complex schema (PriceTiers, Discounts, Venues, Hotels, ScheduleEvents, Media, FAQs, Settings, Links, etc.).
- **Acceptance Criteria (ACs):**
  - AC1: Organizer can initiate deletion for their conventions.
  - AC2: Confirmation prompt shown.
  - AC3: Upon confirmation, the `Convention` record and ALL its dependent advanced data are permanently removed.
  - AC4: Deleted convention no longer appears publicly.
  - AC5: Organizer cannot delete unowned conventions.

---

### Story 2.17: Admin - Manage All Convention Listings (View, Edit, Delete) (Renumbered from original 2.7)
- **User Story / Goal:** As an Admin, I want to be able to view, edit (using the full new 8-tabbed interface), and delete any convention listing on the platform, so that I can perform moderation, correct information, or manage listings.
- **Detailed Requirements:** (Content largely same as original Story 2.6 / renumbered 2.7, but Admin Edit now uses the new tabbed interface).
    - Admin Dashboard lists all conventions.
    - Admin Edit function opens the selected convention in the full 8-tab interface (as defined in Stories 2.7-2.14).
    - Admin Delete function with confirmation, removes all associated advanced data.
- **Acceptance Criteria (ACs):**
  - AC1: Admin can view a list of all conventions.
  - AC2: Admin can access the full 8-tab edit interface for any convention and update its details.
  - AC3: Admin can delete any convention listing (with confirmation), and all its advanced data is removed.
  - AC4: Admin changes are reflected publicly/system-wide.

## Change Log

| Change        | Date       | Version | Description                                                                                                                                                                                                                                                             | Author             |
|---------------|------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Initial Draft | 2025-05-09 | 0.1     | Basic stories for simple convention CRUD (2.1-2.7).                                                                                                                                                                                                                       | Product Manager AI |
| Major Revision| 2025-05-13 | 0.2     | Previous full revamp of Epic 2 (introducing tabbed interface from 2.2). Superseded by version 0.3.                                                                                                                                                                 | User & PM AI       |
| Phased Revamp | 2025-05-13 | 0.3     | Restructured Epic to preserve original simple stories 2.1-2.5 (Phase 1). Introduced new stories 2.6-2.15 (Phase 2) for comprehensive 8-tab convention editor and expanded data model, replacing UI of original 2.2 & 2.5 and overhauling 2.1 & 2.3. Renumbered original 2.6 & 2.7. | User & PM AI       |