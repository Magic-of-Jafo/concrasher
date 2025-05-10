# ConventionCrasher UI/UX Specification

## Introduction

The purpose of this document is to define the user experience goals, information architecture, key user flows, and high-level visual design considerations for the ConventionCrasher platform MVP. It will serve as a guide for the development team to ensure a consistent, intuitive, and accessible user interface that meets the needs of Organizers, Talent, Brands, and Hobbyists/Users in the performance magic convention community.

- **Link to Primary Design Files:** {To be added if/when Figma, Sketch, Adobe XD, or similar mockups are created}
- **Link to Deployed Storybook / Design System:** {To be added if/when a component library Storybook is set up}

## Overall UX Goals & Principles

- **Target User Personas:**
    - **Organizers:** Individuals or groups planning and managing performance magic conventions. Key goals: Easily list and update event details, manage schedules/talent, gauge interest for new event ideas, reach attendees. *Pain point solved: Inefficient event management tools, difficulty reaching target audience.*
    - **Talent (Performers/Lecturers):** Individuals showcasing their skills and seeking opportunities at conventions. Key goals: Create a professional profile, list past/upcoming appearances, be discovered by Organizers. *Pain point solved: Lack of centralized platform for visibility.*
    - **Brands (Magic Shops, Manufacturers, Publishers):** Businesses looking to connect with the community and promote products/services. Key goals: Create a brand presence, associate with relevant conventions, reach potential customers. *Pain point solved: Fragmented marketing channels.*
    - **Users/Hobbyists:** Enthusiasts of performance magic looking to discover conventions and engage with the community. Key goals: Easily find conventions, access event information, learn about talent/brands, discuss with peers. *Pain point solved: Information fragmentation, inefficient discovery.*
    - **Admin:** Platform administrators responsible for user management, content moderation, and platform oversight. Key goals: Ensure platform integrity, manage user roles, oversee content quality.
- **Usability Goals:**
    - **Ease of Learning:** Users, especially Organizers, should be able to quickly understand how to use core features without extensive tutorials.
    - **Efficiency of Use:** Once familiar, users should be able to accomplish key tasks (e.g., creating a listing, finding a convention) with minimal steps.
    - **Error Prevention & Recovery:** The interface should guide users to prevent errors and provide clear, helpful messages if errors occur, allowing easy recovery.
    - **Satisfaction:** The overall experience should be positive and encourage repeat use.
- **Design Principles:**
    1.  **Organizer-Focused Efficiency:** Prioritize making event management tasks (listing, scheduling, idea validation) exceptionally easy and intuitive for Organizers.
    2.  **Clear & Intuitive Discovery:** Enable all users to effortlessly find the information they need (conventions, talent, brands, discussions).
    3.  **Accessibility First (WCAG 2.2 AA):** Design and build with accessibility as a core, non-negotiable requirement from the outset.
    4.  **Consistency & Familiarity:** Use consistent UI patterns and familiar interactions to reduce cognitive load.
    5.  **Community-Centric:** Foster a sense of connection and encourage positive interaction.
    6.  **"Local-First" Visibility:** Ensure design choices support equitable visibility for conventions of all sizes, including local and regional ones.
    7.  **Subtle Value of Live Attendance:** Gently highlight the unique benefits of in-person convention experiences.

## Information Architecture (IA)

- **Site Map / Screen Inventory:**
    *(This will be a list of distinct pages/views. We'll build this out together. Example below, which we'll refine)*
    ```mermaid
    graph TD
        %% Public Pages
        Homepage["Homepage / Convention Discovery"] --> ConventionDetails["Convention Details Page"];
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
        ConventionDetails -- Action --> AddCommentReview["(Modal/Section) Add Comment/Review"];
        ProposedConventionDetails -- Action --> ExpressInterest["(Action) Express Interest"];
        ProposedConventionDetails -- Action --> AddProposedComment["(Modal/Section) Add Comment on Proposal"];
        ForumThreadView -- Action --> CreateReply["(Modal/Section) Create Forum Reply"];

        %% Organizer Specific Pages
        UserDashboard -- RoleAction --> OrganizerDashboard["Organizer Dashboard"];
        OrganizerDashboard --> CreateConvention["Create New Convention Listing Form"];
        OrganizerDashboard --> MyConventions["My Conventions List (Manage)"];
        MyConventions --> EditConvention["Edit Convention Listing Form (incl. Schedule D&D)"];
        OrganizerDashboard --> CreateProposedConvention["Create Proposed Convention Form"];
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
        AdminDashboard --> AdminContentModeration["Admin - Content Moderation (Forum/Comments)"];

        %% Utility Pages (Linked from Footer)
        Footer --> AboutPage["About Us Page"];
        Footer --> ContactPage["Contact Us Page"];
        Footer --> TOSPage["Terms of Service Page"];
        Footer --> PrivacyPage["Privacy Policy Page"];
        Footer --> FAQPage["FAQ Page"];

        %% Convention Details shows Schedule, Talent, Brands, Comments
        ConventionDetails --> ScheduleView["(Section) Schedule View"];
        ConventionDetails --> AssociatedTalentView["(Section) Associated Talent View"];
        ConventionDetails --> AssociatedBrandsView["(Section) Associated Brands View"];
        ConventionDetails --> CommentsReviewsView["(Section) Comments/Reviews View"];

        %% Proposed Convention Details
        Homepage --> ProposedConventionList["Proposed Conventions List Page"];
        ProposedConventionList --> ProposedConventionDetails["Proposed Convention Details Page"];
        ProposedConventionDetails --> ProposalCommentsView["(Section) Proposal Comments View"];

    ```
- **Navigation Structure:**
    - **Primary Public Navigation (Header - Visible to All):**
        - Logo (links to Homepage/Convention Discovery)
        - Conventions (links to Homepage/Convention Discovery)
        - Talent (links to Talent Directory)
        - Brands (links to Brand Directory)
        - Community/Forum (links to Forum Categories Page)
        - Login / Register (if not logged in)
        - User Profile Dropdown/Link (if logged in, links to User Dashboard/Profile, My Applications, Organizer Dashboard (if role), Manage Talent Profile (if role), Manage Brand Profiles (if role), Admin (if role), Logout)
    - **Footer Navigation (Visible to All):**
        - About Us
        - Contact Us
        - Terms of Service
        - Privacy Policy
        - FAQ
        - Copyright ConventionCrasher {current_year}
    - **Secondary/Contextual Navigation:**
        - Breadcrumbs (e.g., Home > Forum > Category Name > Thread Name)
        - Tabs or sub-menus within dashboards (e.g., Organizer Dashboard: My Conventions, My Proposed Ideas, Create New).
        - Filters and sorting options on listing pages.

## User Flows

*{We will detail key user tasks here. For example: }*

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