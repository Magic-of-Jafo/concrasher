````markdown
# ConventionCrasher UI/UX Specification

## Introduction

The purpose of this document is to define the user experience goals, information architecture, key user flows, and high-level visual design considerations for the ConventionCrasher platform MVP. It will serve as a guide for the development team to ensure a consistent, intuitive, and accessible user interface that meets the needs of Organizers, Talent, Brands, and Hobbyists/Users in the performance magic convention community. This version reflects a significant enhancement to convention management, introducing a comprehensive 8-tab editor for Organizers.

- **Link to Primary Design Files:** {To be added if/when Figma, Sketch, Adobe XD, or similar mockups are created - Expected to use Material-UI as a base}
- **Link to Deployed Storybook / Design System:** {To be added if/when a component library Storybook is set up}

## Overall UX Goals & Principles

- **Target User Personas:**
    - **Organizers:** Individuals or groups planning and managing performance magic conventions. Key goals: Easily list and update event details comprehensively, manage schedules/talent, define complex pricing, detail venue/hotel information, gauge interest for new event ideas, reach attendees. *Pain point solved: Inefficient event management tools, difficulty reaching target audience, lack of detailed event presentation capabilities.*
    - **Talent (Performers/Lecturers):** Individuals showcasing their skills and seeking opportunities at conventions. Key goals: Create a professional profile, list past/upcoming appearances, be discovered by Organizers. *Pain point solved: Lack of centralized platform for visibility.*
    - **Brands (Magic Shops, Manufacturers, Publishers):** Businesses looking to connect with the community and promote products/services. Key goals: Create a brand presence, associate with relevant conventions, reach potential customers. *Pain point solved: Fragmented marketing channels.*
    - **Users/Hobbyists:** Enthusiasts of performance magic looking to discover conventions and engage with the community. Key goals: Easily find conventions, access rich and detailed event information, learn about talent/brands, discuss with peers. *Pain point solved: Information fragmentation, inefficient discovery.*
    - **Admin:** Platform administrators responsible for user management, content moderation, and platform oversight. Key goals: Ensure platform integrity, manage user roles, oversee content quality.
- **Usability Goals:**
    - **Ease of Learning:** Users, especially Organizers using the comprehensive 8-tab convention editor, should be able to quickly understand how to use core features, guided by an intuitive layout, clear labeling, and contextual help where appropriate.
    - **Efficiency of Use:** Once familiar, Organizers should be able to accomplish detailed event setup and management tasks efficiently across the tabbed interface without feeling bogged down or repetitive. Other users should find information quickly.
    - **Error Prevention & Recovery:** The interface, particularly the complex convention editor, must actively guide users to prevent data entry errors and provide clear, actionable messages if errors occur, allowing easy correction and recovery.
    - **Satisfaction:** The overall experience should be positive, empowering (especially for Organizers managing complex events), and encourage continued platform use.
- **Design Principles:**
    1.  **Organizer-Focused Efficiency & Power:** Prioritize making the comprehensive event management tasks (via the 8-tab editor) exceptionally easy, intuitive, and powerful. The design must balance data richness with clarity and avoid cognitive overload.
    2.  **Clear & Intuitive Discovery:** Enable all users to effortlessly find the information they need (conventions with rich details, talent, brands, discussions) through well-structured presentation and effective search/filtering.
    3.  **Accessibility First (WCAG 2.2 AA):** Design and build with accessibility as a core, non-negotiable requirement from the outset for all interfaces, components, and interactions, including the complex convention editor.
    4.  **Consistency & Familiarity (Material-UI Base):** Use consistent UI patterns, leveraging Material-UI components where appropriate, to reduce cognitive load and provide a familiar interaction language.
    5.  **Community-Centric:** Foster a sense of connection and encourage positive interaction.
    6.  **"Local-First" Visibility:** Ensure design choices support equitable visibility for conventions of all sizes, including local and regional ones.
    7.  **Subtle Value of Live Attendance:** Gently highlight the unique benefits of in-person convention experiences through the richness of presented information and community engagement.

## Information Architecture (IA)

