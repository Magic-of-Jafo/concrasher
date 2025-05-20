import { z } from 'zod';

// Convention Series Schema (if needed for validation contexts that include it)
// export const ConventionSeriesSchema = z.object({ ... });

// Base schema for Basic Information (object only)
const BaseBasicInfoFormObjectSchema = z.object({
  name: z.string().min(1, "Convention name is required."),
  slug: z.string().min(1, "URL slug is required.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens."),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  isOneDayEvent: z.boolean().default(false),
  isTBD: z.boolean().default(false),
  city: z.string().min(1, "City is required."),
  stateName: z.string().optional(), // Optional, might be state, province, region
  stateAbbreviation: z.string().optional(), // e.g., CA, NY
  country: z.string().min(1, "Country is required."),
  descriptionShort: z.string().optional(),
  descriptionMain: z.string().optional(),
  seriesId: z.string().optional(), // For linking to an existing series
  newSeriesName: z.string().optional(), // For creating a new series
});

// Apply refinements to the base object for the final BasicInfoFormSchema
export const BasicInfoFormSchema = BaseBasicInfoFormObjectSchema
  .refine(data => {
    if (!data.isTBD && (!data.startDate || !data.endDate)) {
      return false;
    }
    return true;
  }, { message: "Start and End dates are required if 'Date is TBD' is not checked.", path: ['startDate'] })
  .refine(data => {
    if (data.startDate && data.endDate && !data.isOneDayEvent && data.startDate > data.endDate) {
      return false;
    }
    return true;
  }, { message: "End date must be on or after start date.", path: ['endDate'] });
export type BasicInfoFormData = z.infer<typeof BasicInfoFormSchema>;

// Price Tiers
export const PriceTierSchema = z.object({
  id: z.string().optional(), // For existing tiers
  conventionId: z.string().optional(), // Will be set by backend
  label: z.string().min(1, "Label is required"),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Amount must be a non-negative number" }),
  order: z.number().int().min(0).optional(),
  // Add other fields like description, availability, etc. as needed
});
export type PriceTier = z.infer<typeof PriceTierSchema>;

// Price Discounts
export const PriceDiscountSchema = z.object({
  id: z.string().optional(), // For existing discounts
  conventionId: z.string().optional(), // Will be set by backend
  code: z.string().min(1, "Discount code is required"),
  percentage: z.number().min(0).max(100).optional(), // e.g., 10 for 10%
  fixedAmount: z.number().min(0).optional(), // e.g., 10 for $10 off
  // Add other fields like usageLimits, applicableTiers, expirationDate, etc.
}).refine(data => data.percentage !== undefined || data.fixedAmount !== undefined, {
  message: "Either a percentage or a fixed amount for the discount must be provided.",
  path: ['percentage'], // Or path: ['fixedAmount']
});
export type PriceDiscount = z.infer<typeof PriceDiscountSchema>;

// Venue Photos
export const VenuePhotoSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, "Photo URL is required."),
  caption: z.string().optional(),
});
export type VenuePhoto = z.infer<typeof VenuePhotoSchema>;

// Venue Data
export const VenueDataSchema = z.object({
  id: z.string().optional(),
  tempId: z.string().optional(),
  conventionId: z.string().optional(),
  isPrimaryVenue: z.boolean().default(false),
  markedForPrimaryPromotion: z.boolean().optional().default(false),
  venueName: z.string().min(1, "Venue name is required."),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  googleMapsUrl: z.string().url().optional().or(z.literal('')),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  stateRegion: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  amenities: z.array(z.string()).optional().default([]),
  parkingInfo: z.string().optional(),
  publicTransportInfo: z.string().optional(),
  overallAccessibilityNotes: z.string().optional(),
  photos: z.array(VenuePhotoSchema).optional().default([]),
});
export type VenueData = z.infer<typeof VenueDataSchema>;

