import { RegistrationSchema } from './validators';
import { LoginSchema } from './validators';
import { ProfileSchema } from './validators';
import { ConventionCreateSchema, ConventionUpdateSchema } from './validators';
import { BasicInfoFormSchema, type BasicInfoFormData } from './validators';
import { DealerLinkSchema, type DealerLinkData } from './validators';
import { ConventionStatus, ProfileType } from '@prisma/client';
import { PriceTierSchema, PriceDiscountSchema, PricingTabSchema } from './validators';

describe('RegistrationSchema', () => {
  it('should validate a correct registration form', () => {
    const data = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should invalidate an invalid email', () => {
    const data = {
      email: 'invalid-email',
      password: 'password123',
      confirmPassword: 'password123',
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain('Invalid email address');
    }
  });

  it('should invalidate a short password', () => {
    const data = {
      email: 'test@example.com',
      password: 'short',
      confirmPassword: 'short',
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters long'
      );
    }
  });

  it('should invalidate non-matching passwords', () => {
    const data = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password456',
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      // The error is attached to confirmPassword due to the .refine path
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords don't match"
      );
    }
  });

  it('should invalidate if confirmPassword is too short, even if passwords match initially before refine', () => {
    const data = {
      email: 'test@example.com',
      password: 'pass', // Will fail initial Zod schema for password field
      confirmPassword: 'pass', // Will fail initial Zod schema for confirmPassword field
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters long'
      );
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Password must be at least 8 characters long'
      );
      // No "Passwords don't match" error here because individual field validation fails first.
    }
  });

  it('should require email', () => {
    const data = {
      // email: undefined,
      password: 'password123',
      confirmPassword: 'password123',
    };
    // @ts-ignore to test missing property
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it('should require password', () => {
    const data = {
      email: 'test@example.com',
      // password: undefined,
      confirmPassword: 'password123',
    };
    // @ts-ignore to test missing property
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });
});

describe('LoginSchema', () => {
  it('should validate correct login credentials', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should invalidate an incorrect email format', () => {
    const result = LoginSchema.safeParse({
      email: 'invalid-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain('Invalid email address');
    }
  });

  it('should invalidate an empty password', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain('Password is required');
    }
  });

  it('should invalidate if email is not a string', () => {
    const result = LoginSchema.safeParse({
      email: 12345,
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should invalidate if password is not a string', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: 12345,
    });
    expect(result.success).toBe(false);
  });
});

