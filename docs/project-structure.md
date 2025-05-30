# ConventionCrasher Project Structure

This document defines the standard directory and file structure for the ConventionCrasher Next.js application. Adhering to this structure will ensure consistency and maintainability.

```plaintext
conventioncrasher/
├── .github/                    # GitHub specific files (e.g., Actions for CI/CD)
│   └── workflows/
│       └── main.yml            # Example CI/CD workflow
├── .vscode/                    # VSCode editor settings (optional)
│   └── settings.json
├── docs/                       # Project documentation (PRD, Architecture, Epics, etc.)
│   ├── architecture.md
│   ├── tech-stack.md
│   ├── project-structure.md    # This file
│   ├── data-models.md
│   ├── api-reference.md
│   ├── environment-vars.md
│   ├── coding-standards.md
│   ├── testing-strategy.md
│   ├── ui-ux.md
│   ├── epic1.md
│   └── ...                     # Other .md files
├── prisma/                     # Prisma ORM files
│   ├── schema.prisma           # Main database schema definition
│   ├── migrations/             # Database migration files (generated by Prisma)
│   └── seed.ts                 # (Optional) Script for seeding database with initial data
├── public/                     # Static assets directly served at the root
│   ├── images/                 # E.g., favicons, static site logos
│   └── ...
├── src/                        # Main application source code
│   ├── app/                    # Next.js App Router: Pages, Layouts, API Routes
│   │   ├── (api)/              # API routes (e.g., src/app/api/conventions/route.ts)
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts # Auth.js route handler
│   │   ├── (auth)/             # Auth-related pages (e.g., login, register)
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (main)/             # Main application pages after login
│   │   │   ├── layout.tsx
│   │   │   └── conventions/
│   │   │       └── page.tsx
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Root page (homepage)
│   │   └── globals.css         # Global styles
│   ├── components/             # Reusable React components (UI)
│   │   ├── ui/                 # General-purpose UI components (e.g., buttons, cards - often from MUI or customized)
│   │   ├── layout/             # Layout components (e.g., Header, Footer, Sidebar)
│   │   └── features/           # Components specific to certain features (e.g., ConventionCard, ProfileForm)
│   ├── lib/                    # Shared libraries, helper functions, core logic
│   │   ├── actions.ts          # Server Actions (data mutations, server-side logic callable from components)
│   │   ├── auth.ts             # Auth.js configuration options and helper functions
│   │   ├── db.ts               # Prisma client instance and database utilities
│   │   ├── utils.ts            # General utility functions
│   │   └── validators.ts       # Validation schemas/functions (e.g., with Zod)
│   ├── middleware.ts           # Next.js middleware (e.g., for route protection)
│   └── types/                  # Shared TypeScript type definitions
│       └── index.ts
├── tests/                      # Automated tests
│   ├── __mocks__/              # Manual mocks for Jest
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests (e.g., with Playwright)
├── .env.local                  # Local environment variables (git-ignored)
├── .env.example                # Example environment variables template
├── .eslintignore
├── .eslintrc.json              # ESLint configuration
├── .gitignore
├── .prettierignore
├── .prettierrc.json            # Prettier configuration
├── next.config.mjs             # Next.js configuration
├── package.json
├── postcss.config.js           # PostCSS configuration (for Tailwind CSS)
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Key Directory Descriptions

* **`docs/`**: Contains all project planning, architecture, and reference documentation (like this file).
* **`prisma/`**: Holds the Prisma schema (`schema.prisma`), generated migration files, and optional seed scripts. This is central for database structure and evolution.
* **`public/`**: Stores static assets like images, favicons, etc., that are served directly.
* **`src/`**: The heart of the application code.
    * **`src/app/`**: Core of the Next.js App Router.
        * Route groups like `(api)`, `(auth)`, `(main)` are used for organization without affecting URL paths.
        * `layout.tsx` and `page.tsx` files define UI structure and content for routes.
        * API routes (e.g., `src/app/api/.../route.ts`) handle backend requests.
        * Auth.js handler `src/app/api/auth/[...nextauth]/route.ts` is standard.
    * **`src/components/`**: Contains reusable React components.
        * `ui/`: General, often atomic, UI elements. Could be wrappers around MUI components or custom ones.
        * `layout/`: Components defining page structure (headers, footers).
        * `features/`: More complex components tied to specific application features.
    * **`src/lib/`**: Shared modules, helper functions, and core logic not directly tied to a UI component or API route.
        * `actions.ts`: Server Actions for data mutations and server-side logic called from components.
        * `auth.ts`: Configuration and helper utilities for Auth.js.
        * `db.ts`: Prisma client instantiation and potentially common database utility functions.
        * `utils.ts`: General, reusable utility functions.
        * `validators.ts`: Data validation schemas (e.g., using Zod) for forms and API inputs.
    * **`src/middleware.ts`**: For Next.js middleware logic (e.g., protecting routes based on authentication status).
    * **`src/types/`**: Global or shared TypeScript type definitions.
* **`tests/`**: Houses automated tests.
    * Unit tests for specific functions/components might also be collocated with the source files (e.g., `src/components/ui/Button.test.tsx`) if preferred, but a general `tests/` directory is also common. `__mocks__` for Jest manual mocks. `integration/` for tests involving multiple components/modules. `e2e/` for Playwright tests simulating full user flows.
* **Root Directory Files**: Standard configuration files for Node.js (`package.json`), Next.js (`next.config.mjs`), TypeScript (`tsconfig.json`), ESLint, Prettier, Tailwind CSS, Git, Docker, and environment variables.

## Notes for AI Agent Implementation

* **Clarity and Convention:** This structure follows common Next.js App Router conventions, making it easier for AI agents familiar with the framework.
* **Separation of Concerns:** Logical separation (UI in `components/` & `app/`, API in `app/api/`, business logic in `lib/actions.ts` or services, data access via `lib/db.ts`) helps agents understand where to find or place specific types of code.
* **Type Definitions:** Centralized (or feature-specific) type definitions in `src/types/` will be crucial for AI understanding and code generation.
* **Reusable Components:** Well-defined reusable components in `src/components/` will be easier for AI to leverage.

## Change Log

| Change        | Date       | Version | Description                                     | Author         |
|---------------|------------|---------|-------------------------------------------------|----------------|
| Initial draft | 2025-05-09 | 0.1     | First draft based on Next.js App Router conventions. | Architect Agent |

---