# ConventionCrasher

A platform for [describe your platform briefly here - e.g., managing convention talent and events].

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 20.x LTS recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

Follow these steps to get your local development environment set up and running:

1.  **Clone the repository (if applicable):**
    ```bash
    # git clone <repository-url>
    # cd <repository-directory>
    ```
    (If you are already in the project directory, you can skip this step.)

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your local environment variables:**
    *   Copy the `.env.example` file to a new file named `.env.local`:
        ```bash
        # On Windows (PowerShell)
        Copy-Item .env.example .env.local
        
        # On macOS/Linux
        # cp .env.example .env.local 
        ```
    *   Open `.env.local` and update the following variables:
        *   `DATABASE_URL`: Replace `username` and `password` with the credentials you intend to use for your local PostgreSQL database (these should match what you configure in `docker-compose.yml` if you change the defaults there).
        *   `NEXTAUTH_SECRET`: Generate a strong secret. You can use the command `openssl rand -base64 32` (e.g., in Git Bash) or an online generator.

4.  **Start the PostgreSQL database container:**
    Make sure Docker Desktop is running.
    ```bash
    docker-compose up -d
    ```
    *Note: If you modified `POSTGRES_USER` or `POSTGRES_PASSWORD` in `docker-compose.yml` after the first run, you might need to run `docker-compose down -v` first to remove the old database volume and allow it to reinitialize with the new credentials.*

5.  **Run database migrations:**
    This will set up your database schema based on `prisma/schema.prisma`.
    ```bash
    npx dotenv -e .env.local -- prisma migrate dev
    ```
    *(You might be prompted to give your first migration a name, e.g., "init")*

6.  **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Available Scripts

In the project directory, you can run the following scripts:

-   `npm run dev`
    Runs the app in development mode.

-   `npm run build`
    Builds the app for production.

-   `npm start`
    Starts the production server (after running `npm run build`).

-   `npm run lint`
    Lints the codebase using ESLint.

-   `npx prisma studio`
    Opens Prisma Studio to view and manage your database.

-   `npx prisma migrate dev`
    Creates and applies new database migrations.

-   `npx prisma generate`
    Generates Prisma Client.
