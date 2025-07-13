# SEO Implementation Checklist

This checklist breaks down the work required to implement SEO features into actionable steps.

## 1. Database Schema Changes

- [x] **Create `SEOSetting` Model:** Add a new model to `prisma/schema.prisma` for global SEO settings. This model is designed as a singleton to ensure there's only one row for site-wide defaults, leaving the existing `SiteSetting` model untouched.

  ```prisma
  model SEOSetting {
  id                 String   @id @default("singleton")
  defaultKeywords    String[] @default([])
  siteTitleTemplate  String?
  siteDescription    String?
  updatedAt          DateTime @updatedAt
}
  ```

- [x] **Update `Convention` Model:** Add a `keywords` field to the `Convention` model in `prisma/schema.prisma` to store SEO keywords specific to each convention.

  ```prisma
  // In model Convention
  // ... existing fields
  keywords String[] @default([])
  ```
- [ ] **Verify `Convention` Model:** The `keywords` field already exists on the `Convention` model. No change is needed.

- [ ] **Apply Schema Changes:** After updating the schema, push the changes to the database using `db push` instead of `migrate dev`. **Note:** Ensure your `.env.local` file is used for the database connection.

  ```bash
  # The prisma CLI automatically uses .env.local if present
  npx prisma db push
  ```

## 2. Backend & Core Logic

- [ ] **Create Site Settings API Endpoints:**
  - [ ] **GET `/api/admin/seo-settings`:** Create an endpoint to fetch the global site settings.
  - [ ] **POST `/api/admin/seo-settings`:** Create an endpoint to create or update the site settings. Use an `upsert` operation to manage the singleton record.

- [ ] **Update Convention Creation Logic:**
  - [ ] Modify the service or action responsible for creating a new convention.
  - [ ] When a new convention is created, it must fetch `defaultKeywords` from the `SEOSetting` model.
  - [ ] The new convention's `keywords` field must be pre-populated with a copy of these default keywords.

## 3. Admin SEO Settings UI

- [ ] **Create Admin SEO Settings Page:**
  - [ ] In the main admin dashboard, add a new settings page or tab labeled "SEO".
  - [ ] This page should use the `/api/admin/seo-settings` endpoint to load and display the current settings.

- [ ] **Implement Global Settings Form:**
  - [ ] **Default Keywords:** Implement a UI component that allows an admin to add, edit, and remove keywords from the `defaultKeywords` list.
  - [ ] **Site Title Template:** Add a text input for `siteTitleTemplate`. Include helper text explaining that `%s` will be replaced with the page title.
  - [ ] **Default Site Description:** Add a textarea for the `siteDescription`.
  - [ ] **Save Functionality:** Ensure a "Save" button sends the updated settings to your backend.

## 4. Convention Organizer SEO UI

- [ ] **Create Convention-Specific SEO UI:**
  - [ ] In the settings page for an individual convention, add a section or tab labeled "SEO".
  - [ ] This UI will manage the `keywords` for the specific convention being edited.

- [ ] **Implement Keywords Management:**
  - [ ] Display the list of keywords for the current convention.
  - [ ] Allow organizers to add new keywords to their convention's list.
  - [ ] Allow organizers to remove keywords.
  - [ ] **Crucially:** Ensure that changes made here only affect the specific convention and do not alter the global `SiteSetting` defaults.

## 5. Frontend Metadata Implementation

- [ ] **Implement `generateMetadata` for Convention Pages:**
  - [ ] In your dynamic convention page (e.g., `app/conventions/[slug]/page.tsx`), implement the `generateMetadata` function from Next.js.
  - [ ] Inside this function, fetch the data for the specific convention being viewed.
  - [ ] **Title:** Construct the page title using the convention's name and the `siteTitleTemplate` from `SEOSetting`. Fall back gracefully if the template is not set.
  - [ ] **Description:** Use the convention's own description. If it's missing, fall back to the `siteDescription` from `SEOSetting`.
  - [ ] **Keywords:** Use the convention's specific `keywords` array. If the array is empty, fall back to the `defaultKeywords` from `SEOSetting`.