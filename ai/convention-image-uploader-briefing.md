Certainly. Below is a comprehensive, formal developer briefing that clearly distinguishes between Cover and Profile image logic and requirements.

---

# Developer Briefing: Image Upload, Crop, and Export Logic (Cover vs. Profile)

## 1. Overview

This briefing defines the requirements for user-uploaded image handling on the platform. **Cover** and **Profile** images must each be treated with dedicated, isolated logic to ensure that changes to one do not impact the other. Both processes require a high-quality preview and allow user adjustments before final export and upload.

**Context:** This functionality is implemented within the Convention Editor's Media tab, where Convention Organizers can upload promotional photos, video links (YouTube and Vimeo), Cover images, and Profile images.

---

## 2. Cover Image

**Purpose:** Displayed as a wide banner (851×315px). Must fill the target frame with no empty space.
**File Output:** PNG, no transparency.

### Requirements

1. **Isolation:**

   * Logic for Cover image upload, preview, and save must be fully independent from Profile image logic.

2. **Image Fit Mode:**

   * The uploaded image is scaled to fully 'cover' the crop preview window (as in CSS `background-size: cover`), with no blank space at any edge.
   * If aspect ratio mismatches, image overflows on one axis; user can reposition image in this axis within bounds (no blank space).

3. **User Controls:**

   * User can drag the image within allowable bounds to select the framing.
   * User can zoom in (scale up) but not zoom out below the point of full coverage.
   * Preview updates live as the user interacts.

4. **Export and Persistence:**

   * No modification to original until 'Upload' is pressed.
   * On upload, export the selected region as a PNG (no transparency) matching the frame dimensions.
   * Save image to the upload folder and write the URL to the database.
   * Edit form must always display the current Cover image if present.
   * Below the image, provide a 'Remove Cover Image (Permanent)' link. This removes both the file and the database URL.

---

## 3. Profile Image

**Purpose:** Displayed as an avatar (400×400px). Accepts any aspect ratio; requires transparent output if image is not square.
**File Output:** PNG with transparency.

### Requirements

1. **Isolation:**

   * Logic for Profile image upload, preview, and save must be fully independent from Cover image logic.

2. **Image Fit Mode:**

   * The uploaded image is displayed using 'contain' mode (as in CSS `background-size: contain`). The entire longer dimension of the image fits within the crop preview window.
   * Any extra space along the short dimension is rendered as transparent in the preview and in the final PNG.
   * The image is centered within the frame.

3. **User Controls:**

   * User may zoom in (scale up), but not zoom out below the point where the longer dimension is fully within the crop area.
   * User can reposition (drag) the image, but never drag the *longer* dimension out of the frame. Movement on the shorter axis is permitted only as allowed by the crop area; surplus space is always transparent.
   * The preview updates live as the user adjusts.

4. **Export and Persistence:**

   * No modification to the original until 'Upload' is pressed.
   * On upload, export the selected region as a PNG (with transparency) matching the frame dimensions.
   * Any empty (non-image) space in the final PNG must be transparent.
   * Save the image to the upload folder and write the URL to the database.
   * Edit form must always display the current Profile image if present.
   * Below the image, provide a 'Remove Profile Image (Permanent)' link. This removes both the file and the database URL.

---

## 4. Technical Specifications

### File Handling
* **Maximum File Size:** 3MB
* **Supported Formats:** Most common image formats including JPEG, PNG, WebP, and others
* **Maximum Dimensions:** 10,000 pixels on all sides (validation required)
* **Output Dimensions:** 
  - Cover: 851×315px
  - Profile: 400×400px
* **Image Quality:** Light compression applied to optimize file size while maintaining visual quality

### Preview Requirements
* **Crop Preview:** Must match exact aspect ratio of output dimensions
* **Cover Preview:** 851×315 aspect ratio miniature
* **Profile Preview:** 400×400 (square) aspect ratio miniature

### File Storage
* **Cover Images:** `public\uploads\convention-covers\{uuid}.png`
* **Profile Images:** `public\uploads\convention-profiles\{uuid}.png`
* **Database:** Schema already prepared with `coverImageUrl` and `profileImageUrl` fields in Convention model

### Workflow for Existing Images
1. When Media tab opens, display current Cover and Profile images if they exist
2. User cannot add/update images without first clicking "Remove [Image Type] (Permanent)"
3. Only one Cover and one Profile image allowed at a time
4. Upload button confirms the crop view and commits processing/upload to folder and database
5. **Immediate Save:** Upon crop confirmation, image is immediately processed, uploaded, and displayed - no separate save button required
6. Images persist after page refresh

### Existing Infrastructure
* **Upload API:** `/api/upload` endpoint supports `pathIdentifier` parameter for organizing files
* **MediaTab Component:** Currently handles promotional gallery - Cover/Profile sections need to be added
* **Database Fields:** `coverImageUrl` and `profileImageUrl` already exist in Convention model
* **File Organization:** Upload system already supports directory structure via `pathIdentifier`

---

## 5. Implementation Notes

### API Integration
* Use existing `/api/upload` endpoint with `pathIdentifier` values:
  - Cover images: `pathIdentifier: "convention-covers"`
  - Profile images: `pathIdentifier: "convention-profiles"`
* Use existing `/api/upload` DELETE endpoint for permanent removal
* Update Convention model directly with new image URLs

### Component Architecture
* **Layout Priority:** Cover and Profile image sections must be the first two elements at the top of MediaTab
* Add Cover and Profile image sections to existing MediaTab component
* Maintain separation from promotional gallery logic
* Each image type should have its own isolated upload/crop/preview component

### Database Updates
* Update Convention record with new `coverImageUrl` or `profileImageUrl` 
* Remove URL from database when image is permanently deleted
* Previous URLs should be completely replaced (not versioned)

### User Experience
* **Immediate Processing:** No separate save button - crop confirmation triggers immediate upload and display
* **Error Handling:** Follow best practices for validation errors (file size, format, dimensions)
* **Visual Feedback:** User sees their processed image immediately in the interface
* **Persistence:** Images remain visible after page refresh

---

## 6. Additional Technical Notes

* **Preview:** Both Cover and Profile previews must reflect the final output accurately, including cropping, zoom, and position.
* **Libraries:**
  * **React:** Use `react-easy-crop` for cropping logic and UI (previous implementation had issues with Profile image but was made to work)
  * **Node.js (backend):** Use `sharp` for any server-side processing, applying the crop area selected client-side.
* **Accessibility:** Ensure all image controls are accessible (keyboard navigation, ARIA labels, etc.).
* **Error Handling:** Follow best practices for user feedback on validation errors.

---

## 7. Summary Table

| Feature | Dimensions | Fit Mode | Drag Axis        | Zoom | Transparency | Output Format | Remove Link             | Logic Isolation |
| ------- | ---------- | -------- | ---------------- | ---- | ------------ | ------------- | ----------------------- | --------------- |
| Cover   | 851×315px  | Cover    | Overflow axis    | Yes  | No           | PNG           | Yes ('Remove Cover…')   | Yes             |
| Profile | 400×400px  | Contain  | Within long axis | Yes  | Yes          | PNG           | Yes ('Remove Profile…') | Yes             |
