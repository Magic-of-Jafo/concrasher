# ConventionCrasher Coding Standards and Patterns

This document outlines the coding standards, style guides, and best practices to be followed for the ConventionCrasher project. Adherence to these standards will ensure code consistency, readability, and maintainability.

*(Current Date: 2025-05-09)*

## 1. Architectural / Design Patterns Adopted

The key architectural patterns are detailed in `docs/architecture.md`. These include:
* **Collocated Frontend & Backend (Monolithic Next.js App)**
* **Developer Local-First**
* **RESTful APIs** (via Next.js API Routes / Server Actions)
* **ORM (Prisma)** for database interaction
* **Component-Based UI (React with Material UI)**
* Other patterns as outlined in `docs/architecture.md` under "Key Architectural Decisions & Patterns."

## 2. Coding Standards

* **Primary Language:** TypeScript (`~5.x`, latest stable compatible with Next.js).
    * Enable and adhere to `strict` mode in `tsconfig.json`.
* **Primary Runtime:** Node.js (`20.x LTS`).
* **Style Guide & Linter:**
    * **ESLint:** Configured with `eslint-config-next` for Next.js specific rules, and potentially plugins for React hooks, accessibility (jsx-a11y), and TypeScript (`@typescript-eslint/eslint-plugin`).
        * Configuration: `.eslintrc.json`
    * **Prettier:** Used for automatic code formatting to ensure consistent style.
        * Configuration: `.prettierrc.json`, `.prettierignore`
    * Run linters and formatters as part of pre-commit hooks (e.g., using Husky and lint-staged) and in CI pipelines.
* **Naming Conventions:**
    * **Variables & Functions:** `camelCase` (e.g., `userName`, `calculateTotal`)
    * **Classes, React Components, Types, Interfaces, Enums:** `PascalCase` (e.g., `UserProfile`, `ConventionCard`, `PaymentStatus`)
    * **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_ITEMS`, `DEFAULT_TIMEOUT`)
    * **Files:**
        * TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`): `kebab-case.ts` (e.g., `user-profile.tsx`) or `PascalCase.tsx` for React components (e.g., `UserProfile.tsx`). Let's standardize on **`PascalCase.tsx` for React components** and **`kebab-case.ts` for non-component files (utilities, services, API routes).**
        * Style files (if any separate): `kebab-case.module.css`
    * **API Endpoints:** `kebab-case` and plural for resource collections (e.g., `/api/conventions`, `/api/users/{userId}/profile`).
* **File Structure:** Adhere to the layout defined in `docs/project-structure.md`.
* **Asynchronous Operations:**
    * Use `async/await` for all asynchronous operations.
    * Properly handle Promises and avoid unhandled rejections.
* **Type Safety:**
    * Leverage TypeScript's static typing extensively. Avoid `any` where possible; prefer explicit types or `unknown`.
    * Utilize types generated by Prisma for database entities.
    * Define custom shared types and interfaces in `src/types/` or within relevant feature/component directories if locally scoped.
* **Comments & Documentation:**
    * **JSDoc/TSDoc:** Use for documenting functions, classes, types, and complex logic. Explain *why* something is done, not just *what*.
    * **Component Documentation:** For reusable React components, document props, usage examples, and any important behavioral notes. Consider Storybook for component development and documentation if complexity warrants it in the future (post-MVP).
    * **READMEs:** Maintain a main `README.md` for project setup and overview. Consider READMEs in subdirectories for complex modules if needed.
* **Dependency Management:**
    * **Package Manager:** `npm` (default with `create-next-app`) or `yarn` / `pnpm` if preferred by the team (standardize on one). Let's assume `npm` for now.
    * **Adding Dependencies:** Before adding a new dependency, evaluate its necessity, bundle size impact, maintenance status, and security vulnerabilities. Discuss with the team if it's a significant addition.
    * Regularly review and update dependencies (`npm outdated`, `npm update`). Use `npm audit` to check for vulnerabilities.
