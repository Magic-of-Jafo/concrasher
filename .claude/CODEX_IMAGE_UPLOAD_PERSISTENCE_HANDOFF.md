# External Investigation Handoff: Image Upload Persistence

> **Source notice:** This note was created by OpenAI Codex on 2026-07-11, not by Claude. It is an outside-agent handoff intended for Claude to review and verify before implementing fixes.

## Reported behavior

On localhost, some convention cover images and hotel/venue images appear immediately after upload, then disappear after one or more refreshes. Codex found multiple persistence-order and stale-state problems that can independently produce this behavior.

No application code or database/S3 data was changed during this investigation.

## Confirmed evidence

- Local development uses PostgreSQL database `conventioncrasher_dev` on localhost.
- Local development writes to the shared S3 bucket `convention-crasher` in `us-east-1`.
- `src/app/api/upload/route.ts` writes convention cover/profile/gallery uploads to S3.
- `src/app/api/upload-image/route.ts` writes venue/hotel photos to S3.
- A read-only audit found 32 S3-backed image references in the local database: 31 objects exist, while one referenced object is missing.
- The broken reference is the Melbourne Magic Festival 2026 cover:
  - Convention ID: `cmqb5y7ba0001ei2gfjuaddtq`
  - URL: `https://convention-crasher.s3.us-east-1.amazonaws.com/uploads/cmqb5y7ba0001ei2gfjuaddtq/cover/cover-image.png`
  - S3 returns 404 and the convention's entire `cover/` prefix is empty.
- Other PNG and JPEG objects are healthy. This is not a general file-format problem.
- Bucket lifecycle/version history was unavailable because the application IAM user lacks bucket-level inspection permissions.

## Root cause 1: hotel/venue uploads are only partially persisted

Relevant files:

- `src/components/shared/ImageUploadInput.tsx`
- `src/components/organizer/convention-editor/HotelForm.tsx`
- `src/components/organizer/convention-editor/PrimaryVenueForm.tsx`
- `src/components/organizer/convention-editor/VenueHotelTab.tsx`
- `src/components/organizer/convention-editor/ConventionEditorTabs.tsx`
- `src/app/api/organizer/conventions/[id]/route.ts`

Current sequence:

1. `ImageUploadInput` creates an immediate browser preview.
2. It posts to `/api/upload-image`, which writes a UUID-named object to S3.
3. `onUploadComplete(result.url)` updates only in-memory hotel/venue form state.
4. The `HotelPhoto` or `VenuePhoto` database record is not written until page-wide **Save Changes**.

Refreshing or leaving before **Save Changes** discards the selection while leaving an orphaned S3 file. The preview misleadingly looks fully saved.

## Root cause 2: hotel/venue removal deletes S3 before the database

`ImageUploadInput.handleRemove` clears local state and immediately calls `DELETE /api/upload-image`, but the database photo record is not cleared until page-wide save.

If the user refreshes, leaves, or the later save fails, the database still points to the deleted object. This can directly create a broken reference like the one confirmed above.

## Root cause 3: Save Changes can restore stale cover/profile URLs

Relevant files:

- `src/components/organizer/convention-editor/CoverImageUploader.tsx`
- `src/components/organizer/convention-editor/ProfileImageUploader.tsx`
- `src/components/organizer/convention-editor/MediaTab.tsx`
- `src/components/organizer/convention-editor/ConventionEditorTabs.tsx`

Cover/profile uploaders upload to S3 and immediately send an image-only `PUT`, so their URLs are initially persisted. However, `ConventionEditorTabs` also copies these fields into `basicInfoData`:

```ts
const { priceTiers, priceDiscounts, id, venueHotel, ...basicDataFromInitial } = initialConventionData || {};
```

Because cover/profile fields are not excluded, that state can retain old URLs. `MediaTab` updates only its own state. Page-wide save later spreads `basicInfoData` into its payload and can write the old URL back.

Dangerous sequence:

1. Editor loads an existing cover URL.
2. User removes it. The uploader deletes S3 and sets the database field to `null`.
3. `basicInfoData` still contains the old URL.
4. User clicks **Save Changes**.
5. The stale URL is restored, pointing to the deleted object.

This is consistent with the confirmed Melbourne record.

## Root cause 4: localhost and production storage are not isolated

The local database is separate, but localhost writes to the shared `convention-crasher` S3 bucket.

Risks:

- Matching local/production convention IDs use the same deterministic cover/profile keys.
- A localhost upload can overwrite bytes used by the live site.
- A localhost removal can delete a live object while only the local database changes.
- Hotel/venue UUID keys reduce collisions, but localhost still creates production-bucket objects/orphans and can delete shared URLs.
- Deploying code does not copy local database relationships to production.

## Additional concern: deterministic cover/profile keys

`/api/upload` normally reuses names such as `cover-image.png`, `cover-image.jpg`, `profile-image.png`, or `profile-image.jpg`. Reused keys cause overwrite and browser/CDN cache risks, especially when processing changes the output format. Use unique/versioned keys.

## Recommended repair plan

### 1. Isolate development storage first

Use a separate development S3 bucket (for example, `convention-crasher-dev`) or mandatory `dev/` and `prod/` prefixes. Development should fail closed if configured to write to the production prefix.

### 2. Define one persistence contract

- Keep cover/profile immediate persistence, but synchronize the canonical URL into every state that can submit it.
- Alternatively, omit cover/profile fields from page-wide save because the dedicated uploaders own them.
- Auto-save hotel/venue photo relationships after upload, or clearly mark them pending until **Save Changes** succeeds.
- Prefer one server operation that uploads and associates the image.

### 3. Make removal database-first

- Clear/change the database reference first.
- Delete the old S3 object only after persistence succeeds.
- If S3 cleanup fails, log/queue cleanup rather than leaving a broken database reference.
- Never delete storage solely because client-side state changed.

### 4. Eliminate stale editor state

- Do not place media-owned fields in `ConventionEditorTabs.basicInfoData`.
- If global save owns them, propagate `MediaTab` changes to canonical parent state.
- After save, refetch/replace state with the complete convention including nested photo IDs and URLs.
- The organizer `PUT` currently returns the core convention rather than rebuilt nested venue/hotel data; return or refetch the complete saved model.

### 5. Use unique/versioned keys

Use keys such as `uploads/{conventionId}/cover/{uuid}.jpg`. Persist the new URL before deleting the previous key.

### 6. Repair and audit existing data

- Re-upload or clear the Melbourne Magic Festival cover reference.
- Audit convention, venue, hotel, user, brand, production, and gallery URLs against S3.
- Report missing references separately from orphaned objects.
- Do not automatically delete orphans until development and production storage are isolated.

## Verification checklist

Test PNG and JPEG sources:

1. Upload cover/profile images and refresh immediately.
2. Upload, click page-wide **Save Changes**, and refresh repeatedly.
3. Replace/remove, click page-wide save, and verify stale URLs never return.
4. Upload hotel/venue photos and test refresh before and after save.
5. Remove a hotel/venue photo while forcing a database failure; confirm no database row points to a deleted object.
6. Confirm localhost writes only to development storage and production only to production storage.
7. Confirm replacements receive new URLs and bypass stale caches.
8. Run a database-to-S3 integrity audit and confirm zero broken references.

## Working-tree caution
At the time Codex created this note, the working tree contained intentional application changes plus unrelated `.impeccable`, enrichment-result, and video artifacts. Preserve scope and do not reset or commit unrelated files.