- **Site Map / Screen Inventory:**
    *(This lists distinct pages/views. The Convention Editor is a single page accessed via specific routes, internally managing multiple tabs.)*
    ```mermaid
    graph TD
        %% Public Pages
        Homepage["Homepage / Convention Discovery"] --> ConventionDetailsPage["Convention Details Page (Rich Display)"];
        Homepage --> TalentList["Talent Directory Page"];
        TalentList --> TalentProfile["Talent Profile Page"];
        Homepage --> BrandList["Brand Directory Page"];
        BrandList --> BrandProfile["Brand Profile Page"];
        Homepage --> ForumCategories["Forum - Categories Page"];
        ForumCategories --> ForumThreads["Forum - Threads in Category Page"];
        ForumThreads --> ForumThreadView["Forum - Thread View / Posts Page"];
        Homepage --> SearchResults["Search Results Page"];

        %% Auth Pages
        Homepage -- Nav --> LoginPage["Login Page"];
        Homepage -- Nav --> RegisterPage["Registration Page"];

        %% User Authenticated Pages (General User)
        UserDashboard["User Dashboard (Placeholder/Profile Link)"] --> UserProfileEdit["User Profile Edit Page"];
        UserDashboard --> MyApplications["My Role Applications Page"];
        ConventionDetailsPage -- Action --> AddCommentReview["(Modal/Section) Add Comment/Review"];
        ProposedConventionDetails -- Action --> ExpressInterest["(Action) Express Interest"];
        ProposedConventionDetails -- Action --> AddProposedComment["(Modal/Section) Add Comment on Proposal"];
        ForumThreadView -- Action --> CreateReply["(Modal/Section) Create Forum Reply"];

        %% Organizer Specific Pages
        UserDashboard -- RoleAction --> OrganizerDashboard["Organizer Dashboard"];
        OrganizerDashboard --> ConventionEditorPage_New["Convention Editor Page (New - /org/conventions/new)"];
        OrganizerDashboard --> MyConventions["My Conventions List (Manage)"];
        MyConventions --> ConventionEditorPage_Edit["Convention Editor Page (Edit - /org/conventions/{id}/edit)"];
        OrganizerDashboard --> CreateProposedConvention["Create Proposed Convention Form (Simpler Form)"];
        OrganizerDashboard --> MyProposedConventions["My Proposed Conventions List (Manage)"];
        MyProposedConventions --> ViewProposalInterest["View Proposal Interest/Comments"];


        %% Talent Specific Pages
        UserDashboard -- RoleAction --> EditTalentProfile["Edit Talent Profile Form"];

        %% Brand Specific Pages (Managed by User)
        UserDashboard -- RoleAction --> MyBrandProfiles["My Brand Profiles List (Manage)"];
        MyBrandProfiles --> CreateBrandProfile["Create Brand Profile Form"];
        MyBrandProfiles --> EditBrandProfile["Edit Brand Profile Form (for specific brand)"];

        %% Admin Specific Pages
        AdminDashboard["Admin Dashboard"] --> AdminUserManagement["Admin - User Management"];
        AdminDashboard --> AdminRoleApprovals["Admin - Role Application Approvals"];
        AdminDashboard --> AdminConventionManagement["Admin - Convention Management"];
        AdminConventionManagement --> ConventionEditorPage_AdminEdit["Convention Editor Page (Admin Edit - via /admin/...)"]
        AdminDashboard --> AdminContentModeration["Admin - Content Moderation (Forum/Comments)"];

        %% Utility Pages (Linked from Footer)
        Footer --> AboutPage["About Us Page"];
        Footer --> ContactPage["Contact Us Page"];
        Footer --> TOSPage["Terms of Service Page"];
        Footer --> PrivacyPage["Privacy Policy Page"];
        Footer --> FAQPage["FAQ Page"];

        %% Convention Details Page - Sections (Illustrative)
        ConventionDetailsPage --> CDS_BasicInfo["(Section) Basic Info/Banner"];
        ConventionDetailsPage --> CDS_Pricing["(Section) Pricing Details"];
        ConventionDetailsPage --> CDS_VenueHotels["(Section) Venue & Hotel(s)"];
        ConventionDetailsPage --> CDS_Talent["(Section) Featured Talent"];
        ConventionDetailsPage --> CDS_Schedule["(Section) Full Schedule"];
        ConventionDetailsPage --> CDS_Dealers["(Section) Dealers List"];
        ConventionDetailsPage --> CDS_Media["(Section) Media Gallery"];
        ConventionDetailsPage --> CDS_FAQ["(Section) Convention FAQs"];
        ConventionDetailsPage --> CDS_Comments["(Section) Comments/Reviews"];

        %% Proposed Convention Details
        Homepage --> ProposedConventionList["Proposed Conventions List Page"];
        ProposedConventionList --> ProposedConventionDetails["Proposed Convention Details Page"];
        ProposedConventionDetails --> ProposalCommentsView["(Section) Proposal Comments View"];
    ```
    *Description: The `ConventionEditorPage_New` and `ConventionEditorPage_Edit` represent the single, multi-tabbed interface for creating and editing conventions. They are not separate pages for each tab.*

