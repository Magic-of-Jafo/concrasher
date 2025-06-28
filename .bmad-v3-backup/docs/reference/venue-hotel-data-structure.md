# Venue and Hotel Data Structures for Convention Management

This document outlines the data structures for `Venue` and `Hotel` entities as they relate to a `Convention`. It details the fields required for a "complete" listing and how these entities are integrated into the convention editing process, particularly for Story 2.9.

## Core Principle

A `Convention` can have multiple associated `Venue` and `Hotel` records. For organizational clarity and attendee information, one venue is typically designated as the "Primary Venue," and one hotel as the "Primary Hotel" (often with special rates/blocks).

## `Venue` Entity

Represents a physical location where convention activities occur.

**Fields:**

*   `id`: Unique identifier (e.g., UUID, auto-incrementing Int).
*   `conventionId`: Foreign key linking to the `Convention` it belongs to.
*   `isPrimaryVenue`: Boolean. `true` if this is the main venue for the convention. Only one per convention should be true.
*   `venueName`: String. The official name of the venue (e.g., "Springfield Convention Center").
*   **Address (Structured Object):**
    *   `streetAddress`: String.
    *   `city`: String.
    *   `stateProvince`: String.
    *   `postalCode`: String.
    *   `country`: String.
*   **Contact (Structured Object - for venue liaison):**
    *   `contactName`: String.
    *   `contactEmail`: String (validated email format).
    *   `contactPhone`: String.
*   `websiteUrl`: String (validated URL format).
*   `googleMapsUrl`: String (validated URL format, for direct map link).
*   `notesOrDescription`: Text. General notes or description about the venue.
*   `usageDescription`: Text. Describes what parts of the convention happen at this venue (e.g., "Main lectures, dealer's room, cosplay stage").
*   `photos`: Array of objects. Each object:
    *   `url`: String (URL to the image).
    *   `caption`: String (optional).
*   `amenities`: Array of strings. List of venue amenities (e.g., "Wi-Fi", "Stage", "AV Equipment", "Accessible Ramps").
*   **Location & Access Specifics (Primarily for the Primary Venue):**
    *   `parkingInfo`: Text. Details about parking.
    *   `publicTransportInfo`: Text. Information on public transport access.
    *   `overallAccessibilityNotes`: Text. General accessibility notes for this location.

**Relationships:**

*   Many-to-one with `Convention` (a `Convention` can have many `Venues`).

## `Hotel` Entity

Represents a lodging option for convention attendees.

**Fields:**

*   `id`: Unique identifier.
*   `conventionId`: Foreign key linking to the `Convention`.
*   `isPrimaryHotel`: Boolean. `true` if this is the main partner hotel. Only one per convention should be true.
*   `isAtPrimaryVenueLocation`: Boolean. Internal flag, `true` if this hotel record represents lodging *at the primary venue's physical location*. Helps UI logic.
*   `hotelName`: String. The official name of the hotel.
*   **Address (Structured Object):**
    *   `streetAddress`: String.
    *   `city`: String.
    *   `stateProvince`: String.
    *   `postalCode`: String.
    *   `country`: String.
*   **Contact (Structured Object - for hotel group bookings):**
    *   `contactName`: String.
    *   `contactEmail`: String (validated email format).
    *   `contactPhone`: String.
*   `websiteUrl`: String (validated URL format).
*   `googleMapsUrl`: String (validated URL format, for direct map link).
*   **Convention Booking Details:**
    *   `groupRateOrBookingCode`: String. Special code for convention rate, used for online forms or phone bookings.
    *   `groupPrice`: String. The price per night/room for the group rate (e.g., "150 USD/night").
    *   `bookingLink`: String (validated URL). Direct link for booking.
    *   `bookingCutoffDate`: Date. Deadline for group rate.
*   `notes`: Text. Additional details (e.g., shuttle info, booking instructions).
*   `photos`: Array of objects. Each object:
    *   `url`: String (URL to the image).
    *   `caption`: String (optional).
*   `amenities`: Array of strings. List of hotel amenities (e.g., "Restaurant On-site", "Pool", "Gym").

**Relationships:**

*   Many-to-one with `Convention` (a `Convention` can have many `Hotels`).

## UI Interaction & Logic Highlights (Story 2.9)

1.  **Primary Venue:**
    *   The form for the `PrimaryVenue` will capture all `Venue` fields (its `isPrimaryVenue` flag will be set to `true`).
    *   It will also include fields for `parkingInfo`, `publicTransportInfo`, and `overallAccessibilityNotes`.

2.  **"Guests Staying at Primary Venue?" Checkbox:**
    *   This checkbox controls whether hotel information is *also* captured for the primary venue's location.
    *   **Unchecked (Default - Guests CAN stay):**
        *   A "Primary Hotel Information" section is shown.
        *   This section uses a form (e.g., `HotelForm.tsx`) to populate a `Hotel` record.
        *   This `Hotel` record will have `isPrimaryHotel = true` and `isAtPrimaryVenueLocation = true`.
        *   Its name and address may pre-fill from the Primary Venue data but should be editable.
    *   **Checked (Guests will NOT stay):**
        *   The "Primary Hotel Information" section (for the venue location) is hidden.
        *   No `Hotel` record with `isAtPrimaryVenueLocation = true` is created/managed directly through this section.

3.  **Additional Hotels:**
    *   Organizers can add a list of other hotels.
    *   Each uses a form (e.g., `HotelForm.tsx`) to populate a `Hotel` record.
    *   These records will have `isAtPrimaryVenueLocation = false` (unless an edge case allows adding the primary venue again as an additional hotel, which should be avoided by UI logic).

4.  **Ensuring Single Primary Hotel:**
    *   The UI/backend logic must ensure that only one `Hotel` record associated with a given `conventionId` has `isPrimaryHotel = true`.
    *   If the "Primary Hotel Information" (at the venue) is filled, that Hotel is the primary.
    *   If that section is not used (because guests don't stay at the venue), then one of the "Additional Hotels" can be designated as primary by the organizer. The UI should facilitate this choice.

This structure allows for flexibility in defining multiple venues and hotels, clearly distinguishing primary ones, and handling the common case where the primary venue might also offer lodging. 