import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import crypto from 'crypto';
import VenueHotelTab from './VenueHotelTab';
import { type VenueHotelTabData } from '@/lib/validators';
import { v4 as uuidv4 } from 'uuid';

// Polyfill crypto.randomUUID for the JSDOM environment
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => crypto.randomUUID(),
    },
    configurable: true,
});


// --- Mocks ---

const mockSafeParse = jest.fn();
const mockSchema = {
    safeParse: (data: unknown) => mockSafeParse(data),
};

jest.mock('./PrimaryVenueForm', () => {
    return jest.fn(({ formData }) => (
        <div data-testid="mock-primary-venue-form">
            <p>Venue Name: {formData?.venueName}</p>
        </div>
    ));
});

jest.mock('./HotelForm', () => {
    return jest.fn(({ formData }) => (
        <div data-testid="mock-hotel-form">
            <p>Hotel Name: {formData?.hotelName}</p>
        </div>
    ));
});

jest.mock('uuid', () => ({
    v4: jest.fn(),
}));

// --- Test Setup ---

const mockOnTabChange = jest.fn();
const mockOnValidationChange = jest.fn();

// Recreate necessary helper functions locally to avoid jest.requireActual,
// ensuring they use the polyfilled environment.
const createDefaultVenue = (isPrimary = false) => ({
    id: undefined,
    conventionId: undefined,
    tempId: uuidv4(),
    isPrimaryVenue: isPrimary,
    markedForPrimaryPromotion: false,
    venueName: '',
    streetAddress: '',
    city: '',
    stateRegion: '',
    postalCode: '',
    country: '',
    googleMapsUrl: '',
    description: '',
    photos: [],
    amenities: [],
    parkingInfo: '',
    publicTransportInfo: '',
    overallAccessibilityNotes: ''
});

const createDefaultHotel = (isPrimary = false) => ({
    id: undefined,
    conventionId: undefined,
    tempId: uuidv4(),
    isPrimaryHotel: isPrimary,
    isAtPrimaryVenueLocation: false,
    markedForPrimaryPromotion: false,
    hotelName: '',
    websiteUrl: '',
    googleMapsUrl: '',
    streetAddress: '',
    city: '',
    stateRegion: '',
    postalCode: '',
    country: '',
    description: '',
    photos: [],
    amenities: [],
    parkingInfo: '',
    publicTransportInfo: '',
    overallAccessibilityNotes: '',
    contactEmail: '',
    contactPhone: '',
    groupRateOrBookingCode: '',
    groupPrice: '',
    bookingLink: '',
    bookingCutoffDate: null,
});

const createDefaultVenueHotelTabData = (): VenueHotelTabData => ({
    venues: [createDefaultVenue(true)],
    hotels: [],
    guestsStayAtPrimaryVenue: true,
});

const defaultProps = {
    conventionId: 'conv-123',
    value: createDefaultVenueHotelTabData(),
    onChange: mockOnTabChange,
    onValidationChange: mockOnValidationChange,
    disabled: false,
};

const renderComponent = (props?: Partial<typeof defaultProps>) => {
    const newProps = {
        ...defaultProps,
        ...props,
        value: {
            ...createDefaultVenueHotelTabData(),
            ...JSON.parse(JSON.stringify(props?.value || {}))
        }
    };
    return render(<VenueHotelTab {...newProps} schema={mockSchema as any} />);
};

describe('VenueHotelTab', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSafeParse.mockReturnValue({ success: true });
        (uuidv4 as jest.Mock).mockImplementation(() => 'mock-uuid-' + Math.random());
    });

    test('should render the primary venue accordion', () => {
        renderComponent();
        expect(screen.getByRole('button', { name: /primary venue/i })).toBeInTheDocument();
    });

    test('should pass primary venue data to the PrimaryVenueForm', () => {
        (uuidv4 as jest.Mock).mockReturnValue('venue-id-1');
        const venue = { ...createDefaultVenue(true), venueName: 'Test Primary Venue' };
        const value = { ...createDefaultVenueHotelTabData(), venues: [venue] };

        renderComponent({ value });

        const primaryVenueForm = screen.getByTestId('mock-primary-venue-form');
        expect(within(primaryVenueForm).getByText('Venue Name: Test Primary Venue')).toBeInTheDocument();
    });

    test('should show primary hotel form when guestsStayAtPrimaryVenue is false', async () => {
        const venue = { ...createDefaultVenue(true), venueName: 'Venue 1' };
        const hotel = { ...createDefaultHotel(true), hotelName: 'Hotel 1' }; // Make it primary

        renderComponent({
            value: {
                venues: [venue],
                hotels: [hotel],
                guestsStayAtPrimaryVenue: false,
            }
        });

        // The primary hotel form should be visible immediately
        expect(await screen.findByTestId('mock-hotel-form')).toBeInTheDocument();
    });


    test('should NOT show primary hotel form when guestsStayAtPrimaryVenue is true', () => {
        renderComponent({ value: { ...createDefaultVenueHotelTabData(), guestsStayAtPrimaryVenue: true } });
        expect(screen.queryByRole('button', { name: /primary hotel/i })).not.toBeInTheDocument();
    });

    test('should add a secondary venue', async () => {
        renderComponent();

        // Expand the Secondary Venues accordion
        fireEvent.click(screen.getByRole('button', { name: /secondary venue/i }));

        // Now find and click the "Add" button
        fireEvent.click(await screen.findByRole('button', { name: /add secondary venue/i }));

        expect(mockOnTabChange).toHaveBeenCalledWith(
            expect.objectContaining({
                venues: expect.arrayContaining([
                    expect.objectContaining({ isPrimaryVenue: false })
                ])
            }),
            true
        );
    });

    test('should add an additional hotel', async () => {
        renderComponent();

        // Expand the Additional Hotels accordion
        fireEvent.click(screen.getByRole('button', { name: /additional hotel/i }));

        // Now find and click the "Add" button
        fireEvent.click(await screen.findByRole('button', { name: /add additional hotel/i }));

        expect(mockOnTabChange).toHaveBeenCalledWith(
            expect.objectContaining({
                hotels: expect.arrayContaining([
                    expect.objectContaining({ isPrimaryHotel: false })
                ])
            }),
            true
        );
    });

    describe('Validation Logic', () => {
        it('should call onValidationChange with true on success', () => {
            mockSafeParse.mockReturnValue({ success: true, data: {} });
            renderComponent();
            expect(mockOnValidationChange).toHaveBeenCalledWith(true);
        });

        it('should call onValidationChange with false on failure', () => {
            mockSafeParse.mockReturnValue({ success: false, error: { issues: [] } });
            renderComponent();
            expect(mockOnValidationChange).toHaveBeenCalledWith(false);
        });
    });

    describe('Real Schema Validation', () => {
        it('should fail validation if guestsStayAtPrimaryVenue is false and no primary hotel is set', () => {
            const { VenueHotelTabSchema: ActualTestSchema, createDefaultHotel: actualCreateDefaultHotel, createDefaultVenue: actualCreateDefaultVenue } = jest.requireActual('@/lib/validators');
            const data: VenueHotelTabData = {
                venues: [{
                    ...actualCreateDefaultVenue(true),
                    venueName: 'Test Venue', // Required field!
                    // Add any other required venue fields here if needed
                }],
                hotels: [actualCreateDefaultHotel(false)],
                guestsStayAtPrimaryVenue: false,
            };

            const result = ActualTestSchema.safeParse(data);
            expect(result.success).toBe(false);
            const message = result.error?.issues[0]?.message;
            expect(message).toBe('A primary hotel is required if the venue is not serving as the hotel.');

        });
    });
}); 