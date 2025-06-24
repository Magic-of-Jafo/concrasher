import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import VenueHotelTab from './VenueHotelTab';
import { 
  type VenueHotelTabData, 
  type VenueData, 
  type HotelData,
  createDefaultVenueHotelTabData,
  createDefaultVenue,
  createDefaultHotel
} from '@/lib/validators';
import { v4 as uuidv4 } from 'uuid';

// Mock at module level 
const mockVenueHotelTabSchema = {
  safeParse: jest.fn().mockImplementation((data) => ({ 
    success: true, 
    data: data 
  })),
};

// Override VenueHotelTabSchema in the component
jest.mock('@/lib/validators', () => {
  const originalModule = jest.requireActual('@/lib/validators');
  return {
    __esModule: true,
    ...originalModule,
    VenueHotelTabSchema: mockVenueHotelTabSchema,
  };
});

// Mock PrimaryVenueForm
jest.mock('./PrimaryVenueForm', () => {
  return jest.fn(({ formData, onFormDataChange, errors, title, disabled }) => (
    <div data-testid={`mock-primary-venue-form-${title?.toLowerCase().replace(/\s+/g, '-') || 'default'}`}>
      <p>Title: {title}</p>
      <p>Venue Name: {formData?.venueName}</p>
      <button onClick={() => onFormDataChange({ venueName: 'Mock Changed Venue' })} data-testid="mock-change-pv-name">
        Change PV Name
      </button>
      {/* Add more specific mock interactions if needed */}
    </div>
  ));
});

