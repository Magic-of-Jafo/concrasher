import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PrimaryVenueForm from './PrimaryVenueForm'; // Adjusted import
import { type VenueData } from '@/lib/validators';
import userEvent from '@testing-library/user-event';

// Mock the ProseMirrorEditor component
jest.mock('@/components/ui/ProseMirrorEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <textarea
      data-testid="mock-prosemirror-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock ImageUploadInput
jest.mock('@/components/shared/ImageUploadInput', () => {
  return jest.fn(({ currentImageUrl, onUploadComplete, onRemoveImage, disabled }) => (
    <div data-testid="mock-image-upload-input">
      {currentImageUrl && <img src={currentImageUrl} alt="preview" />}
      <button onClick={() => onUploadComplete('new-image.jpg')} data-testid="mock-upload-btn" disabled={disabled}>Upload</button>
      <button onClick={() => onRemoveImage && onRemoveImage()} data-testid="mock-remove-btn" disabled={!currentImageUrl || disabled}>Remove</button>
    </div>
  ));
});


describe('PrimaryVenueForm', () => {
  const mockOnChange = jest.fn();
  const defaultTestVenue: VenueData = {
    isPrimaryVenue: true,
    markedForPrimaryPromotion: false,
    venueName: 'Test Venue',
    websiteUrl: 'http://testvenue.com',
    description: '<p>Initial Description</p>',
    googleMapsUrl: 'http://maps.google.com',
    streetAddress: '123 Test St',
    city: 'Testville',
    stateRegion: 'TS',
    postalCode: '12345',
    country: 'Testland',
    contactEmail: 'contact@test.com',
    contactPhone: '555-5555',
    amenities: ['wifi', 'parking'],
    photos: [],
    parkingInfo: 'Lot available',
    publicTransportInfo: 'Bus nearby',
    overallAccessibilityNotes: 'Fully accessible'
  };

  const renderComponent = (props: Partial<React.ComponentProps<typeof PrimaryVenueForm>> = {}) => {
    const componentProps = {
      value: defaultTestVenue,
      onChange: mockOnChange,
      disabled: false,
      errors: {},
      title: 'Test Venue Form',
      isPrimary: true,
      ...props,
    };
    return render(<PrimaryVenueForm {...componentProps} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all basic fields and sections', () => {
    renderComponent();

    expect(screen.getByText('Test Venue Form')).toBeInTheDocument();
    expect(screen.getByLabelText(/venue name/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-prosemirror-editor')).toBeInTheDocument(); // Description
  });

  test('calls onChange when description changes', () => {
    renderComponent();
    const editor = screen.getByTestId('mock-prosemirror-editor');
    fireEvent.change(editor, { target: { value: '<p>New description.</p>' } });
    expect(mockOnChange).toHaveBeenCalledWith({ description: '<p>New description.</p>' });
  });

}); 