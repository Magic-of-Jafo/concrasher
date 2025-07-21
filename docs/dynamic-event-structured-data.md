Project Brief: Implement Dynamic Event Structured Data
Objective:
Implement dynamic Event structured data (JSON-LD) for all individual convention pages to enhance their appearance in Google Search results.

Implementation Plan:

Create a Helper Function:

Create a new helper function in src/lib/seo.ts called generateEventSchema.

This function will take a convention object (with all related data) as an argument and return a JavaScript object that conforms to Google's Event schema.

Update the Convention Page Component:

In the convention page component (e.g., app/conventions/[slug]/page.tsx), import and use the generateEventSchema function.

Render a new <script type="application/ld+json"> tag in the page, passing the stringified schema object to it.

Schema Mapping and Example
The function should map the convention's data to the schema. Crucially, it should use the organizer field for the actual event organizer and the provider field for "Convention Crasher."

Example JSON-LD Output:

JSON

{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "FISM 2025",
  "startDate": "2025-07-14T...",
  "endDate": "2025-07-19T...",
  "description": "The World Championships of Magic...",
  "image": [
    "https://conventioncrasher.com/path/to/image.jpg"
  ],
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "Place",
    "name": "Lingotto Conference Centre",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Via Nizza, 280",
      "addressLocality": "Torino",
      "postalCode": "10126",
      "addressCountry": "IT"
    }
  },
  "organizer": {
    "@type": "Organization",
    "name": "The Italian Magic Federation",
    "url": "https://fismitaly2025.com"
  },
  "provider": {
    "@type": "Organization",
    "name": "Convention Crasher",
    "url": "https://conventioncrasher.com"
  }
}
This implementation will ensure each event is correctly attributed in search results, giving credit to the organizer while also associating your brand with the listing.