# ConventionCrasher Technology Stack

This document outlines the key technologies chosen for the ConventionCrasher platform. All versions noted are the target versions at the start of development (hypothetically May 2025) and should be the latest stable releases at that time unless otherwise specified for LTS reasons.

## Technology Choices

| Category             | Technology                      | Version / Details                                  | Description / Purpose                                     | Justification (Optional)                                                                 |
| :------------------- | :------------------------------ | :------------------------------------------------- | :-------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **Languages** | TypeScript                      | `~5.x` (latest stable compatible with Next.js)     | Primary language for frontend and backend development     | Type safety, improved maintainability, excellent Next.js/React ecosystem support.      |
| **Runtime** | Node.js                         | `20.x LTS`                                         | Server-side JavaScript execution environment for Next.js  | LTS for stability and long-term support; required by Next.js.                         |
| **Frameworks** | Next.js                         | `~14.x` or newer (latest stable, App Router)       | Full-stack React framework for UI and API                 | PRD requirement; enables collocated frontend/backend, SSR, SSG, API routes.              |
|                      | React                           | `~18.x` (bundled with Next.js)                     | JavaScript library for building user interfaces         | Core of Next.js; component-based UI development.                                         |
| **Databases** | PostgreSQL                      | `16.x`                                             | Primary relational data store                             | PRD requirement; robust, open-source, feature-rich RDBMS.                                |
| **ORM** | Prisma                          | `~5.x` or newer (latest stable)                    | Object-Relational Mapper for database interaction         | PRD requirement; type-safe database access, schema migrations, integrates well with TS. |
| **UI Libraries** | Material UI (MUI)               | `~v6.x` or `~v7.x` (latest stable)                 | React component library for building the UI               | User preference for large knowledge base; comprehensive, accessible components.        |
| **Authentication** | NextAuth.js                     | `~v4.x` (e.g., ^4.24.11)                           | Authentication and session management for Next.js         | PRD requirement; flexible, secure, standard for Next.js.                               |
| **Cloud Platform** | *To Be Determined* | Vercel, Netlify, or AWS                            | Hosting platform for production                           | Final decision pending; Vercel/Netlify are strong candidates for Next.js.                |
| **Cloud Services** | Managed PostgreSQL              | (e.g., Neon, Supabase, Railway, AWS RDS)           | Production database hosting                               | Reduces operational overhead, ensures reliability and scalability.                       |
|                      | Object Storage                  | (e.g., AWS S3, Cloudinary, Backblaze B2)           | Production media file storage                             | Scalable, durable, cost-effective for user uploads.                                    |
| **Infrastructure** | Docker                          | Latest stable                                      | Containerization for local development (PostgreSQL)       | Ensures consistent local development environment.                                        |
|                      | IaC Tools (If needed)           | (e.g., Terraform, AWS CDK)                         | Infrastructure as Code for cloud resources              | For managing non-PaaS resources; may be minimal if using integrated PaaS.                |
| **CI/CD** | GitHub Actions / Platform CI/CD | Integrated with Git repository                     | Continuous Integration and Continuous Deployment        | Automated testing, building, and deployment to various environments.                   |
| **Testing** | Jest                            | Latest stable                                      | Unit/Integration testing framework (initial thought)    | Popular for React/Next.js; to be confirmed in `testing-strategy.md`.                   |
|                      | Playwright                      | Latest stable                                      | End-to-end testing framework (initial thought)        | Powerful for E2E browser automation; to be confirmed in `testing-strategy.md`.       |
| **Local Dev Tools** | `create-next-app`               | Latest stable                                      | Project scaffolding                                       | Official tool for initializing Next.js projects.                                       |

## Change Log

| Change        | Date       | Version | Description                  | Author         |
|---------------|------------|---------|------------------------------|----------------|
| Initial draft | 2025-05-09 | 0.1     | First draft based on architectural decisions. | Architect Agent |

---