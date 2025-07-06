export const mockConvention = {
    name: 'TestCon',
    coverImageUrl: '',
    profileImageUrl: '',
    descriptionMain: '<p>Description</p>',
    priceTiers: [],
    priceDiscounts: [],
    venues: [],
    hotels: [],
    scheduleDays: [],
    dealerLinks: [],
    media: [],
};

// Jest requires at least one test in files under __tests__ directories
// This is a no-op test to ensure the file is treated purely as a helper module.
describe('mockConvention helper', () => {
    it('should export a mock convention object', () => {
        expect(mockConvention).toBeDefined();
    });
}); 