describe('ProfileSchema', () => {
  it('should validate a correct profile', () => {
    const result = ProfileSchema.safeParse({
      firstName: 'Test',
      lastName: 'User',
      bio: 'This is a test bio.',
    });
    expect(result.success).toBe(true);
  });

  it('should allow optional fields to be omitted', () => {
    const result = ProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBeUndefined();
      expect(result.data.lastName).toBeUndefined();
      expect(result.data.bio).toBeUndefined();
    }
  });

  it('should allow firstName to be explicitly undefined or null', () => {
    let result = ProfileSchema.safeParse({ firstName: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.firstName).toBeUndefined();

    result = ProfileSchema.safeParse({ firstName: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.firstName).toBeNull();
  });

  it('should allow bio to be explicitly undefined or null', () => {
    let result = ProfileSchema.safeParse({ bio: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bio).toBeUndefined();

    result = ProfileSchema.safeParse({ bio: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bio).toBeNull();
  });

  it('should invalidate a bio longer than 200 characters', () => {
    const longBio = 'a'.repeat(201);
    const result = ProfileSchema.safeParse({ bio: longBio });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.bio).toContain('Bio must be 200 characters or less');
    }
  });

  it('should invalidate a first name longer than 50 characters', () => {
    const longName = 'a'.repeat(51);
    const result = ProfileSchema.safeParse({ firstName: longName });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.firstName).toContain('First name must be 50 characters or less');
    }
  });

  it('should pass with a bio exactly 200 characters long', () => {
    const bioAtMaxLength = 'a'.repeat(200);
    const result = ProfileSchema.safeParse({ bio: bioAtMaxLength });
    expect(result.success).toBe(true);
  });

  it('should pass if only names are provided', () => {
    const result = ProfileSchema.safeParse({ firstName: 'Test', lastName: 'User' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Test');
      expect(result.data.lastName).toBe('User');
      expect(result.data.bio).toBeUndefined();
    }
  });

  it('should pass if only bio is provided', () => {
    const result = ProfileSchema.safeParse({ bio: 'Only Bio' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBe('Only Bio');
      expect(result.data.firstName).toBeUndefined();
    }
  });
});

describe('ConventionCreateSchema', () => {
  const validData = {
    name: 'Test Convention',
    startDate: new Date('2025-01-01T10:00:00.000Z'),
    endDate: new Date('2025-01-03T18:00:00.000Z'),
    city: 'Test City',
    state: 'TS',
    country: 'Testland',
    status: ConventionStatus.DRAFT,
    // Optional fields
    venueName: 'Test Venue',
    description: 'A great test convention',
    websiteUrl: 'https://example.com/test-con',
    conventionSeriesId: 'clxkz0example000008l7aaaa0000', // example CUID
    bannerImageUrl: 'https://example.com/banner.jpg',
    galleryImageUrls: ['https://example.com/gallery1.jpg', 'https://example.com/gallery2.jpg'],
  };

  it('should validate correct convention creation data', () => {
    const result = ConventionCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should invalidate missing required name', () => {
    const result = ConventionCreateSchema.safeParse({
      ...validData,
      name: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain('Required');
    }
  });

  it('should invalidate invalid startDate (not a date)', () => {
    const result = ConventionCreateSchema.safeParse({ ...validData, startDate: 'not-a-date' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.startDate).toBeDefined();
    }
  });

  it('should invalidate invalid status enum', () => {
    const result = ConventionCreateSchema.safeParse({ ...validData, status: 'INVALID_STATUS' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.status).toBeDefined();
    }
  });

  it('should accept empty string for optional websiteUrl and bannerImageUrl', () => {
    const result = ConventionCreateSchema.safeParse({
      ...validData,
      websiteUrl: '',
      bannerImageUrl: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.websiteUrl).toBe('');
      expect(result.data.bannerImageUrl).toBe('');
    }
  });

  it('should default galleryImageUrls to an empty array if not provided', () => {
    const { galleryImageUrls, ...data } = validData;
    const result = ConventionCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.galleryImageUrls).toEqual([]);
    }
  });

  it('should invalidate invalid URL in galleryImageUrls', () => {
    const result = ConventionCreateSchema.safeParse({ ...validData, galleryImageUrls: ['invalid-url'] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.galleryImageUrls).toBeDefined();
    }
  });

  it('should invalidate non-cuid for conventionSeriesId', () => {
    const result = ConventionCreateSchema.safeParse({ ...validData, conventionSeriesId: 'not-a-cuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.conventionSeriesId).toContain('Invalid Series ID');
    }
  });
});

describe('ConventionUpdateSchema', () => {
  it('should validate partial data for update', () => {
    const data = { name: 'Updated Convention Name' };
    const result = ConventionUpdateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should allow all fields to be optional', () => {
    const result = ConventionUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate a specific field if provided (e.g., invalid URL for websiteUrl)', () => {
    const result = ConventionUpdateSchema.safeParse({ websiteUrl: 'not-a-valid-url' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.websiteUrl).toContain('Invalid URL');
    }
  });

  it('should allow valid status enum for update', () => {
    const result = ConventionUpdateSchema.safeParse({ status: ConventionStatus.PUBLISHED });
    expect(result.success).toBe(true);
  });

  it('should invalidate invalid status enum for update', () => {
    const result = ConventionUpdateSchema.safeParse({ status: 'INVALID_STATUS_FOR_UPDATE' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.status).toBeDefined();
    }
  });
});

describe('BasicInfoFormSchema', () => {
  const getValidData = (overrides: Partial<BasicInfoFormData> = {}): BasicInfoFormData => ({
    name: 'Test Convention',
    slug: 'test-convention',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-02'),
    isOneDayEvent: false,
    isTBD: false,
    city: 'Test City',
    stateName: 'California',
    stateAbbreviation: 'CA',
    country: 'United States',
    descriptionShort: 'Short desc',
    descriptionMain: 'Main desc',
    seriesId: 'clxxxxxxx',
    newSeriesName: '',
    ...overrides,
  });

  it('should validate correct basic info data', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData());
    expect(result.success).toBe(true);
  });

  it('should invalidate if name is missing', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({ name: '' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.name).toContain('Convention name is required');
  });

  it('should invalidate if slug is missing', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({ slug: '' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.slug).toContain('Slug is required');
  });

  // --- Date Validations ---
  it('should validate if dates are TBD (startDate and endDate can be null)', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({ isTBD: true, startDate: null, endDate: null }));
    expect(result.success).toBe(true);
  });

  it('should invalidate if not TBD and startDate is null', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({ isTBD: false, startDate: null }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.startDate).toContain('Start date is required unless dates are TBD');
  });

  it('should validate if one-day event and endDate is null (and not TBD)', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({
      isTBD: false,
      isOneDayEvent: true,
      startDate: new Date(),
      endDate: null
    }));
    expect(result.success).toBe(true);
  });

  it('should invalidate if not TBD, not one-day, and endDate is null', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({
      isTBD: false,
      isOneDayEvent: false,
      startDate: new Date(),
      endDate: null
    }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.endDate).toContain('End date is required for multi-day events');
  });

  // --- Location Validations ---
  it('should validate if country is not US and state fields are empty', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({ country: 'Canada', stateName: '', stateAbbreviation: '' }));
    expect(result.success).toBe(true);
  });

  it('should invalidate if country is US and stateName is empty', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({ country: 'United States', stateName: '' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.stateName).toContain('State is required for US locations');
  });

  it('should validate if country is US and stateName is a valid full state name', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({ country: 'United States', stateName: 'Florida', stateAbbreviation: 'FL' }));
    expect(result.success).toBe(true);
  });

  it('should validate if country is US and stateName is a valid state abbreviation', () => {
    // Schema checks stateName against full names and abbreviations
    const result = BasicInfoFormSchema.safeParse(getValidData({ country: 'United States', stateName: 'FL', stateAbbreviation: 'FL' }));
    expect(result.success).toBe(true);
  });

  it('should invalidate if country is US and stateName is invalid', () => {
    const result = BasicInfoFormSchema.safeParse(getValidData({ country: 'United States', stateName: 'InvalidState' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.stateName).toContain('Invalid US state name or abbreviation');
  });

  it('should allow optional fields (city, descriptions, seriesId, newSeriesName) to be empty/undefined', () => {
    const data = getValidData({
      city: '',
      descriptionShort: '',
      descriptionMain: '',
      seriesId: '',
      newSeriesName: '',
      stateName: 'California', // keep valid state for US
      stateAbbreviation: 'CA'
    });
    const result = BasicInfoFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

});

// Make sure to export type if it's defined in this file and used elsewhere, though it's likely in validators.ts
// export type BasicInfoFormData = z.infer<typeof BasicInfoFormSchema>; // Already in validators.ts

// export type BasicInfoFormData = z.infer<typeof BasicInfoFormSchema>; 

describe('PriceTierSchema', () => {
  const validTierData = {
    label: 'Adult',
    amount: 50.00,
    order: 0,
    // id and conventionId are optional
  };

  it('should validate correct tier data', () => {
    const result = PriceTierSchema.safeParse(validTierData);
    expect(result.success).toBe(true);
  });

  it('should accept string amount and preprocess it to number', () => {
    const result = PriceTierSchema.safeParse({ ...validTierData, amount: '50.99' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(50.99);
    }
  });

  it('should require a label', () => {
    const result = PriceTierSchema.safeParse({ ...validTierData, label: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Tier label is required');
    }
  });

  it('should require amount to be non-negative', () => {
    const result = PriceTierSchema.safeParse({ ...validTierData, amount: -10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Amount must be non-negative');
    }
  });

  it('should require order to be a non-negative integer', () => {
    let result = PriceTierSchema.safeParse({ ...validTierData, order: -1 });
    expect(result.success).toBe(false);
    // Note: Zod might have multiple issues (e.g., not int, then not min(0)) 
    // or a more general message depending on order of checks.
    // We check for one of the expected messages or refine based on actual Zod output.

    result = PriceTierSchema.safeParse({ ...validTierData, order: 1.5 });
    expect(result.success).toBe(false);
    if (!result.success && result.error.issues[0]) {
      expect(result.error.issues[0].message).toContain('Expected integer');
    }
  });

  it('should accept optional id and conventionId as CUIDs', () => {
    const validCuid = 'clq7000000000cjk712345678'; // Example CUID
    let result = PriceTierSchema.safeParse({
      ...validTierData,
      id: validCuid,
      conventionId: validCuid
    });
    expect(result.success).toBe(true);

    result = PriceTierSchema.safeParse({ ...validTierData, id: 'not-a-cuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid cuid');
    }
  });
});

// Placeholder for PriceDiscountSchema tests
describe('PriceDiscountSchema', () => {
  const validCuid = 'clq7000000000cjk712345678'; // Example CUID
  const validDiscountData = {
    cutoffDate: new Date(),
    priceTierId: validCuid,
    discountedAmount: 25.00,
    // id and conventionId are optional
  };

  it('should validate correct discount data', () => {
    const result = PriceDiscountSchema.safeParse(validDiscountData);
    expect(result.success).toBe(true);
  });

  it('should accept string discountedAmount and preprocess it to number', () => {
    const result = PriceDiscountSchema.safeParse({ ...validDiscountData, discountedAmount: '25.99' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discountedAmount).toBe(25.99);
    }
  });

  it('should require a cutoffDate', () => {
    const result = PriceDiscountSchema.safeParse({
      ...validDiscountData,
      cutoffDate: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid date');
    }
  });

  it('should accept a date string for cutoffDate and coerce it', () => {
    const result = PriceDiscountSchema.safeParse({ ...validDiscountData, cutoffDate: '2024-12-31' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cutoffDate).toBeInstanceOf(Date);
      expect(result.data.cutoffDate.getUTCFullYear()).toBe(2024);
      expect(result.data.cutoffDate.getUTCMonth()).toBe(11); // 0-indexed
      expect(result.data.cutoffDate.getUTCDate()).toBe(31);
    }
  });

  it('should require priceTierId to be a CUID', () => {
    const result = PriceDiscountSchema.safeParse({ ...validDiscountData, priceTierId: 'not-a-cuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Price Tier is required'); // This message is from the schema if CUID validation fails too.
    }
  });

  it('should require discountedAmount to be non-negative', () => {
    const result = PriceDiscountSchema.safeParse({ ...validDiscountData, discountedAmount: -5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Discounted amount must be non-negative');
    }
  });

  it('should accept optional id and conventionId as CUIDs', () => {
    let result = PriceDiscountSchema.safeParse({
      ...validDiscountData,
      id: validCuid,
      conventionId: validCuid
    });
    expect(result.success).toBe(true);

    result = PriceDiscountSchema.safeParse({ ...validDiscountData, id: 'invalid-cuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid cuid');
    }
  });
});

// Placeholder for PricingTabSchema tests
describe('PricingTabSchema', () => {
  const validCuid = 'clq7000000000cjk712345678'; // Example CUID
  const validTierData = {
    label: 'Adult',
    amount: 50.00,
    order: 0,
  };
  const validDiscountData = {
    cutoffDate: new Date(),
    priceTierId: validCuid,
    discountedAmount: 25.00,
  };

  it('should validate correct pricing tab data with one tier and some discounts', () => {
    const result = PricingTabSchema.safeParse({
      priceTiers: [validTierData],
      priceDiscounts: [validDiscountData, { ...validDiscountData, priceTierId: 'clq7000000001cjk712345679' }],
    });
    expect(result.success).toBe(true);
  });

  it('should validate pricing tab data with multiple tiers and no discounts', () => {
    const result = PricingTabSchema.safeParse({
      priceTiers: [
        validTierData,
        { ...validTierData, label: 'Youth', amount: 25, order: 1, id: validCuid },
      ],
      priceDiscounts: [],
    });
    expect(result.success).toBe(true);
  });

  it('should require at least one price tier', () => {
    const result = PricingTabSchema.safeParse({
      priceTiers: [],
      priceDiscounts: [validDiscountData],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('At least one price tier is required');
    }
  });

  it('should fail if any priceTier is invalid', () => {
    const result = PricingTabSchema.safeParse({
      priceTiers: [{ ...validTierData, label: '' }], // Invalid label
      priceDiscounts: [],
    });
    expect(result.success).toBe(false);
    // Path would be like priceTiers[0].label
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['priceTiers', 0, 'label']);
      expect(result.error.issues[0].message).toBe('Tier label is required');
    }
  });

  it('should fail if any priceDiscount is invalid', () => {
    const result = PricingTabSchema.safeParse({
      priceTiers: [validTierData],
      priceDiscounts: [{ ...validDiscountData, priceTierId: 'not-a-cuid' }], // Invalid priceTierId
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['priceDiscounts', 0, 'priceTierId']);
      expect(result.error.issues[0].message).toBe('Price Tier is required');
    }
  });
});

describe('DealerLinkSchema', () => {
  const validCuid = 'clq7000000000cjk712345678'; // Example CUID
  const validDealerLinkData: DealerLinkData = {
    conventionId: validCuid,
    linkedProfileId: validCuid,
    profileType: ProfileType.BRAND,
  };

  it('should validate correct dealer link data', () => {
    const result = DealerLinkSchema.safeParse(validDealerLinkData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conventionId).toBe(validCuid);
      expect(result.data.linkedProfileId).toBe(validCuid);
      expect(result.data.profileType).toBe(ProfileType.BRAND);
      expect(result.data.displayNameOverride).toBeUndefined();
      expect(result.data.descriptionOverride).toBeUndefined();
    }
  });

  it('should validate dealer link data with all optional fields', () => {
    const dataWithOverrides = {
      ...validDealerLinkData,
      displayNameOverride: 'Custom Display Name',
      descriptionOverride: 'Custom description for this convention',
    };
    const result = DealerLinkSchema.safeParse(dataWithOverrides);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayNameOverride).toBe('Custom Display Name');
      expect(result.data.descriptionOverride).toBe('Custom description for this convention');
    }
  });

  it('should accept USER profile type', () => {
    const dataWithUser = {
      ...validDealerLinkData,
      profileType: ProfileType.USER,
    };
    const result = DealerLinkSchema.safeParse(dataWithUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profileType).toBe(ProfileType.USER);
    }
  });

  it('should accept TALENT profile type', () => {
    const dataWithTalent = {
      ...validDealerLinkData,
      profileType: ProfileType.TALENT,
    };
    const result = DealerLinkSchema.safeParse(dataWithTalent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profileType).toBe(ProfileType.TALENT);
    }
  });

  it('should require conventionId to be a valid CUID', () => {
    const result = DealerLinkSchema.safeParse({
      ...validDealerLinkData,
      conventionId: 'not-a-cuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['conventionId']);
      expect(result.error.issues[0].message).toBe('Invalid cuid');
    }
  });

  it('should require linkedProfileId to be a valid CUID', () => {
    const result = DealerLinkSchema.safeParse({
      ...validDealerLinkData,
      linkedProfileId: 'not-a-cuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['linkedProfileId']);
      expect(result.error.issues[0].message).toBe('Invalid cuid');
    }
  });

  it('should require all required fields', () => {
    // Test missing conventionId
    let result = DealerLinkSchema.safeParse({
      linkedProfileId: validCuid,
      profileType: ProfileType.BRAND,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['conventionId']);
    }

    // Test missing linkedProfileId
    result = DealerLinkSchema.safeParse({
      conventionId: validCuid,
      profileType: ProfileType.BRAND,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['linkedProfileId']);
    }

    // Test missing profileType
    result = DealerLinkSchema.safeParse({
      conventionId: validCuid,
      linkedProfileId: validCuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['profileType']);
    }
  });

  it('should reject invalid profile type values', () => {
    const result = DealerLinkSchema.safeParse({
      ...validDealerLinkData,
      profileType: 'INVALID_TYPE',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['profileType']);
      expect(result.error.issues[0].message).toContain('Invalid enum value');
    }
  });

  it('should allow empty strings for optional override fields', () => {
    const dataWithEmptyOverrides = {
      ...validDealerLinkData,
      displayNameOverride: '',
      descriptionOverride: '',
    };
    const result = DealerLinkSchema.safeParse(dataWithEmptyOverrides);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayNameOverride).toBe('');
      expect(result.data.descriptionOverride).toBe('');
    }
  });

  it('should allow null/undefined for optional override fields', () => {
    // Test with undefined
    let result = DealerLinkSchema.safeParse({
      ...validDealerLinkData,
      displayNameOverride: undefined,
      descriptionOverride: undefined,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayNameOverride).toBeUndefined();
      expect(result.data.descriptionOverride).toBeUndefined();
    }

    // Test with null (Zod typically converts null to undefined for optional fields)
    result = DealerLinkSchema.safeParse({
      ...validDealerLinkData,
      displayNameOverride: null,
      descriptionOverride: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayNameOverride).toBeUndefined();
      expect(result.data.descriptionOverride).toBeUndefined();
    }
  });

  it('should reject non-string types for override fields', () => {
    // Test displayNameOverride with non-string
    let result = DealerLinkSchema.safeParse({
      ...validDealerLinkData,
      displayNameOverride: 123,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['displayNameOverride']);
      expect(result.error.issues[0].message).toContain('Expected string');
    }

    // Test descriptionOverride with non-string
    result = DealerLinkSchema.safeParse({
      ...validDealerLinkData,
      descriptionOverride: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['descriptionOverride']);
      expect(result.error.issues[0].message).toContain('Expected string');
    }
  });

  it('should handle edge case with very long override strings', () => {
    const longString = 'A'.repeat(1000); // Very long string
    const result = DealerLinkSchema.safeParse({
      ...validDealerLinkData,
      displayNameOverride: longString,
      descriptionOverride: longString,
    });
    // Schema doesn't currently have length limits, so this should pass
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayNameOverride).toBe(longString);
      expect(result.data.descriptionOverride).toBe(longString);
    }
  });
});