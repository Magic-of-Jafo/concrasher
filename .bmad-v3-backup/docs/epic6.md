# Epic 6: Utility Pages & Initial Content

**Goal:** To create and populate standard utility pages (About Us, Contact Us, Terms of Service, Privacy Policy, FAQ) with initial content using Next.js App Router and React Server Components. These pages will share the common site layout and styling (Material UI) to ensure consistency. This epic ensures the platform meets basic legal and informational requirements, provides users with essential resources, and completes the foundational set of pages for the MVP launch.

## Story List

### Story 6.1: Static Page Rendering Mechanism
- **User Story / Goal:** Technical Story - To implement a straightforward mechanism for creating and rendering static-like content pages within the Next.js (App Router) application, ensuring they are stylistically consistent (using Material UI) with the rest of the platform.
- **Detailed Requirements:**
  - Establish a convention for creating these content pages as Next.js App Router routes (e.g., a new folder like `src/app/about/page.tsx`).
  - These pages will primarily be React Server Components, with content directly embedded in the JSX for MVP. (Markdown file rendering can be a future enhancement if dynamic content management for these pages is needed).
  - Ensure these pages utilize the root layout (`src/app/layout.tsx`) and any relevant nested layouts (e.g., a main application layout if these pages share common navigation beyond the absolute root) to provide consistent header, footer, and navigation structure.
  - Styling will be handled by global styles, Material UI components, and theme.
- **Acceptance Criteria (ACs):**
  - AC1: A developer can easily create a new static content page by adding a new route file (e.g., `src/app/new-static-page/page.tsx`) with custom text content.
  - AC2: Static pages correctly inherit and display the common site header, navigation (if applicable to their layout), and footer components, styled with Material UI.
  - AC3: Content within static pages is stylistically rendered in a readable format, using standard HTML elements within React components and adhering to the site's overall Material UI theme.

---

### Story 6.2: "About Us" Page
- **User Story / Goal:** As any user, I want to view an "About Us" page, so that I can learn about ConventionCrasher's mission, vision, and the idea behind it.
- **Detailed Requirements:**
  - Create a static page at the route `/about` (e.g., `src/app/about/page.tsx`).
  - Populate with initial draft content (to be provided by project owner) describing ConventionCrasher, its purpose, focus on performance magic, and its commitment to the community (including "Local-First" championing). Content will be embedded within the React Server Component.
  - Ensure the page is linked from the site footer component (Story 6.7).
- **Acceptance Criteria (ACs):**
  - AC1: The `/about` page is accessible via its URL and displays the drafted "About Us" content from its React component.
  - AC2: The page is correctly linked from the site footer.
  - AC3: The content is well-formatted using Material UI typography and layout components for readability.

---

### Story 6.3: "Contact Us" Page
- **User Story / Goal:** As any user, I want to find a "Contact Us" page with information on how to get in touch, so that I can ask questions or provide feedback.
- **Detailed Requirements:**
  - Create a static page at the route `/contact` (e.g., `src/app/contact/page.tsx`).
  - For MVP, this page will display a contact email address (e.g., `info@conventioncrasher.com` or `support@conventioncrasher.com`). No contact form is required for MVP.
  - Content embedded within the React Server Component.
  - Ensure the page is linked from the site footer component.
- **Acceptance Criteria (ACs):**
  - AC1: The `/contact` page is accessible and displays the designated contact information (e.g., an email address).
  - AC2: The page is correctly linked from the site footer.

---