- **Navigation Structure:**
    - **Primary Public Navigation (Header - Visible to All):**
        - Logo (links to Homepage/Convention Discovery)
        - Conventions (links to Homepage/Convention Discovery)
        - Talent (links to Talent Directory)
        - Brands (links to Brand Directory)
        - Community/Forum (links to Forum Categories Page)
        - Login / Register (if not logged in)
        - User Profile Dropdown/Link (if logged in, includes: My Profile, My Applications, Organizer Dashboard [if role, then to `ConventionEditorPage_New` or `MyConventions`], Manage Talent Profile [if role], Manage Brand Profiles [if role], Admin Dashboard [if role], Logout)
    - **Footer Navigation (Visible to All):**
        - About Us
        - Contact Us
        - Terms of Service
        - Privacy Policy
        - FAQ
        - Copyright ConventionCrasher {current_year}
    - **Secondary/Contextual Navigation:**
        - Breadcrumbs (e.g., Home > Forum > Category Name > Thread Name; Organizer Dashboard > My Conventions > Convention Name - Edit).
        - Tabs within dashboards (e.g., Organizer Dashboard: My Conventions, My Proposed Ideas, Create New Convention).
        - **Tabs within the Convention Editor page (Basic Info, Pricing, Venue/Hotel, Talent, Schedule, Dealers, Media, Settings).** These are the primary means of navigating the different sections of convention data entry.
        - Filters and sorting options on listing pages.

## User Flows

*{Key user tasks will be detailed here. The convention creation/editing flow is now central and significantly more complex.}*

