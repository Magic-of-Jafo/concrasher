# ConventionCrasher Testing Strategy

This document outlines the strategy and approach for testing the ConventionCrasher application to ensure quality, reliability, and maintainability.

*(Current Date: 2025-05-09)*

## 1. Overall Philosophy & Goals

* **Philosophy:** We will adopt a balanced testing approach, emphasizing automated tests at different levels (unit, integration, end-to-end) to provide comprehensive coverage. The "Testing Trophy" (a variation of the pyramid, emphasizing integration tests) will be a guiding principle, given the nature of a full-stack Next.js application. Tests should be reliable, maintainable, and run efficiently.
* **Goals:**
    * Achieve high code coverage for critical business logic and UI components.
    * Ensure all user stories and acceptance criteria from the Epics are met.
    * Prevent regressions in functionality during ongoing development.
    * Enable confident refactoring and continuous integration/deployment (CI/CD).
    * Verify compliance with WCAG 2.2 Level AA accessibility standards.

## 2. Testing Levels

### 2.1 Unit Tests

* **Scope:** Test individual functions, React components (UI and logic), utility functions, and smaller modules in isolation. Focus on specific logic paths, props, state changes, and rendering outputs of components.
* **Tools:**
    * **Jest:** As the primary test runner and assertion library.
    * **React Testing Library (RTL):** For testing React components by interacting with them as a user would (querying by roles, text, labels, etc.), encouraging accessible and user-centric testing.
* **Mocking/Stubbing:**
    * Jest's built-in mocking capabilities (`jest.mock`, `jest.fn`, `jest.spyOn`) for external dependencies, API calls (e.g., mocking `Workspace` or Prisma Client methods), and Auth.js hooks/session data.
    * Mock Service Worker (MSW) can be considered for mocking API requests at the network level for more realistic testing of data-fetching components, even in unit/integration tests.
* **Location:** Test files will be collocated with the source files (e.g., `src/components/MyComponent.test.tsx` or `src/lib/utils.test.ts`).
* **Expectations:** Cover all critical logic branches within a unit. Tests should be fast and run frequently during development. Aim for clear, descriptive test names.

### 2.2 Integration Tests

* **Scope:** Verify the interaction between several components or modules. Examples:
    * Testing a form component with its validation logic and submission handler (mocking the API call).
    * Testing a Next.js API route handler with mocked services or database calls.
    * Testing a page component that fetches data and renders child components.
    * Testing interaction between UI components and client-side state management.
    * Testing Prisma interactions with a test database instance (if feasible and not too slow, otherwise mock Prisma Client).
* **Tools:**
    * **Jest** and **React Testing Library (RTL)** for frontend component integrations.
    * **Supertest** (or similar) for testing Next.js API route handlers if testing them in isolation from the full Next.js server. (Often, API routes can be integration tested by invoking their handlers directly with mocked `req`/`res` objects if external dependencies are mocked).
    * **Mock Service Worker (MSW)** for intercepting and mocking API requests made by the application during tests.
* **Location:** Can be collocated or in a dedicated `tests/integration/` directory, depending on the scope.
* **Expectations:** Focus on the contracts and interactions between modules/layers. Slower than unit tests but provide more confidence in how parts of the system work together.

### 2.3 End-to-End (E2E) / Acceptance Tests

* **Scope:** Test complete user flows through the deployed application (or a locally running full-stack instance). Interact with the UI as a real user would, covering critical user journeys defined in the Epics.
    * Examples: User registration and login; Organizer creates, views, updates, deletes a convention listing; User searches for conventions; User posts in a forum.
* **Tools:**
    * **Playwright:** For robust cross-browser E2E testing. It allows scripting user interactions, making assertions on UI state, and can interact with a real browser.
* **Environment:**
    * **Local:** E2E tests should be runnable against a locally running instance of the application (using `npm run dev` and local Dockerized PostgreSQL).
    * **Staging/Preview:** E2E tests will be run against deployed preview/staging environments as part of the CI/CD pipeline before merging to production.
* **Location:** `tests/e2e/`
* **Expectations:** Cover critical user paths and acceptance criteria. These tests are the slowest and can be more prone to flakiness, so they should be focused on high-value scenarios. They provide the highest confidence that the system works as a whole.

## 3. Specialized Testing Types

### 3.1 Accessibility Testing (WCAG 2.2 AA)

* **Scope & Goals:** Ensure all user interfaces comply with WCAG 2.2 Level AA.
* **Tools & Techniques:**
    * **Automated:** Use tools like `jest-axe` (integrates axe-core with Jest) for automated checks within unit/integration tests of React components.
    * **Linters:** ESLint with `eslint-plugin-jsx-a11y` will catch common issues during development.
    * **Browser Extensions:** Tools like Axe DevTools or WAVE browser extensions for manual checks and audits during development and testing.
    * **Manual Testing:** Perform manual checks for keyboard navigation, screen reader compatibility (e.g., NVDA, VoiceOver), color contrast, and overall usability for users with disabilities. This is crucial as automated tools cannot catch all issues.
* **Process:** Accessibility checks should be part of the development lifecycle and pull request reviews.

### 3.2 Visual Regression Testing (Post-MVP Consideration)

* **Scope & Goals:** Prevent unintended visual changes to UI components and pages.
* **Tools:** (e.g., Percy, Applitools, Playwright visual comparisons). This is likely a post-MVP consideration due to setup and maintenance effort.

## 4. Test Data Management

* **Unit/Integration Tests:** Use mocked data, fixtures, or libraries like Faker.js to generate test data.
* **E2E Tests:**
    * May require a set of predefined test users with different roles.
    * Prisma `seed.ts` script can be used to populate the local/test database with consistent initial data for E2E tests.
    * Tests should ideally clean up any data they create or use specific, isolated test data to avoid interference between test runs.
* **Prisma Client Extensions or Test Utilities:** Can be developed to help set up and tear down database state for tests involving Prisma.

## 5. CI/CD Integration

* **Execution:** All automated tests (unit, integration, and a subset of critical E2E tests) will be run automatically in the CI/CD pipeline (e.g., GitHub Actions) on every pull request and before deployment to staging/production.
* **Pipeline Failure:** A failing test will prevent the code from being merged or deployed, ensuring that issues are caught early.
* **Reporting:** Test results and code coverage reports (e.g., from Jest's coverage reporter) will be generated and made available.

## Change Log

| Change        | Date       | Version | Description                                     | Author         |
|---------------|------------|---------|-------------------------------------------------|----------------|
| Initial draft | 2025-05-09 | 0.1     | First draft of the testing strategy.              | Architect Agent |

---