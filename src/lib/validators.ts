import { z } from 'zod';
import { ConventionStatus as PrismaConventionStatusEnum } from '@prisma/client';

// List of valid US states
const US_STATES = [
  { name: 'Alabama', abbreviation: 'AL' },
  { name: 'Alaska', abbreviation: 'AK' },
  { name: 'Arizona', abbreviation: 'AZ' },
  { name: 'Arkansas', abbreviation: 'AR' },
  { name: 'California', abbreviation: 'CA' },
  { name: 'Colorado', abbreviation: 'CO' },
  { name: 'Connecticut', abbreviation: 'CT' },
  { name: 'Delaware', abbreviation: 'DE' },
  { name: 'Florida', abbreviation: 'FL' },
  { name: 'Georgia', abbreviation: 'GA' },
  { name: 'Hawaii', abbreviation: 'HI' },
  { name: 'Idaho', abbreviation: 'ID' },
  { name: 'Illinois', abbreviation: 'IL' },
  { name: 'Indiana', abbreviation: 'IN' },
  { name: 'Iowa', abbreviation: 'IA' },
  { name: 'Kansas', abbreviation: 'KS' },
  { name: 'Kentucky', abbreviation: 'KY' },
  { name: 'Louisiana', abbreviation: 'LA' },
  { name: 'Maine', abbreviation: 'ME' },
  { name: 'Maryland', abbreviation: 'MD' },
  { name: 'Massachusetts', abbreviation: 'MA' },
  { name: 'Michigan', abbreviation: 'MI' },
  { name: 'Minnesota', abbreviation: 'MN' },
  { name: 'Mississippi', abbreviation: 'MS' },
  { name: 'Missouri', abbreviation: 'MO' },
  { name: 'Montana', abbreviation: 'MT' },
  { name: 'Nebraska', abbreviation: 'NE' },
  { name: 'Nevada', abbreviation: 'NV' },
  { name: 'New Hampshire', abbreviation: 'NH' },
  { name: 'New Jersey', abbreviation: 'NJ' },
  { name: 'New Mexico', abbreviation: 'NM' },
  { name: 'New York', abbreviation: 'NY' },
  { name: 'North Carolina', abbreviation: 'NC' },
  { name: 'North Dakota', abbreviation: 'ND' },
  { name: 'Ohio', abbreviation: 'OH' },
  { name: 'Oklahoma', abbreviation: 'OK' },
  { name: 'Oregon', abbreviation: 'OR' },
  { name: 'Pennsylvania', abbreviation: 'PA' },
  { name: 'Rhode Island', abbreviation: 'RI' },
  { name: 'South Carolina', abbreviation: 'SC' },
  { name: 'South Dakota', abbreviation: 'SD' },
  { name: 'Tennessee', abbreviation: 'TN' },
  { name: 'Texas', abbreviation: 'TX' },
  { name: 'Utah', abbreviation: 'UT' },
  { name: 'Vermont', abbreviation: 'VT' },
  { name: 'Virginia', abbreviation: 'VA' },
  { name: 'Washington', abbreviation: 'WA' },
  { name: 'West Virginia', abbreviation: 'WV' },
  { name: 'Wisconsin', abbreviation: 'WI' },
  { name: 'Wyoming', abbreviation: 'WY' }
];

export const RegistrationSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  confirmPassword: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }), // Min 1 as empty check, actual length check is not specified for login, only for registration.
});

export const ProfileSchema = z.object({
  name: z.string().min(1, { message: "Display name is required" }).optional().nullable().transform(val => val === null ? undefined : val),
  bio: z.string().max(200, { message: "Bio must be 200 characters or less" }).optional().nullable().transform(val => val === null ? undefined : val),
});

export type ProfileSchemaInput = z.infer<typeof ProfileSchema>;

// Use the Prisma generated enum for ConventionStatus
export const ConventionStatusEnum = z.nativeEnum(PrismaConventionStatusEnum);

export const ConventionCreateSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  city: z.string().min(1, { message: 'City is required' }),
  stateAbbreviation: z.string().min(1, { message: 'State is required' }).optional(),
  stateName: z.string().min(1, { message: 'State is required' }).optional(),
  country: z.string().min(1, { message: 'Country is required' }),
  venueName: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
  conventionSeriesId: z.string().cuid({ message: 'Invalid Series ID' }).optional(),
  status: ConventionStatusEnum,
  bannerImageUrl: z.string().optional().or(z.literal('')),
  galleryImageUrls: z.array(z.string().url({ message: 'Each gallery image must be a valid URL' })).optional().default([]),
});

