import { z } from 'zod';

export const VenuePhotoSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url({ message: "Invalid photo URL" }).min(1, "Photo URL is required"),
  caption: z.string().optional(),
});

export const VenueSchema = z.object({
  id: z.string().uuid().optional(),
  conventionId: z.string().cuid().optional(),
  isPrimaryVenue: z.boolean().default(false),
  markedForPrimaryPromotion: z.boolean().optional().default(false),
  tempId: z.string().uuid().optional(),
  venueName: z.string().min(1, "Venue name is required"),
  description: z.string().optional(),
  websiteUrl: z.string().url({ message: "Invalid website URL" }).optional().or(z.literal('')),
  googleMapsUrl: z.string().url({ message: "Invalid Google Maps URL" }).optional().or(z.literal('')),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  stateRegion: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  contactEmail: z.string().email({ message: "Invalid contact email" }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  amenities: z.array(z.string()).optional().default([]),
  parkingInfo: z.string().optional(),
  publicTransportInfo: z.string().optional(),
  overallAccessibilityNotes: z.string().optional(),
  photos: z.array(VenuePhotoSchema).optional().default([]),
});

export const HotelPhotoSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url({ message: "Invalid photo URL" }).min(1, "Photo URL is required"),
  caption: z.string().optional(),
});

export const HotelSchema = z.object({
  id: z.string().uuid().optional(),
  conventionId: z.string().cuid().optional(),
  isPrimaryHotel: z.boolean().default(false),
  isAtPrimaryVenueLocation: z.boolean().default(false),
  tempId: z.string().uuid().optional(),
  hotelName: z.string().min(1, "Hotel name is required"),
  description: z.string().optional(),
  websiteUrl: z.string().url({ message: "Invalid website URL" }).optional().or(z.literal('')),
  googleMapsUrl: z.string().url({ message: "Invalid Google Maps URL" }).optional().or(z.literal('')),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  stateRegion: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  contactEmail: z.string().email({ message: "Invalid contact email" }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  groupRateOrBookingCode: z.string().optional(),
  groupPrice: z.string().optional(),
  bookingLink: z.string().url({ message: "Invalid booking link URL" }).optional().or(z.literal('')),
  bookingCutoffDate: z.coerce.date().nullable().optional(),
  amenities: z.array(z.string()).optional().default([]),
  parkingInfo: z.string().optional(),
  publicTransportInfo: z.string().optional(),
  overallAccessibilityNotes: z.string().optional(),
  photos: z.array(HotelPhotoSchema).optional().default([]),
});

export const VenueHotelTabDataSchema = z.object({
  primaryVenue: VenueSchema,
  secondaryVenues: z.array(VenueSchema).optional().default([]),
  guestsStayAtPrimaryVenue: z.boolean().optional().default(false),
  primaryHotelDetails: HotelSchema.optional(),
  additionalHotels: z.array(HotelSchema).optional().default([]),
});

export type VenueData = z.infer<typeof VenueSchema>;
export type HotelPhotoData = z.infer<typeof HotelPhotoSchema>;
export type HotelData = z.infer<typeof HotelSchema>;
export type VenueHotelTabData = z.infer<typeof VenueHotelTabDataSchema>;

export const createDefaultVenue = (isPrimary: boolean = false): VenueData => ({
  isPrimaryVenue: isPrimary,
  markedForPrimaryPromotion: false,
  venueName: '',
  amenities: [],
  photos: [],
});

export const createDefaultHotel = (isPrimaryHotelFlag: boolean = false): HotelData => ({
  isPrimaryHotel: isPrimaryHotelFlag,
  isAtPrimaryVenueLocation: false,
  hotelName: '',
  amenities: [],
  photos: [],
  bookingCutoffDate: null,
});

export const createDefaultVenueHotelTabData = (): VenueHotelTabData => ({
  primaryVenue: createDefaultVenue(true),
  secondaryVenues: [],
  guestsStayAtPrimaryVenue: false,
  primaryHotelDetails: undefined,
  additionalHotels: [],
}); 