* **React Specifics:**
    * Prefer functional components with Hooks over class components.
    * Follow rules of Hooks (e.g., call Hooks at the top level).
    * Use `key` props correctly when rendering lists.
    * Optimize performance using `React.memo`, `useMemo`, `useCallback` where appropriate, but avoid premature optimization. Profile first.
    * State Management: Use local component state (`useState`, `useReducer`) by default. For cross-component state, use React Context. For more complex global state, a simple global state manager like Zustand may be considered if Context API becomes unwieldy (as noted in `architecture.md`).
    * Material UI: Utilize MUI components according to their documentation, prefer `sx` prop for one-off styles or theme-aware styling.

## 3. Error Handling Strategy

* **General Approach:**
    * Use standard JavaScript `try/catch` blocks for synchronous and `async/await` operations that can fail.
    * Define custom error classes extending `Error` for specific application errors if needed (e.g., `NotFoundError`, `ValidationError`, `PermissionError`) to allow for more granular error handling and appropriate HTTP responses.
* **API Error Responses:**
    * API routes should return consistent JSON error responses with appropriate HTTP status codes (e.g., 400 for validation errors, 401 for unauthorized, 403 for forbidden, 404 for not found, 500 for server errors).
    * Include a clear error message and potentially an error code or type in the response body.
* **Logging:**
    * **Local Development:** Use `console.log`, `console.warn`, `console.error` for simplicity.
    * **Production/Staging:** Implement structured logging (e.g., JSON format). While Next.js has some built-in logging, for more advanced needs, a library like `Pino` could be integrated later. Log relevant context (e.g., request ID, user ID if available, error stack traces).
    * Log key events, errors, and unexpected behavior. Avoid logging sensitive information.
* **Input Validation:**
    * Validate all incoming data from external sources (API requests, form submissions).
    * Use a library like `Zod` (as suggested in `project-structure.md` for `src/lib/validators.ts`) to define schemas and validate data. Provide clear validation error messages to the client.
* **Frontend Error Handling:**
    * Display user-friendly error messages. Avoid exposing raw error details or stack traces to end-users.
    * Use Error Boundaries in React to catch errors in component trees and display a fallback UI.

## 4. Security Best Practices

* **Input Sanitization/Validation:**
    * Always validate and sanitize data received from users or external systems to prevent injection attacks (XSS, SQLi - though Prisma helps with SQLi). Use Zod for validation.
    * When rendering user-generated content in HTML, ensure it's properly escaped/sanitized to prevent XSS (React largely handles this for content within JSX, but be careful with `dangerouslySetInnerHTML`).
* **Secrets Management:**
    * As defined in `docs/environment-vars.md`: Store all secrets (API keys, database URLs, `NEXTAUTH_SECRET`) in environment variables. Never commit them to the repository. Use platform-specific secrets management for production.
* **Dependency Security:**
    * Regularly run `npm audit` (or equivalent for other package managers) to check for known vulnerabilities in dependencies.
    * Use tools like GitHub's Dependabot to automate dependency updates and security alerts.
* **Authentication/Authorization:**
    * Implement robust authentication using Auth.js.
    * Enforce authorization checks on all protected API routes and server actions, verifying user roles and permissions before allowing access to resources or operations. Do not rely solely on client-side checks.
* **HTTPS:** Ensure HTTPS is enforced in production (typically handled by the hosting platform like Vercel/Netlify).
* **CSRF Protection:** Next.js API routes and Server Actions have some built-in protections or mechanisms. For traditional form submissions handled by API routes, ensure appropriate CSRF mitigation (e.g., Auth.js often handles this for its sign-in forms). For Server Actions, Next.js handles this.
* **Rate Limiting:** Consider rate limiting for sensitive API endpoints to prevent abuse (can be implemented at the API gateway level or with custom middleware, potentially a post-MVP enhancement).
* **HTTP Security Headers:** Configure appropriate security headers (e.g., `Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`). Next.js allows configuring custom headers.

## Change Log

| Change        | Date       | Version | Description                                     | Author         |
|---------------|------------|---------|-------------------------------------------------|----------------|
| Initial draft | 2025-05-09 | 0.1     | First draft of coding standards and patterns.     | Architect Agent |

---