export const ConventionUpdateSchema = ConventionCreateSchema.partial().extend({
  // Ensure slug is optional for updates if it's being handled or already set
  // slug: z.string().min(1, { message: 'Slug is required' }).optional(), 
});

export type ConventionCreateInput = z.infer<typeof ConventionCreateSchema>;
export type ConventionUpdateInput = z.infer<typeof ConventionUpdateSchema>;

export const BasicInfoFormSchema = z.object({
  name: z.string().min(1, 'Convention name is required'),
  slug: z.string().min(1, 'Slug is required'),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  isOneDayEvent: z.boolean(),
  isTBD: z.boolean(),
  city: z.string().optional(),
  stateName: z.string().optional(),
  stateAbbreviation: z.string().optional(),
  country: z.string().optional(),
  descriptionShort: z.string().optional(),
  descriptionMain: z.string().optional(),
  seriesId: z.string().optional(),
  newSeriesName: z.string().optional(),
}).refine((data) => {
  if (data.isTBD) {
    return true;
  }
  return !!data.startDate;
}, {
  message: 'Start date is required unless dates are TBD',
  path: ['startDate'],
}).refine((data) => {
  if (data.isTBD || data.isOneDayEvent) {
    return true;
  }
  return !!data.endDate;
}, {
  message: 'End date is required for multi-day events',
  path: ['endDate'],
}).refine((data) => {
  if (data.country === 'United States') {
    return !!data.stateName;
  }
  return true;
}, {
  message: 'State is required for US locations',
  path: ['stateName'],
}).refine((data) => {
  if (data.country === 'United States' && data.stateName) {
    // Check if the state name matches a valid US state
    const isValidState = US_STATES.some(state =>
      state.name.toLowerCase() === data.stateName?.toLowerCase() ||
      state.abbreviation.toLowerCase() === data.stateName?.toLowerCase()
    );
    return isValidState;
  }
  return true;
}, {
  message: 'Invalid US state name or abbreviation',
  path: ['stateName'],
});

export type BasicInfoFormData = z.infer<typeof BasicInfoFormSchema>;

// --- Pricing Tab Schemas ---

export const PriceTierSchema = z.object({
  id: z.string().cuid().optional(), // New tiers may not have an id yet
  conventionId: z.string().cuid().optional(),
  label: z.string().min(1, 'Tier label is required'),
  amount: z.preprocess((val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, 'Amount must be non-negative')
  ),
  order: z.number().int().min(0),
});

export const PriceDiscountSchema = z.object({
  id: z.string().cuid().optional(),
  conventionId: z.string().cuid().optional(),
  cutoffDate: z.coerce.date({ required_error: 'Discount date is required' }),
  priceTierId: z.string().cuid({ message: 'Price Tier is required' }),
  discountedAmount: z.preprocess((val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, 'Discounted amount must be non-negative')
  ),
});

export const PricingTabSchema = z.object({
  priceTiers: z.array(PriceTierSchema).min(1, 'At least one price tier is required'),
  priceDiscounts: z.array(PriceDiscountSchema),
});

export type PriceTier = z.infer<typeof PriceTierSchema>;
export type PriceDiscount = z.infer<typeof PriceDiscountSchema>;
export type PricingTabData = z.infer<typeof PricingTabSchema>;

// --- Venue & Hotel Tab Schemas ---

export const VenuePhotoSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url({ message: "Invalid photo URL" }).min(1, "Photo URL is required"),
  caption: z.string().optional(),
});