### Story 6.4: "Terms of Service (TOS)" Page
- **User Story / Goal:** As any user, I want to be able to read the Terms of Service for using ConventionCrasher, so that I understand my rights and obligations.
- **Detailed Requirements:**
  - Create a static page at the route `/terms-of-service` (e.g., `src/app/terms-of-service/page.tsx`).
  - Populate with initial (placeholder or legally reviewed if available) Terms of Service content, provided by the project owner. Content embedded within the React Server Component.
    * *Note: Actual legal text must be provided by the project owner/legal counsel.*
  - Ensure the page is linked from the site footer and potentially during user registration (e.g., a link near the registration form's submit button).
- **Acceptance Criteria (ACs):**
  - AC1: The `/terms-of-service` page is accessible and displays the drafted/placeholder TOS content.
  - AC2: The page is correctly linked from the site footer.
  - AC3: (If required by Auth.js setup or legal) A clear link to the TOS page is present on or near the user registration interface.

---

### Story 6.5: "Privacy Policy" Page
- **User Story / Goal:** As any user, I want to be able to read the Privacy Policy for ConventionCrasher, so that I understand how my data is collected, used, and protected.
- **Detailed Requirements:**
  - Create a static page at the route `/privacy-policy` (e.g., `src/app/privacy-policy/page.tsx`).
  - Populate with initial (placeholder or legally reviewed if available) Privacy Policy content, provided by the project owner. Content embedded within the React Server Component.
    * *Note: Actual legal text must be provided by the project owner/legal counsel.*
  - Ensure the page is linked from the site footer and potentially during user registration.
- **Acceptance Criteria (ACs):**
  - AC1: The `/privacy-policy` page is accessible and displays the drafted/placeholder Privacy Policy content.
  - AC2: The page is correctly linked from the site footer.
  - AC3: (If required by Auth.js setup or legal) A clear link to the Privacy Policy page is present on or near the user registration interface.

---

### Story 6.6: "FAQ" Page (Frequently Asked Questions)
- **User Story / Goal:** As any user, I want to access an FAQ page, so that I can find answers to common questions about using ConventionCrasher.
- **Detailed Requirements:**
  - Create a static page at the route `/faq` (e.g., `src/app/faq/page.tsx`).
  - Populate with an initial set of common questions and answers (content to be provided by project owner) relevant to Users, Organizers, Talent, and Brands (e.g., "How do I list my convention?", "How do I activate a Talent profile?", "Is the platform free to use?").
  - Structure the FAQ for easy readability within the React Server Component (e.g., using Material UI `Accordion` components for Q&A pairs or simple headings and paragraphs).
  - Ensure the page is linked from the site footer or help sections.
- **Acceptance Criteria (ACs):**
  - AC1: The `/faq` page is accessible and displays the drafted FAQ content.
  - AC2: The page includes initial questions and answers for different user roles/common queries.
  - AC3: The page is correctly linked from the site footer.

---

### Story 6.7: Consistent Site Footer Component
- **User Story / Goal:** As any user, I want a consistent site footer on all pages that includes links to important utility pages (About, Contact, TOS, Privacy, FAQ) and copyright information, so that I can easily navigate to this information.
- **Detailed Requirements:**
  - Design and implement a standard footer as a shared React component (e.g., `src/components/layout/Footer.tsx`), styled with Material UI.
  - Footer should include:
    - Links to: `/about`, `/contact`, `/terms-of-service`, `/privacy-policy`, `/faq`.
    - Copyright notice (e.g., `© {new Date().getFullYear()} ConventionCrasher. All rights reserved.`). The year should be dynamic.
  - The footer component should be integrated into the root layout (`src/app/layout.tsx`) or a main application layout to appear consistently at the bottom of all relevant pages.
- **Acceptance Criteria (ACs):**
  - AC1: A standard footer React component is created and integrated into the main application layout(s), appearing on all pages that use this layout.
  - AC2: The footer contains correct navigation links (using Next.js `<Link>` component) to the About, Contact, TOS, Privacy, and FAQ pages.
  - AC3: The footer displays a copyright notice with the current year dynamically generated (e.g., using `new Date().getFullYear()`).

## Change Log

| Change        | Date       | Version | Description                                                                      | Author          |
| ------------- | ---------- | ------- | -------------------------------------------------------------------------------- | --------------- |
| Initial Draft | 2025-05-09 | 0.1     | First draft of Epic 6 stories                                                      | Product Manager AI |
| Revision      | 2025-05-09 | 0.2     | Integrated architectural decisions (Next.js App Router for static pages, Material UI styling), refined technical details in requirements and ACs. | Architect Agent |