// Hotel Photos (similar to VenuePhotoSchema, can be DRYed up if identical)
export const HotelPhotoSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, "Photo URL is required."),
  caption: z.string().optional(),
});
export type HotelPhoto = z.infer<typeof HotelPhotoSchema>;

// Hotel Data
export const HotelDataSchema = z.object({
  id: z.string().optional(),
  tempId: z.string().optional(),
  conventionId: z.string().optional(),
  isPrimaryHotel: z.boolean().default(false),
  isAtPrimaryVenueLocation: z.boolean().default(false),
  hotelName: z.string().min(1, "Hotel name is required."),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  googleMapsUrl: z.string().url().optional().or(z.literal('')),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  stateRegion: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  groupRateOrBookingCode: z.string().optional(),
  groupPrice: z.string().optional(), // Consider making this a number if it's always numeric
  bookingLink: z.string().url().optional().or(z.literal('')),
  bookingCutoffDate: z.date().nullable().optional(),
  amenities: z.array(z.string()).optional().default([]),
  parkingInfo: z.string().optional(),
  publicTransportInfo: z.string().optional(),
  overallAccessibilityNotes: z.string().optional(),
  photos: z.array(HotelPhotoSchema).optional().default([]),
});
export type HotelData = z.infer<typeof HotelDataSchema>;

// Combined Venue & Hotel Tab Data
export const VenueHotelTabDataSchema = z.object({
  primaryVenue: VenueDataSchema.optional(),
  secondaryVenues: z.array(VenueDataSchema).optional().default([]),
  hotels: z.array(HotelDataSchema).optional().default([]),
});
export type VenueHotelTabData = z.infer<typeof VenueHotelTabDataSchema>;

// --- Factory Functions for Default Objects ---
export const createDefaultVenue = (isPrimary: boolean = false): VenueData => ({
  isPrimaryVenue: isPrimary,
  markedForPrimaryPromotion: false,
  venueName: '',
  description: '',
  websiteUrl: '',
  googleMapsUrl: '',
  streetAddress: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  country: '',
  contactEmail: '',
  contactPhone: '',
  amenities: [],
  parkingInfo: '',
  publicTransportInfo: '',
  overallAccessibilityNotes: '',
  photos: [],
});

export const createDefaultHotel = (isPrimaryHotelFlag: boolean = false): HotelData => ({
  isPrimaryHotel: isPrimaryHotelFlag,
  isAtPrimaryVenueLocation: false,
  hotelName: '',
  description: '',
  websiteUrl: '',
  googleMapsUrl: '',
  streetAddress: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  country: '',
  contactEmail: '',
  contactPhone: '',
  groupRateOrBookingCode: '',
  groupPrice: '',
  bookingLink: '',
  bookingCutoffDate: null,
  amenities: [],
  parkingInfo: '',
  publicTransportInfo: '',
  overallAccessibilityNotes: '',
  photos: [],
});

export const createDefaultVenueHotelTabData = (): VenueHotelTabData => ({
  primaryVenue: undefined, // Or createDefaultVenue(true) if a primary is always expected initially
  secondaryVenues: [],
  hotels: [],
});

// Full Convention Data for Editor (combines all tabs)
// Extend from the base object schema, then apply refinements if necessary
export const ConventionDataForEditorSchema = BaseBasicInfoFormObjectSchema.extend({
  id: z.string().optional(),
  priceTiers: z.array(PriceTierSchema).optional().default([]),
  priceDiscounts: z.array(PriceDiscountSchema).optional().default([]),
  venueHotel: VenueHotelTabDataSchema.default(createDefaultVenueHotelTabData()),
  // Add other sections/tabs data schemas here if any
  // e.g., schedule: ScheduleTabSchema.optional(),
})
// Optionally, re-apply or add new refinements specific to the full editor context
// .refine(data => { ... }, { message: "...", path: [...] });
;
export type ConventionDataForEditor = z.infer<typeof ConventionDataForEditorSchema>; 