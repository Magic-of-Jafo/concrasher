# Prisma Workflow for Stable Development

This document outlines the recommended workflow for using Prisma to manage your database schema. Following these practices will help prevent schema drift and the need to reset your development database.

## Core Principles

1.  **Always Use Migrations for Schema Changes**: This is the most critical rule. Migrations track schema changes over time and ensure consistency across environments.
2.  **Never Manually Edit the Database Schema**: All schema changes should go through Prisma.
3.  **Commit Migration Files**: Migration files are part of your codebase.
4.  **Understand `migrate dev` vs. `db push`**: Use the right tool for the job.

## Recommended Workflow

### 1. Making Schema Changes

*   **Edit `prisma/schema.prisma`**: Define your models, fields, and relations here.
*   **Create a Migration**:
    ```bash
    # Replace <descriptive_name> with a short, meaningful name (e.g., add-user-profile, update-convention-fields)
    npx dotenv-cli -e .env.local -- npx prisma migrate dev --name <descriptive_name>
    ```
    *   This command does two things:
        1.  Creates a new SQL migration file in the `prisma/migrations/` directory.
        2.  Applies this migration to your development database.
    *   Review the generated SQL in the migration file to understand the changes being made.

### 2. Regenerating Prisma Client

*   After any schema change (and successful migration), regenerate your Prisma Client:
    ```bash
    npx dotenv-cli -e .env.local -- npx prisma generate
    ```
    *   This ensures your client has the latest types and methods reflecting your schema.

### 3. Version Control

*   **Commit `prisma/schema.prisma`**: This is the source of truth for your schema.
*   **Commit the `prisma/migrations/` directory**: This directory contains all your migration files. Committing it allows other developers (and your CI/CD pipeline) to apply the same schema changes.
*   **Do NOT commit `.env.local`** or other environment-specific files containing secrets. Use a `.env.example` file.

### 4. Seeding Your Database (Optional but Recommended)

*   If you have reference data or initial data needed for development, create a seed script (e.g., `prisma/seed.ts` or `prisma/seed.js`).
*   Run the seed script with:
    ```bash
    npx dotenv-cli -e .env.local -- npx prisma db seed
    ```
    *   Define the `seed` command in your `package.json`:
        ```json
        // package.json
        "prisma": {
          "seed": "ts-node prisma/seed.ts" // or "node prisma/seed.js"
        }
        ```

### 5. Prototyping with `prisma db push` (Use with Caution)

*   `prisma db push` synchronizes your database schema with `prisma/schema.prisma` **without creating migration files**.
    ```bash
    npx dotenv-cli -e .env.local -- npx prisma db push
    ```
*   **When to use `db push`**:
    *   ONLY for initial prototyping or very early development phases where you are rapidly changing the schema and don't want to create many small migration files.
*   **When NOT to use `db push`**:
    *   Once your schema starts to stabilize or if you are collaborating with others.
    *   If you have used `db push` and now want to create a proper migration:
        1.  Ensure `prisma/schema.prisma` reflects the desired state.
        2.  Run `npx dotenv-cli -e .env.local -- npx prisma migrate dev --name <your-migration-name>`
            *   Prisma might detect that your database is already in the desired state and create an "empty" migration (or a migration with minimal changes), effectively "baselining" your `db push` changes into the migration history.

### 6. Handling Drift and Errors

*   **Drift Detected**: If Prisma reports "Drift detected", it means your database schema is out of sync with your migration history. This usually happens if:
    *   The database was changed manually (outside of Prisma migrations).
    *   A migration file was applied to the database but is now missing from your local `prisma/migrations` directory.
*   **Resolving Drift (Development Environment)**:
    1.  **Identify the cause**: Was a migration file deleted? Was the DB changed manually?
    2.  **If a migration file is missing**: Try to restore it from version control.
    3.  **If you must reset (last resort for dev)**:
        *   **BACK UP YOUR DATA FIRST if it's important!**
        ```bash
        npx dotenv-cli -e .env.local -- npx prisma migrate reset
        ```
        *   This command will:
            *   Drop your database (or schema).
            *   Recreate it.
            *   Re-run all existing migration files from your `prisma/migrations` directory.
            *   Run your seed script if configured.

### 7. Production Environment

*   **Never use `prisma migrate dev` or `prisma db push` in production.**
*   Use `prisma migrate deploy` to apply migrations in production:
    ```bash
    # Ensure DATABASE_URL is correctly set for production
    npx prisma migrate deploy
    ```
    *   This command applies all pending migrations from your `prisma/migrations` directory. It does not create new migrations or prompt for destructive actions.

## Summary of Key Commands

| Action                      | Command (with dotenv-cli)                                                  | Notes                                                     |
| :-------------------------- | :------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **Create & Apply Migration**  | `... prisma migrate dev --name <name>`                                     | **Primary way to change schema**                          |
| **Regenerate Client**       | `... prisma generate`                                                      | After any schema change                                   |
| **Apply Schema (No Migration)** | `... prisma db push`                                                       | Prototyping only; use with caution                        |
| **Seed Database**           | `... prisma db seed`                                                       | Requires `seed` script in `package.json`                  |
| **Reset Dev Database**      | `... prisma migrate reset`                                                 | **Deletes data!** Last resort for drift in dev.           |
| **Deploy Migrations (Prod)**| `npx prisma migrate deploy`                                                | Applies existing migrations to production (no dotenv-cli needed if env vars are set in prod environment) |

By adhering to this workflow, especially the "Always Use Migrations" principle, you will significantly reduce the chances of encountering database drift and the need for resets. 