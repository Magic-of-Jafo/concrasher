# ConventionCrasher Environment Variables

This document outlines the environment variables required and used by the ConventionCrasher application.

*(Current Date: 2025-05-09)*

## Configuration Loading Mechanism

* **Local Development:** Environment variables are primarily loaded from a `.env.local` file at the root of the project. This file should be git-ignored. A `.env.example` file will be maintained in the repository with placeholder values for all non-sensitive variables and descriptions for sensitive ones.
* **Deployment (Staging/Production):** Environment variables will be set through the configuration settings of the chosen hosting platform (e.g., Vercel, Netlify, or AWS services). Sensitive variables must be stored securely using the platform's secrets management capabilities.

## Required & Optional Variables

| Variable Name             | Description                                                                 | Example / Default Value                               | Required? (Yes/No) | Sensitive? (Yes/No) | Notes                                                                                                |
| :------------------------ | :-------------------------------------------------------------------------- | :---------------------------------------------------- | :----------------- | :------------------ | :--------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                | Specifies the runtime environment.                                          | `development`, `production`, `test`                   | Yes                | No                  | Next.js uses this to enable/disable features.                                                        |
| `DATABASE_URL`            | Connection string for the PostgreSQL database.                              | `postgresql://user:pass@host:port/db?schema=public`   | Yes                | Yes                 | Used by Prisma. Includes credentials.                                                                |
| `NEXTAUTH_URL`            | The canonical URL of your site.                                             | `http://localhost:3000` (for dev)                     | Yes                | No                  | Used by Auth.js for redirects, callbacks. In production, set to the deployed site URL.               |
| `NEXTAUTH_SECRET`         | A random string used to hash tokens, sign cookies, and generate secrets.    | (Generate a strong random string)                     | Yes                | Yes                 | Critical for Auth.js security.                                                                       |
| `NEXT_PUBLIC_APP_URL`     | Public base URL of the application (client-side accessible).                | `http://localhost:3000` (for dev)                     | No                 | No                  | Useful if client-side code needs to construct absolute URLs. `NEXT_PUBLIC_` prefix makes it available client-side. |
| `PORT`                    | Port the Next.js application listens on (if not managed by platform).       | `3000`                                                | No                 | No                  | Often handled by the hosting platform.                                                               |
|                           |                                                                             |                                                       |                    |                     |                                                                                                      |
| **Media Storage (Production)** |                                                                             |                                                       |                    |                     | *These are for cloud object storage in production. For local dev, the app will use the local file system.* |
| `MEDIA_STORAGE_PROVIDER`  | Specifies the cloud provider for media storage (`s3`, `cloudinary`, etc.).  | `s3` (example)                                        | No (Yes for Prod)  | No                  | Helps the app decide which SDK/logic to use. If not set, might default to local storage.             |
| `AWS_S3_BUCKET_NAME`      | Name of the S3 bucket for media storage.                                    | `your-conventioncrasher-media`                        | No (Yes for Prod S3)| No                  | Required if `MEDIA_STORAGE_PROVIDER="s3"`.                                                         |
| `AWS_S3_REGION`           | AWS region for the S3 bucket.                                               | `us-east-1`                                           | No (Yes for Prod S3)| No                  | Required if `MEDIA_STORAGE_PROVIDER="s3"`.                                                         |
| `AWS_ACCESS_KEY_ID`       | AWS Access Key ID for S3 access.                                            |                                                       | No (Yes for Prod S3)| Yes                 | Required if `MEDIA_STORAGE_PROVIDER="s3"`.                                                         |
| `AWS_SECRET_ACCESS_KEY`   | AWS Secret Access Key for S3 access.                                        |                                                       | No (Yes for Prod S3)| Yes                 | Required if `MEDIA_STORAGE_PROVIDER="s3"`.                                                         |
| `CLOUDINARY_URL`          | Cloudinary environment variable (if using Cloudinary instead of S3).        | `cloudinary://api_key:api_secret@cloud_name`          | No (Yes for Prod Cloudinary) | Yes                 | Required if `MEDIA_STORAGE_PROVIDER="cloudinary"`.                                                 |
|                           |                                                                             |                                                       |                    |                     |                                                                                                      |
| **OAuth Providers (Future)** |                                                                             |                                                       |                    |                     | *These would be needed if integrating OAuth providers with Auth.js (e.g., Google, GitHub)* |
| `GITHUB_ID`               | GitHub OAuth App Client ID.                                                 |                                                       | No                 | No                  | For GitHub login via Auth.js.                                                                        |
| `GITHUB_SECRET`           | GitHub OAuth App Client Secret.                                             |                                                       | No                 | Yes                 | For GitHub login via Auth.js.                                                                        |
| `GOOGLE_CLIENT_ID`        | Google OAuth App Client ID.                                                 |                                                       | No                 | No                  | For Google login via Auth.js.                                                                        |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth App Client Secret.                                             |                                                       | No                 | Yes                 | For Google login via Auth.js.                                                                        |

## Notes

* **`.env.example` File:** An `.env.example` file **must** be maintained in the root of the repository. It should list all environment variables used by the application, with non-sensitive defaults or placeholders (e.g., `YOUR_API_KEY_HERE`). This file serves as a template for developers to create their `.env.local` file.
* **Secrets Management:** All sensitive variables (marked `Yes` in the "Sensitive?" column) must **never** be committed to the Git repository (ensure `.env.local` or similar are in `.gitignore`). In production and staging environments, these secrets must be injected securely through the hosting platform's environment variable settings or a dedicated secrets management service.
* **Validation:** Consider implementing a startup check in the application to ensure all `Required` environment variables are present and, where possible, have valid formats to prevent runtime errors due to misconfiguration.
* **Client-side Access:** Only variables prefixed with `NEXT_PUBLIC_` are exposed to the client-side browser bundle in Next.js. Use this prefix with caution and only for non-sensitive configuration.

## Change Log

| Change        | Date       | Version | Description                                     | Author         |
|---------------|------------|---------|-------------------------------------------------|----------------|
| Initial draft | 2025-05-09 | 0.1     | First draft listing core and anticipated variables. | Architect Agent |

---