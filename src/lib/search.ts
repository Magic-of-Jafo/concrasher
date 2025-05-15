import { Convention, ConventionStatus } from '@prisma/client';
import { z } from 'zod';

// Search parameters schema
export const ConventionSearchParamsSchema = z.object({
  query: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  status: z.array(z.nativeEnum(ConventionStatus)).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).default(10),
});

export type ConventionSearchParams = z.infer<typeof ConventionSearchParamsSchema>;

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// State mapping utility
const STATE_MAPPING: Record<string, string> = {
  // US States
  'ALABAMA': 'AL',
  'ALASKA': 'AK',
  'ARIZONA': 'AZ',
  'ARKANSAS': 'AR',
  'CALIFORNIA': 'CA',
  'COLORADO': 'CO',
  'CONNECTICUT': 'CT',
  'DELAWARE': 'DE',
  'FLORIDA': 'FL',
  'GEORGIA': 'GA',
  'HAWAII': 'HI',
  'IDAHO': 'ID',
  'ILLINOIS': 'IL',
  'INDIANA': 'IN',
  'IOWA': 'IA',
  'KANSAS': 'KS',
  'KENTUCKY': 'KY',
  'LOUISIANA': 'LA',
  'MAINE': 'ME',
  'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA',
  'MICHIGAN': 'MI',
  'MINNESOTA': 'MN',
  'MISSISSIPPI': 'MS',
  'MISSOURI': 'MO',
  'MONTANA': 'MT',
  'NEBRASKA': 'NE',
  'NEVADA': 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  'OHIO': 'OH',
  'OKLAHOMA': 'OK',
  'OREGON': 'OR',
  'PENNSYLVANIA': 'PA',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  'TENNESSEE': 'TN',
  'TEXAS': 'TX',
  'UTAH': 'UT',
  'VERMONT': 'VT',
  'VIRGINIA': 'VA',
  'WASHINGTON': 'WA',
  'WEST VIRGINIA': 'WV',
  'WISCONSIN': 'WI',
  'WYOMING': 'WY',
  // US Territories
  'DISTRICT OF COLUMBIA': 'DC',
  'PUERTO RICO': 'PR',
  'GUAM': 'GU',
  'AMERICAN SAMOA': 'AS',
  'U.S. VIRGIN ISLANDS': 'VI',
  'NORTHERN MARIANA ISLANDS': 'MP',
  // Canadian Provinces
  'ALBERTA': 'AB',
  'BRITISH COLUMBIA': 'BC',
  'MANITOBA': 'MB',
  'NEW BRUNSWICK': 'NB',
  'NEWFOUNDLAND AND LABRADOR': 'NL',
  'NORTHWEST TERRITORIES': 'NT',
  'NOVA SCOTIA': 'NS',
  'NUNAVUT': 'NU',
  'ONTARIO': 'ON',
  'PRINCE EDWARD ISLAND': 'PE',
  'QUEBEC': 'QC',
  'SASKATCHEWAN': 'SK',
  'YUKON': 'YT',
};

// Helper function to get state abbreviation
function getStateAbbreviation(stateInput: string): string {
  const normalizedInput = stateInput.toUpperCase().trim();
  return STATE_MAPPING[normalizedInput] || normalizedInput;
}

export function buildSearchQuery(params: ConventionSearchParams) {
  const where: any = {};

  // Text search
  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: 'insensitive' } },
      { description: { contains: params.query, mode: 'insensitive' } },
      { location: { contains: params.query, mode: 'insensitive' } },
    ];
  }

  // Date range
  if (params.startDate || params.endDate) {
    where.OR = [
      // Convention starts within the range
      {
        startDate: {
          ...(params.startDate && { gte: new Date(params.startDate) }),
          ...(params.endDate && { lte: new Date(params.endDate) }),
        },
      },
      // Convention ends within the range
      {
        endDate: {
          ...(params.startDate && { gte: new Date(params.startDate) }),
          ...(params.endDate && { lte: new Date(params.endDate) }),
        },
      },
      // Convention spans across the range
      {
        AND: [
          { startDate: { lte: new Date(params.endDate || '9999-12-31') } },
          { endDate: { gte: new Date(params.startDate || '0000-01-01') } },
        ],
      },
    ];
  }

  // Location filters
  if (params.country) {
    where.country = { contains: params.country, mode: 'insensitive' };
  }
  if (params.state) {
    const stateAbbr = getStateAbbreviation(params.state);
    where.state = { contains: stateAbbr, mode: 'insensitive' };
  }
  if (params.city) {
    where.city = { contains: params.city, mode: 'insensitive' };
  }

  // Status filter
  if (params.status && params.status.length > 0) {
    where.status = { in: params.status };
  }

  // Price range
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.price = {};
    if (params.minPrice !== undefined) {
      where.price.gte = params.minPrice;
    }
    if (params.maxPrice !== undefined) {
      where.price.lte = params.maxPrice;
    }
  }

  return where;
}

export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
  };
} 