export const VenueSchema = z.object({
  id: z.string().uuid().optional(),
  conventionId: z.string().cuid().optional(), // Assuming conventionId is CUID from existing schemas
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
  photos: z.array(VenuePhotoSchema).max(1, { message: "Only one photo is allowed." }).optional().default([]),
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
  markedForPrimaryPromotion: z.boolean().optional().default(false),
  tempId: z.string().uuid().optional(),
  hotelName: z.string().optional(),
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
  cutOffDate: z.coerce.date().optional().nullable(),
  openingDate: z.coerce.date().optional().nullable(),
  photos: z.array(HotelPhotoSchema).max(1, { message: "Only one photo is allowed." }).optional().default([]),
}).refine((data) => {
  if (data.isPrimaryHotel) {
    return !!data.hotelName && !!data.streetAddress && !!data.city && !!data.country;
  }
  return true;
}, {
  message: 'Primary hotels must have a name, street address, city, and country.',
  path: ['hotelName'], // Arbitrarily pick one field for the error path
});

export const VenueHotelTabSchema = z.object({
  venues: z.array(VenueSchema),
  hotels: z.array(HotelSchema),
});

export const createDefaultVenue = (isPrimary: boolean = false): VenueData => ({
  id: undefined,
  conventionId: undefined,
  tempId: crypto.randomUUID(),
  isPrimaryVenue: isPrimary,
  markedForPrimaryPromotion: false,
  venueName: '',
  amenities: [],
  photos: [],
});

export const createDefaultHotel = (isPrimaryHotelFlag: boolean = false): HotelData => ({
  id: undefined,
  conventionId: undefined,
  tempId: crypto.randomUUID(),
  isPrimaryHotel: isPrimaryHotelFlag,
  isAtPrimaryVenueLocation: false,
  markedForPrimaryPromotion: false,
  hotelName: '',
  photos: [],
});

// Helper function to create a default structure for the tab data
export function createDefaultVenueHotelTabData(): VenueHotelTabData {
  const primaryVenue = createDefaultVenue(true);
  return {
    venues: [primaryVenue],
    hotels: [],
  };
}


export type VenuePhotoData = z.infer<typeof VenuePhotoSchema>;
export type VenueData = z.infer<typeof VenueSchema>;
export type HotelPhotoData = z.infer<typeof HotelPhotoSchema>;
export type HotelData = z.infer<typeof HotelSchema>;
export type VenueHotelTabData = z.infer<typeof VenueHotelTabSchema>;


// --- Schedule Tab Schemas ---

export const ScheduleEventFeeTierSchema = z.object({
  id: z.string().cuid().optional(),
  label: z.string().min(1, 'Fee tier label is required'),
  amount: z.preprocess((val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().min(0, 'Amount must be non-negative')
  ),
});

const ConventionScheduleItemBaseSchema = z.object({
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  durationMinutes: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0, 'Duration must be a positive number')
  ),
  eventType: z.string().optional(),
  atPrimaryVenue: z.boolean(),
  locationName: z.string().optional(),
  venueId: z.string().uuid().optional().nullable(),
  hasFee: z.boolean(),
  feeTiers: z.array(ScheduleEventFeeTierSchema).optional(),
});

// Schema for CREATING a new schedule item
export const ConventionScheduleItemCreateSchema = ConventionScheduleItemBaseSchema.extend({
  conventionId: z.string().cuid(),
  scheduleDayId: z.string().cuid(),
});

// Schema for UPDATING an existing schedule item
export const ConventionScheduleItemUpdateSchema = ConventionScheduleItemBaseSchema.extend({
  id: z.string().cuid(),
  scheduleDayId: z.string().cuid().optional().nullable(),
});

// Schemas for BULK importing schedule items
export const ConventionScheduleItemBulkItemSchema = ConventionScheduleItemBaseSchema.extend({
  dayOffset: z.number().int().min(0, 'Day offset must be a positive integer'),
});

export const ConventionScheduleItemBulkInputSchema = z.object({
  conventionId: z.string().cuid(),
  scheduleItems: z.array(ConventionScheduleItemBulkItemSchema),
});


// Type exports
export type ScheduleEventFeeTierInput = z.infer<typeof ScheduleEventFeeTierSchema>;
export type ConventionScheduleItemCreateInput = z.infer<typeof ConventionScheduleItemCreateSchema>;
export type ConventionScheduleItemUpdateInput = z.infer<typeof ConventionScheduleItemUpdateSchema>;
export type ConventionScheduleItemBulkItemInput = z.infer<typeof ConventionScheduleItemBulkItemSchema>;
export type ConventionScheduleItemBulkInput = z.infer<typeof ConventionScheduleItemBulkInputSchema>; 