// Mock HotelForm
jest.mock('./HotelForm', () => {
  return jest.fn(({ formData, onFormDataChange, errors, title, disabled, isPrimaryHotel }) => (
    <div data-testid={`mock-hotel-form-${title?.toLowerCase().replace(/\s+/g, '-') || 'default'}`}>
      <p>Title: {title}</p>
      <p>Hotel Name: {formData?.hotelName}</p>
      <p>Is Primary: {isPrimaryHotel ? 'Yes' : 'No'}</p>
      <button onClick={() => onFormDataChange({ hotelName: 'Mock Changed Hotel' })} data-testid="mock-change-h-name">
        Change H Name
      </button>
      {/* Add more specific mock interactions if needed */}
    </div>
  ));
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const mockOnTabChange = jest.fn();
const mockOnValidationChange = jest.fn();

const defaultProps = {
  conventionId: 'conv-123',
  value: createDefaultVenueHotelTabData(),
  onChange: mockOnTabChange,
  onValidationChange: mockOnValidationChange,
  disabled: false,
};

const renderComponent = (props?: Partial<typeof defaultProps>) => {
  // Ensure 'value' is always fully provided even if overridden partially
  // This deep merge is a bit naive for nested arrays/objects but should work for top-level value replacement
  const newProps = { ...defaultProps, ...props };
  if (props?.value) {
    newProps.value = { ...createDefaultVenueHotelTabData(), ...props.value };
    // Further deep merge for nested structures like primaryVenue, hotels array etc. if needed
    if (props.value.primaryVenue) {
      newProps.value.primaryVenue = { ...(createDefaultVenueHotelTabData().primaryVenue || createDefaultVenue(true)), ...props.value.primaryVenue };
    }
    if (props.value.primaryHotelDetails) {
      newProps.value.primaryHotelDetails = { ...(createDefaultVenueHotelTabData().primaryHotelDetails || createDefaultHotel(true)), ...props.value.primaryHotelDetails };
    }
    // Note: Arrays like hotels and secondaryVenues might need more careful merging if partial updates are tested.
    // For now, if props.value.hotels is provided, it replaces the default entirely.
  }

  return render(<VenueHotelTab {...newProps} />);
};

describe('VenueHotelTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset uuid mock if it needs to generate different values across tests
    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid-1234'); 
    // Reset the VenueHotelTabSchema mock to avoid test interference
    mockVenueHotelTabSchema.safeParse.mockImplementation((data) => ({ 
      success: true, 
      data: data 
    }));
  });

  test('renders all main accordion sections', () => {
    renderComponent();
                                             
    // Debug to see all buttons on the screen
    screen.getAllByRole('button').forEach(button => {
      if (button.textContent) {
        console.log('Button text:', button.textContent);  
      }
    });
    
    // MUI AccordionSummary role is button
    expect(screen.getByRole('button', { name: /primary venue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /secondary venue\(s\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /primary hotel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /additional hotel\(s\)/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/guests will not be staying at this primary venue location/i)).toBeInTheDocument();
  });

  test('passes initial primary venue data to PrimaryVenueForm', () => {
    const initialValue: VenueHotelTabData = {
      ...createDefaultVenueHotelTabData(),
      primaryVenue: {
        ...createDefaultVenue(true),
        venueName: 'Initial Primary Venue',
      },
    };
    renderComponent({ value: initialValue });

    // The mock PrimaryVenueForm renders the title and venueName
    // MUI Accordion is expanded by default for primaryVenue in the component
    const primaryVenueForm = screen.getByTestId('mock-primary-venue-form-primary-venue-details');
    expect(within(primaryVenueForm).getByText('Title: Primary Venue Details')).toBeInTheDocument();
    expect(within(primaryVenueForm).getByText('Venue Name: Initial Primary Venue')).toBeInTheDocument();
  });

  test('passes initial primary hotel data to HotelForm when guestsStayAtPrimaryVenue is false', () => {
    const initialValue: VenueHotelTabData = {
      ...createDefaultVenueHotelTabData(),
      guestsStayAtPrimaryVenue: false,
      primaryHotelDetails: {
        ...createDefaultHotel(true),
        hotelName: 'Initial Primary Hotel',
      },
    };
    renderComponent({ value: initialValue });
    // Expand the Primary Hotel accordion if not expanded by default when guestsStayAtPrimaryVenue is false
    // (Component logic might auto-expand it)
    // Let's assume it becomes visible for the test.
    const primaryHotelAccordion = screen.getByRole('button', { name: /primary hotel/i });
    // Check if it's already expanded, or click to expand
    if (primaryHotelAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(primaryHotelAccordion);
    }

    const primaryHotelForm = screen.getByTestId('mock-hotel-form-primary-hotel-details');
    expect(within(primaryHotelForm).getByText('Title: Primary Hotel Details')).toBeInTheDocument();
    expect(within(primaryHotelForm).getByText('Hotel Name: Initial Primary Hotel')).toBeInTheDocument();
    expect(within(primaryHotelForm).getByText('Is Primary: Yes')).toBeInTheDocument(); 
  });

  test('does not render Primary Hotel form if guestsStayAtPrimaryVenue is true by default', () => {
    const initialValue: VenueHotelTabData = {
      ...createDefaultVenueHotelTabData(),
      guestsStayAtPrimaryVenue: true,
    };
    renderComponent({ value: initialValue });
    // The Primary Hotel accordion/section should ideally not contain the form, 
    // or the form mock itself should not be found with primary hotel details.
    // Depending on implementation, the AccordionDetails might be empty or the form mock not rendered.
    // Let's check that the specific mock for primary hotel is NOT in the document.
    expect(screen.queryByTestId('mock-hotel-form-primary-hotel-details')).not.toBeInTheDocument();
    // Or, if the accordion is there but details are hidden:
    const primaryHotelAccordion = screen.getByRole('button', { name: /primary hotel/i });
    // Ensure its details are not expanded/visible or the form is not there.
    // VenueHotelTab logic: if guestsStayAtPrimaryVenue is true, primaryHotelDetails is undefined.
    // The mock HotelForm receives formData, so if primaryHotelDetails is undefined, formData would be effectively empty or default.
    // The key is that the section should be visually distinct (e.g. accordion disabled or different content)
    // For this test, not finding the specific form is a good check.
  });

  test('toggling "Guests stay at primary venue" checkbox hides/shows Primary Hotel form and calls onChange', () => {
    renderComponent();
    const guestsStayCheckbox = screen.getByLabelText(/guests will not be staying at this primary venue location/i);

    // Initial state: checkbox is likely unchecked (guests DO stay or need separate primary hotel)
    // Primary Hotel form should be visible (or its mock should be found)
    // Expand the Primary Hotel accordion if not already expanded by default
    const primaryHotelAccordionInitial = screen.getByRole('button', { name: /primary hotel/i });
    if (primaryHotelAccordionInitial.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(primaryHotelAccordionInitial);
    }
    expect(screen.getByTestId('mock-hotel-form-primary-hotel-details')).toBeInTheDocument();

    // 1. Check the box (Guests stay at primary venue)
    fireEvent.click(guestsStayCheckbox);

    expect(mockOnTabChange).toHaveBeenCalledWith(
      expect.objectContaining({
        guestsStayAtPrimaryVenue: true,
        primaryHotelDetails: undefined, // Or whatever the component sets it to when hidden
      }),
      true // isValid flag
    );
    // Primary Hotel form mock should no longer be in the document or visible
    expect(screen.queryByTestId('mock-hotel-form-primary-hotel-details')).not.toBeInTheDocument();

    // 2. Uncheck the box (Guests WILL stay OR separate primary hotel needed)
    fireEvent.click(guestsStayCheckbox);
    
    expect(mockOnTabChange).toHaveBeenCalledWith(
      expect.objectContaining({
        guestsStayAtPrimaryVenue: false,
        primaryHotelDetails: expect.objectContaining({ hotelName: '', isPrimaryHotel: true }), // Expect a default primary hotel object
      }),
      true // isValid flag
    );
    // Primary Hotel form mock should be back (accordion might need re-expanding depending on component logic)
    const primaryHotelAccordionAfterUncheck = screen.getByRole('button', { name: /primary hotel/i });
    if (primaryHotelAccordionAfterUncheck.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(primaryHotelAccordionAfterUncheck);
    }
    expect(screen.getByTestId('mock-hotel-form-primary-hotel-details')).toBeInTheDocument();
  });

  describe('Primary Venue Form Interaction', () => {
    test('updates primary venue when its (mocked) form data changes', () => {
      renderComponent();
      const primaryVenueAccordion = screen.getByRole('button', { name: /primary venue/i });
      if (primaryVenueAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(primaryVenueAccordion);
      }

      const changeNameButton = within(screen.getByTestId('mock-primary-venue-form-primary-venue-details')).getByTestId('mock-change-pv-name');
      fireEvent.click(changeNameButton);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryVenue: expect.objectContaining({ venueName: 'Mock Changed Venue' }),
        }),
        true
      );
    });
  });

  describe('Primary Hotel Form Interaction', () => {
    test('updates primary hotel when its (mocked) form data changes', () => {
      // Ensure primary hotel form is visible
      const initialDataWithPrimaryHotel = {
        ...createDefaultVenueHotelTabData(),
        guestsStayAtPrimaryVenue: false,
        primaryHotelDetails: { ...createDefaultHotel(true), hotelName: 'Initial Primary Hotel' },
      };
      renderComponent({ value: initialDataWithPrimaryHotel });

      const primaryHotelAccordion = screen.getByRole('button', { name: /primary hotel/i });
      if (primaryHotelAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(primaryHotelAccordion);
      }

      const changeNameButton = within(screen.getByTestId('mock-hotel-form-primary-hotel-details')).getByTestId('mock-change-h-name');
      fireEvent.click(changeNameButton);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryHotelDetails: expect.objectContaining({ hotelName: 'Mock Changed Hotel' }),
        }),
        true
      );
    });
  });

  describe('Secondary Venue(s) Management', () => {
    test('adds a new secondary venue when "Add Secondary Venue" is clicked', () => {
      renderComponent();
      const secondaryVenuesAccordion = screen.getByRole('button', { name: /secondary venue\(s\)/i });
      if (secondaryVenuesAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(secondaryVenuesAccordion);
      }

      // Find the button by both role and text content that contains "Add Secondary Venue"
      const buttons = screen.getAllByRole('button');
      const addSecondaryVenueButton = buttons.find(
        button => button.textContent?.toLowerCase().includes('add secondary venue')
      );
      
      if (!addSecondaryVenueButton) {
        throw new Error("Add Secondary Venue button not found");
      }
      
      fireEvent.click(addSecondaryVenueButton);

      // Check if the mock form for the new secondary venue appears
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryVenues: expect.arrayContaining([
            expect.objectContaining({ tempId: 'mock-uuid-1234', venueName: '' }), // Default new venue from createDefaultVenue
          ]),
        }),
        true
      );
    });

    test('removes a secondary venue when its delete button is clicked', () => {
      const initialSecondaryVenue = { ...createDefaultVenue(), tempId: 'sv-1', venueName: 'Old Secondary' };
      renderComponent({ value: { ...createDefaultVenueHotelTabData(), secondaryVenues: [initialSecondaryVenue] } });

      // Ensure the secondary venue accordion is expanded
      const secondaryVenuesAccordion = screen.getByRole('button', { name: /secondary venue\(s\)/i });
      if (secondaryVenuesAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(secondaryVenuesAccordion);
      }
      
      // Find delete button by icon type or class rather than text
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(
        button => button.className.includes('MuiIconButton-colorError') || 
                  button.getAttribute('aria-label')?.toLowerCase().includes('remove secondary venue')
      );
      
      if (!deleteButton) {
        throw new Error("Delete button for secondary venue not found");
      }
      
      fireEvent.click(deleteButton);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({ secondaryVenues: [] }),
        true
      );
    });

    test('updates a secondary venue when its (mocked) form data changes', () => {
      const initialSecondaryVenue = { ...createDefaultVenue(), tempId: 'sv-1', venueName: 'Old Secondary' };
      renderComponent({ value: { ...createDefaultVenueHotelTabData(), secondaryVenues: [initialSecondaryVenue] } });
      
      const secondaryVenuesAccordion = screen.getByRole('button', { name: /secondary venue\(s\)/i });
      if (secondaryVenuesAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(secondaryVenuesAccordion);
      }

      // Access the SecondaryVenue mock form by its index in the component structure
      // The mock should render the change button we need
      const mockForms = screen.getAllByTestId(/^mock-primary-venue-form/);
      const secondaryForm = mockForms.find(form => 
        form.textContent?.includes('Secondary Venue') || 
        form.textContent?.toLowerCase().includes('old secondary')
      );
      
      if (!secondaryForm) {
        throw new Error("Secondary venue form not found");
      }
      
      const changeNameButton = within(secondaryForm).getByTestId('mock-change-pv-name');
      fireEvent.click(changeNameButton);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryVenues: expect.arrayContaining([
            expect.objectContaining({ tempId: 'sv-1', venueName: 'Mock Changed Venue' }),
          ]),
        }),
        true
      );
    });
    
    test('toggles markedForPrimaryPromotion for a secondary venue', () => {
      const venue1 = { ...createDefaultVenue(), tempId: 'sv-1', venueName: 'Venue One', markedForPrimaryPromotion: false };
      renderComponent({ 
        value: { 
          ...createDefaultVenueHotelTabData(), 
          primaryVenue: { ...createDefaultVenue(true), venueName: 'Main PV' }, // Ensure a primary venue exists
          secondaryVenues: [venue1] 
        }
      });

      const secondaryVenuesAccordion = screen.getByRole('button', { name: /secondary venue\(s\)/i });
      if (secondaryVenuesAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(secondaryVenuesAccordion);
      }

      // Find all checkboxes in the document
      const checkboxes = screen.getAllByRole('checkbox');
      // Find the checkbox for "Make Primary" by its context (it should be near the secondary venue heading)
      const makePrimaryCheckbox = checkboxes.find(checkbox => {
        const formControlLabel = checkbox.closest('label');
        return formControlLabel?.textContent?.includes('Make Primary');
      });
        
      if (!makePrimaryCheckbox) {
        throw new Error('Make primary checkbox not found');
      }
        
      fireEvent.click(makePrimaryCheckbox);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryVenues: expect.arrayContaining([
            expect.objectContaining({ tempId: 'sv-1', venueName: 'Venue One', markedForPrimaryPromotion: true }),
          ]),
        }),
        true
      );

      // Uncheck it
      fireEvent.click(makePrimaryCheckbox);
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryVenues: expect.arrayContaining([
            expect.objectContaining({ tempId: 'sv-1', venueName: 'Venue One', markedForPrimaryPromotion: false }),
          ]),
        }),
        true
      );
    });

    test('markedForPrimaryPromotion respects "first checked wins" for secondary venues', () => {
      const venue1 = { ...createDefaultVenue(), tempId: 'sv-1', venueName: 'Venue One', markedForPrimaryPromotion: false };
      const venue2 = { ...createDefaultVenue(), tempId: 'sv-2', venueName: 'Venue Two', markedForPrimaryPromotion: false };
      renderComponent({ 
        value: { 
          ...createDefaultVenueHotelTabData(), 
          secondaryVenues: [venue1, venue2] 
        }
      });

      const secondaryVenuesAccordion = screen.getByRole('button', { name: /secondary venue\(s\)/i });
      if (secondaryVenuesAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(secondaryVenuesAccordion);
      }
      
      // Use the same approach as for hotels to find the right checkboxes
      const allCheckboxLabels = screen.getAllByRole('checkbox').map(checkbox => {
        const label = checkbox.closest('label');
        return {
          checkbox,
          isVenueMakePrimary: label?.textContent?.includes('Make Primary') && 
                            !label?.textContent?.includes('The Venue is also the primary hotel') &&
                            !!label?.closest('[role="region"]')?.previousSibling?.textContent?.includes('Secondary Venue')
        };
      });
      
      const venueCheckboxes = allCheckboxLabels
        .filter(item => item.isVenueMakePrimary)
        .map(item => item.checkbox);
      
      expect(venueCheckboxes.length).toBe(2);

      // Check the first one
      fireEvent.click(venueCheckboxes[0]);
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryVenues: expect.arrayContaining([
            expect.objectContaining({ tempId: 'sv-1', markedForPrimaryPromotion: true }),
            expect.objectContaining({ tempId: 'sv-2', markedForPrimaryPromotion: false }),
          ]),
        }),
        true
      );

      // Try to check the second one - it should not get marked if first-wins logic is in place
      fireEvent.click(venueCheckboxes[1]);
      const lastCallArgs = mockOnTabChange.mock.calls[mockOnTabChange.mock.calls.length - 1][0];
      expect(lastCallArgs.secondaryVenues).toEqual(expect.arrayContaining([
        expect.objectContaining({ tempId: 'sv-1', markedForPrimaryPromotion: true }),
        expect.objectContaining({ tempId: 'sv-2', markedForPrimaryPromotion: false }), // Should remain false
      ]));

      // Uncheck the first one
      fireEvent.click(venueCheckboxes[0]);
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryVenues: expect.arrayContaining([
            expect.objectContaining({ tempId: 'sv-1', markedForPrimaryPromotion: false }),
            expect.objectContaining({ tempId: 'sv-2', markedForPrimaryPromotion: false }),
          ]),
        }),
        true
      );

      // Now check the second one, it should get marked
      fireEvent.click(venueCheckboxes[1]);
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryVenues: expect.arrayContaining([
            expect.objectContaining({ tempId: 'sv-1', markedForPrimaryPromotion: false }),
            expect.objectContaining({ tempId: 'sv-2', markedForPrimaryPromotion: true }),
          ]),
        }),
        true
      );
    });
  });

  describe('Secondary Hotel(s) Management', () => {
    const hotel1Data: HotelData = { ...createDefaultHotel(), tempId: 'hotel-1', hotelName: 'Hotel Alpha', markedForPrimaryPromotion: false };
    const hotel2Data: HotelData = { ...createDefaultHotel(), tempId: 'hotel-2', hotelName: 'Hotel Beta', markedForPrimaryPromotion: false };

    test('adds a new additional hotel when "Add Hotel" is clicked', () => {
      renderComponent({ 
        value: { 
          ...createDefaultVenueHotelTabData(), 
          guestsStayAtPrimaryVenue: false,
          primaryHotelDetails: createDefaultHotel(true)  // Ensure primaryHotelDetails is provided
        } 
      });
      
      const additionalHotelsAccordion = screen.getByRole('button', { name: /additional hotel\(s\)/i });
      if (additionalHotelsAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(additionalHotelsAccordion);
      }

      // Find the Add Hotel button by its text content
      const buttons = screen.getAllByRole('button');
      const addHotelButton = buttons.find(
        button => button.textContent?.toLowerCase().includes('add hotel')
      );
      
      if (!addHotelButton) {
        throw new Error("Add Hotel button not found");
      }
      
      fireEvent.click(addHotelButton);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hotels: expect.arrayContaining([
            expect.objectContaining({ tempId: 'mock-uuid-1234', hotelName: '' }) // Default new hotel
          ]),
        }),
        true
      );
    });

    test('removes an additional hotel when its delete button is clicked', () => {
      renderComponent({ 
        value: { 
          ...createDefaultVenueHotelTabData(), 
          guestsStayAtPrimaryVenue: false, 
          primaryHotelDetails: createDefaultHotel(true),
          hotels: [hotel1Data] 
        }
      });

      const additionalHotelsAccordion = screen.getByRole('button', { name: /additional hotel\(s\)/i });
      if (additionalHotelsAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(additionalHotelsAccordion);
      }
      
      // Find all buttons that could be delete buttons
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find(button => 
        button.className.includes('MuiIconButton-colorError') || 
        button.getAttribute('aria-label')?.toLowerCase().includes('remove hotel')
      );
      
      if (!deleteButton) {
        throw new Error("Delete button for hotel not found");
      }
      
      fireEvent.click(deleteButton);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({ hotels: [] }),
        true
      );
    });

    test('updates an additional hotel when its (mocked) form data changes', () => {
      renderComponent({ 
        value: { 
          ...createDefaultVenueHotelTabData(), 
          guestsStayAtPrimaryVenue: false,
          primaryHotelDetails: createDefaultHotel(true),
          hotels: [hotel1Data] 
        }
      });

      const additionalHotelsAccordion = screen.getByRole('button', { name: /additional hotel\(s\)/i });
      if (additionalHotelsAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(additionalHotelsAccordion);
      }

      // Find the hotel form by looking at all hotel forms
      const mockForms = screen.getAllByTestId(/^mock-hotel-form/);
      const hotelForm = mockForms.find(form => 
        form.textContent?.includes('Hotel 1') ||
        form.textContent?.toLowerCase().includes('hotel alpha')
      );
      
      if (!hotelForm) {
        throw new Error("Hotel form not found");
      }
      
      const changeNameButton = within(hotelForm).getByTestId('mock-change-h-name');
      fireEvent.click(changeNameButton);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hotels: expect.arrayContaining([
            expect.objectContaining({ tempId: 'hotel-1', hotelName: 'Mock Changed Hotel' }),
          ]),
        }),
        true
      );
    });

    test('toggles markedForPrimaryPromotion for an additional hotel', () => {
      renderComponent({ 
        value: { 
          ...createDefaultVenueHotelTabData(), 
          guestsStayAtPrimaryVenue: false, // To enable primary hotel logic for additional hotels
          primaryHotelDetails: { ...createDefaultHotel(true), hotelName: 'Main Hotel' }, // A primary must exist for others to be promotable
          hotels: [hotel1Data] 
        }
      });

      const additionalHotelsAccordion = screen.getByRole('button', { name: /additional hotel\(s\)/i });
      if (additionalHotelsAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(additionalHotelsAccordion);
      }
      
      // Find checkboxes in the additional hotels accordion section
      const checkboxes = screen.getAllByRole('checkbox');
      const makePrimaryCheckbox = checkboxes.find(checkbox => {
        const formControlLabel = checkbox.closest('label');
        return formControlLabel?.textContent?.includes('Make Primary') &&
               // Check that it's in the additional hotels section, not the primary hotel section
               formControlLabel?.closest('[role="region"]')?.previousSibling?.textContent?.includes('Additional Hotel');
      });
      
      if (!makePrimaryCheckbox) {
        throw new Error('Make primary checkbox for hotel not found');
      }
      
      fireEvent.click(makePrimaryCheckbox);

      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hotels: expect.arrayContaining([
            expect.objectContaining({ tempId: 'hotel-1', markedForPrimaryPromotion: true }),
          ]),
        }),
        true
      );

      fireEvent.click(makePrimaryCheckbox); // Uncheck
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hotels: expect.arrayContaining([
            expect.objectContaining({ tempId: 'hotel-1', markedForPrimaryPromotion: false }),
          ]),
        }),
        true
      );
    });

    test('markedForPrimaryPromotion respects "first checked wins" for additional hotels', () => {
      renderComponent({ 
        value: { 
          ...createDefaultVenueHotelTabData(), 
          guestsStayAtPrimaryVenue: false,
          primaryHotelDetails: { ...createDefaultHotel(true), hotelName: 'Main Hotel' }, // A primary must exist
          hotels: [hotel1Data, hotel2Data]
        }
      });

      const additionalHotelsAccordion = screen.getByRole('button', { name: /additional hotel\(s\)/i });
      if (additionalHotelsAccordion.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(additionalHotelsAccordion);
      }

      // We need to be smarter about finding the "Make Primary" checkboxes for just the additional hotels
      const allCheckboxLabels = screen.getAllByRole('checkbox').map(checkbox => {
        const label = checkbox.closest('label');
        return {
          checkbox,
          isHotelMakePrimary: label?.textContent?.includes('Make Primary') && 
                           !label?.textContent?.includes('The Venue is also the primary hotel') &&
                           !!label?.closest('[role="region"]')?.previousSibling?.textContent?.includes('Additional Hotel')
        };
      });
      
      const hotelCheckboxes = allCheckboxLabels
        .filter(item => item.isHotelMakePrimary)
        .map(item => item.checkbox);
      
      // Make sure we found exactly 2 "Make Primary" checkboxes for our additional hotels
      expect(hotelCheckboxes.length).toBe(2);

      // Check hotel1Data
      fireEvent.click(hotelCheckboxes[0]);
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hotels: expect.arrayContaining([
            expect.objectContaining({ tempId: 'hotel-1', markedForPrimaryPromotion: true }),
            expect.objectContaining({ tempId: 'hotel-2', markedForPrimaryPromotion: false }),
          ]),
        }),
        true
      );

      // Attempt to check hotel2Data - it should not get marked if first wins
      fireEvent.click(hotelCheckboxes[1]);
      const lastCallArgs = mockOnTabChange.mock.calls[mockOnTabChange.mock.calls.length - 1][0];
      // This depends on VenueHotelTab's internal logic: if it prevents multiple true flags or relies on parent to resolve.
      // Assuming for now it implements first-wins directly in its state for UI feedback.
      expect(lastCallArgs.hotels).toEqual(expect.arrayContaining([
        expect.objectContaining({ tempId: 'hotel-1', markedForPrimaryPromotion: true }),
        expect.objectContaining({ tempId: 'hotel-2', markedForPrimaryPromotion: false }),
      ]));

      // Uncheck hotel1Data
      fireEvent.click(hotelCheckboxes[0]);
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hotels: expect.arrayContaining([
            expect.objectContaining({ tempId: 'hotel-1', markedForPrimaryPromotion: false }),
            expect.objectContaining({ tempId: 'hotel-2', markedForPrimaryPromotion: false }),
          ]),
        }),
        true
      );
      // Now check hotel2Data, it should work
      fireEvent.click(hotelCheckboxes[1]);
      expect(mockOnTabChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hotels: expect.arrayContaining([
            expect.objectContaining({ tempId: 'hotel-1', markedForPrimaryPromotion: false }),
            expect.objectContaining({ tempId: 'hotel-2', markedForPrimaryPromotion: true }),
          ]),
        }),
        true
      );
    });
  });

});

// This is the beginning of VenueHotelTab.test.tsx 