### User Flow: New User Registration & Role Application (e.g., Organizer)
- **Goal:** A new visitor registers, then applies for an Organizer role.
```mermaid
graph TD
    A[Visitor lands on site] --> B{Wants to Register};
    B -- Yes --> C[Clicks 'Register' Link];
    C --> D[Fills Registration Form (Email, Password)];
    D --> E{Form Valid?};
    E -- Yes --> F[Account Created (User/Hobbyist Role)];
    F --> G[Redirected to Login/Dashboard];
    G --> H[User Navigates to Profile/Upgrade Role Section];
    H --> I[Clicks 'Apply for Organizer Role'];
    I --> J[Submits Organizer Application (Minimal info/Confirmation)];
    J --> K[Application 'Pending' Status];
    K --> L[User sees confirmation];
    L --> M[Admin Later Reviews Application - See Admin Flow];
    E -- No --> N[Show Error on Form];
    N --> D;
````

### User Flow: Organizer Creates New Convention Listing (Using 8-Tab Editor)

  - **Goal:** An approved Organizer uses the multi-tab editor to create a new, highly detailed convention listing.

<!-- end list -->

```mermaid
graph TD
    A[Organizer logs in] --> B[Navigates to Organizer Dashboard];
    B --> C[Clicks 'Create New Convention'];
    C --> EditorPage["Convention Editor Page Loaded (URL: /org/conventions/new, Defaults to 'Basic Info' Tab)"];
    
    subgraph Convention Editor Page
        direction LR
        T_Nav["Tab Navigation (Basic, Pricing, Venue, Talent, Schedule, Dealers, Media, Settings)"]
        ContentArea["Tab Content Area"]
        GlobalActions["Global Actions (Save Draft, Publish, Preview, Cancel)"]
        T_Nav --> ContentArea
    end

    EditorPage --> T_Nav;
    EditorPage --> GlobalActions;

    ContentArea -- Iteration across tabs --> Fill_BasicInfo["1. Fill 'Basic Info' Tab (Series, Name, Dates, Location, Images)"];
    Fill_BasicInfo --> MaybeSave1["User may save progress (per-tab or globally)"];
    MaybeSave1 --> Fill_Pricing["2. Navigate to & Fill 'Pricing' Tab (Tiers, Discounts)"];
    Fill_Pricing --> Fill_VenueHotel["3. Navigate to & Fill 'Venue/Hotel' Tab (Venue, Hotels, Amenities)"];
    Fill_VenueHotel --> Fill_Talent["4. Navigate to & Fill 'Talent' Tab (Link Performers)"];
    Fill_Talent --> Fill_Schedule["5. Navigate to & Fill 'Schedule' Tab (Build interactive schedule)"];
    Fill_Schedule --> Fill_Dealers["6. Navigate to & Fill 'Dealers' Tab (List Dealers)"];
    Fill_Dealers --> Fill_Media["7. Navigate to & Fill 'Media' Tab (Upload Images, Add Videos)"];
    Fill_Media --> Fill_Settings["8. Navigate to & Fill 'Settings' Tab (Currency, Timezone)"];
    
    Fill_Settings --> AttemptPublish[Organizer Clicks 'Publish Convention' (or 'Save Draft')];
    AttemptPublish --> ValidateAllData{Server-Side Validation of All Tabs' Data};
    ValidateAllData -- All Valid --> ConventionPublished[Convention Created & Published (Status: PUBLISHED)];
    ConventionPublished --> RedirectToDetail["Redirect to Public Convention Detail Page or 'My Conventions' with Success"];
    ValidateAllData -- Invalid Data --> ShowErrors["Display Validation Errors (Highlighting tabs/fields with issues within EditorPage)"];
    ShowErrors --> EditorPage;
```

*(Note: This flow emphasizes the tab-based interaction. Individual complex interactions within tabs, like adding multiple price tiers or drag-and-drop scheduling, are implied but would need their own micro-flow diagrams or detailed descriptions in the Wireframes section.)*

### User Flow: Organizer Edits Existing Convention (Using 8-Tab Editor)

  - **Goal:** An Organizer edits an existing detailed convention listing using the multi-tab editor.
  - *(This flow starts with the Organizer navigating to "My Conventions," selecting a convention to edit, which loads the `ConventionEditorPage` (URL: /org/conventions/{id}/edit) with all existing data populated across the 8 tabs. The subsequent interaction with tabs and saving/publishing follows a similar pattern to the "Create" flow.)*

*(... More key user flows will be added, e.g., "User Discovers Convention via Search & Views Rich Details," "User Interacts with Idea Validation Tool," "User Posts in Forum.")*

## Wireframes & Mockups

*{This section requires significant NEW and DETAILED content. The design of the 8-tab Convention Editor and the enriched Public Convention Details Page is paramount. Material-UI will serve as the foundational component library.}*

  - **Screen / View Name 1: Convention Editor Page (Multi-Tab Interface)**

      - **Purpose:** Central hub for Organizers to create and meticulously edit all aspects of their convention.
      - **Overall Layout:**
          - Consistent header with Convention Name (once set) and global actions (e.g., "Save Draft," "Save & Preview," "Publish," "View Public Page," "Delete").
          - Prominent tab navigation (e.g., Material-UI `Tabs` component - horizontal at the top or vertical on the left). Clear indication of the active tab.
          - Main content area displaying the form fields and controls for the active tab.
          - Consideration for handling unsaved changes when switching tabs or attempting to leave the page.
      - **Tab 1: Basic Info & Series**
          - *Layout Idea:* Standard form layout. Sections for Series, Core Details, Location, Descriptions, Imagery. Image uploaders (e.g., Material-UI `Button` to trigger file input, with image preview components).
      - **Tab 2: Pricing**
          - *Layout Idea:* Two main sections: "Price Tiers" and "Price Discounts." Each section uses dynamic form rows (e.g., a `Card` for each tier/discount group, with `TextField` for labels/amounts, `DatePicker`, `Select` for tiers in discounts, `IconButton` for add/remove rows).
      - **Tab 3: Venue/Hotel**
          - *Layout Idea:* Sections for Primary Venue, conditional Primary Hotel, and repeatable blocks for Additional Hotels. Each block uses standard form inputs. Image upload for venue/hotel.
      - **Tab 4: Talent**
          - *Layout Idea:* Autocomplete search field (e.g., Material-UI `Autocomplete`) for finding Talent. A list/grid of `Chip` or `Card` components to display linked Talent (with avatar, name, remove icon).
      - **Tab 5: Schedule**
          - *Layout Idea:* **(This is the most complex UI component)**. Could be a combination of:
              - A list/palette of creatable/pre-defined "Event Cards" (draggable).
              - A main visual timeline/calendar area (daily/weekly views) where events are dropped and resized. Needs to visually handle overlapping/simultaneous events.
              - A modal (Material-UI `Dialog`) or drawer for editing detailed event information (name, type, description, linked talent/brands, location, fees with dynamic rows).
      - **Tab 6: Dealers**
          - *Layout Idea:* Similar to Talent tab; search/autocomplete for linking profiles, list of linked dealers with options to edit overrides.
      - **Tab 7: Media**
          - *Layout Idea:* Section for image uploads (multi-file uploader, gallery of thumbnails with captions and remove/reorder options). Section for video links (input fields for URL/caption, list of added videos with previews/remove options).
      - **Tab 8: Settings**
          - *Layout Idea:* Simple form layout with `Select` components for Currency and Timezone.
      - **Inspiration/Examples for Convention Editor:** {User/team to provide examples of well-designed complex forms, scheduling interfaces, or event management backends.}

  - **Screen / View Name 2: Public Convention Details Page (Revised Rich Display)**

      - **Purpose:** To present all the detailed information of a convention to the public in an engaging, readable, and well-organized manner.
      - **Layout Idea:**
          - Hero section with Cover Image, Convention Name, Profile Image, Dates, Location summary.
          - Possible use of a sticky sidebar navigation for jumping to sections on a long page, or a tabbed interface if content is very extensive per section.
          - **Sections (clearly delineated):**
              - **About/Description:** Main description text.
              - **Pricing:** Structured list of Price Tiers & current/upcoming Discounts.
              - **Venue & Hotel(s):** Primary Venue card/section, followed by Primary Hotel (if separate) and then a list/grid of Additional Hotel cards. Each with image, key details, map link.
              - **Featured Talent:** Grid of Talent `Card` components (photo, name, role, link to profile).
              - **Schedule:** This needs careful design. Could be:
                  - Tabbed by day.
                  - Accordion lists for each day/track.
                  - A condensed, interactive timeline view.
                  - Each event showing essential details (time, name, location, talent snippet). A click could expand for more details or link to a dedicated (future) event page.
              - **Dealers:** List/grid of dealer cards.
              - **Media Gallery:** Image carousel/gallery, embedded video player section.
              - **FAQs:** Accordion list for questions/answers.
              - **Comments/Reviews:** Standard comment list and input form.
      - **Inspiration/Examples for Rich Event Pages:** {User/team to provide examples of event websites or platforms with excellent information display.}

*(... Other key screens like Homepage, Organizer Dashboard will also need wireframe descriptions updated to reflect access to the new editor and display of richer info.)*

## Component Library / Design System Reference

  - Link to primary Material-UI documentation: [https://mui.com/](https://mui.com/)
  - The project will heavily leverage Material-UI components (Buttons, TextFields, Selects, DatePickers, Cards, Dialogs, Tabs, Autocomplete, ImageLists, etc.) as a base, customizing their style and behavior as needed.
  - **Key New/Complex Component Needs (Conceptual, to be built with or on top of MUI or specialized libraries):**
      - **Tabbed Interface Container:** For the Convention Editor (Material-UI `Tabs`).
      - **Dynamic Form Row Manager:** A reusable component/logic for adding, removing, and managing lists of form inputs (e.g., for Price Tiers, Discount items, Event Fee Tiers, Additional Hotels).
      - **Advanced Image Uploader:** Component for handling file selection, preview, upload progress, and removal for various image contexts.
      - **Interactive Schedule/Calendar Component:** This is the most complex. May require a dedicated React calendar/scheduler library (e.g., FullCalendar, React Big Calendar - to be evaluated by Architect/Dev team for features like drag-and-drop, resizing, simultaneous event display, resource allocation view) integrated with Material-UI styling, or significant custom development.
      - **Searchable Autocomplete Select with Entity Linking:** For linking Talent, Brands, Users (as dealers), Convention Series. (Material-UI `Autocomplete` can be a good base).
      - **Conditional Section Renderer:** For forms where sections appear/disappear based on other inputs (e.g., Venue/Hotel tab's "Guests NOT staying..." logic).

## Branding & Style Guide Reference

  - **Color Palette:**
      - Primary: {To be defined - suggest exploring Material Design color tool with a professional yet engaging magic-community feel, e.g., a deep blue or sophisticated purple}
      - Secondary: {To be defined - a complementary accent}
      - Accent: {To be defined - for critical calls to action}
      - Neutral/Backgrounds: Standard Material Design greys, whites, paper backgrounds.
      - Feedback colors: Standard accessible Material Design shades for Success (green), Error (red), Warning (orange), Info (blue).
  - **Typography:**
      - Font Families: Default to Material Design standard fonts (e.g., Roboto, Open Sans) for broad compatibility and legibility, unless a specific thematic font is chosen and vetted for readability and web performance.
      - Sizes & Weights: Follow Material Design type scale guidelines for establishing clear visual hierarchy (H1-H6, body1, body2, caption, button text).
  - **Iconography:** Primarily use Material Icons (via `@mui/icons-material`) for consistency and ease of integration.
  - **Spacing & Grid:** Adhere to Material Design spacing principles (e.g., 8dp grid system for margins, padding, layout).
  - **Overall Feel:** Professional, modern, clean, highly usable, engaging, trustworthy, and supportive of the performance magic community. The interface should feel empowering to Organizers and informative to attendees.

## Accessibility (AX) Requirements

  - **Target Compliance:** WCAG 2.2 Level AA (Mandatory).
  - **Specific Requirements:**
      - All interactive elements (including Material-UI components and any custom-built ones) must be fully keyboard accessible (logical tab order, visible focus states, activation via Enter/Space).
      - Clear and highly visible focus indicators for all interactive elements.
      - Sufficient color contrast for all text, icons, and meaningful UI elements (minimum 4.5:1 for normal text, 3:1 for large text and UI components), adhering to Material Design accessibility best practices.
      - Semantic HTML5 structure throughout the application.
      - ARIA attributes (roles, states, properties) used appropriately and correctly for all dynamic components, complex widgets (e.g., tabs, modals, autocomplete, custom schedule component), and to provide additional context where plain HTML is insufficient.
      - All informational images must have appropriate `alt` text. Decorative images should have empty `alt=""`.
      - All forms, especially within the 8-tab convention editor, must have clear, programmatically associated labels for all inputs. Error messages must be clearly associated with their respective fields, be announced by screen readers, and provide guidance for correction.
      - **The multi-tab Convention Editor interface must be fully keyboard navigable, including intuitive tab switching (e.g., using arrow keys on tablist, Enter/Space to activate tab panel).**
      - **Drag-and-drop functionality (e.g., for the Schedule tab) must have fully equivalent keyboard alternatives (e.g., using arrow keys to select and move items, dedicated buttons/context menu options for reordering, cut/paste).**
      - **Dynamic form sections (e.g., adding pricing tiers, hotels, schedule event fees) must manage keyboard focus appropriately upon adding/removing elements. New elements should be announced correctly by screen readers.**
      - Ensure interactive elements have sufficient touch target size (e.g., min 44x44 CSS pixels).

## Responsiveness

  - **Breakpoints:** Standard Material Design breakpoints will be used as a guideline (e.g., xs, sm, md, lg, xl) for adapting layouts.
  - **Adaptation Strategy:**
      - A mobile-first or gracefully degrading responsive design approach will be employed to ensure excellent usability on all common screen sizes (smartphones, tablets, desktops).
      - Content must reflow, remain readable, and be fully functional across all breakpoints.
      - The **8-tab Convention Editor** will require particularly careful responsive design. On smaller screens, this might involve:
          - Tabs collapsing into a select dropdown or an accordion.
          - Form fields stacking vertically.
          - The complex Schedule component needing a simplified mobile-friendly view or interaction pattern.
      - Navigation will adapt (e.g., Material-UI `AppBar` with a `Drawer` for primary navigation on mobile).
      - Touch targets will be adequately sized and spaced on touch devices.
      - Complex data displays (like the public schedule view or detailed pricing) may need alternative, simplified presentations on smaller screens to avoid clutter and horizontal scrolling.

## Change Log

| Change                                               | Date       | Version | Description                                                                                                                                                                                                 | Author         |
| ---------------------------------------------------- | ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Initial Draft                                        | 2025-05-09 | 0.1     | Initial structure and core content based on user input.                                                                                                                                                     | Product Manager AI |
| Revamp Convention Editor & Display (Reflected Phased Approach) | 2025-05-13 | 0.3     | Redesigned convention creation/editing to use a comprehensive 8-tab interface, and updated public convention display requirements to match. Significant impact on IA, User Flows, and Wireframes/Mockups sections. | User & PM AI       |

```