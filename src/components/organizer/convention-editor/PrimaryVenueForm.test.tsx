import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PrimaryVenueForm from './PrimaryVenueForm'; // Adjusted import
import { type VenueData } from '@/lib/validators';

// Mock the TinyMCE Editor component
jest.mock('@tinymce/tinymce-react', () => ({
  Editor: jest.fn((props) => (
    <textarea
      data-testid="mock-tinymce-editor"
      value={props.initialValue || props.value}
      onChange={(e) => {
        if (props.onEditorChange) {
          props.onEditorChange(e.target.value, {} as any);
        }
      }}
      disabled={props.disabled}
    />
  )),
}));

// Mock ImageUploadInput
jest.mock('@/components/shared/ImageUploadInput', () => {
  return jest.fn(({ currentImageUrl, onUploadComplete, onRemoveImage, label, disabled }) => (
    <div data-testid="mock-image-upload-input">
      <p>Label: {label}</p>
      {currentImageUrl && <img src={currentImageUrl} alt="preview" />}
      <button onClick={() => onUploadComplete('new-image.jpg')} data-testid="mock-upload-btn" disabled={disabled}>
        Upload
      </button>
      <button onClick={() => onRemoveImage && onRemoveImage()} data-testid="mock-remove-btn" disabled={disabled || !currentImageUrl}>
        Remove
      </button>
    </div>
  ));
});

const mockOnFormDataChange = jest.fn();

const defaultProps = {
  formData: { // Provide a minimal valid VenueData structure
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
    photos: [],
    parkingInfo: '',
    publicTransportInfo: '',
    overallAccessibilityNotes: '',
    isPrimaryVenue: true, // or false, as appropriate
    markedForPrimaryPromotion: false,
  } as VenueData,
  onFormDataChange: mockOnFormDataChange,
  disabled: false,
  errors: {},
  title: 'Test Venue Form',
};

const renderComponent = (props?: Partial<typeof defaultProps>) => {
  return render(<PrimaryVenueForm {...defaultProps} {...props} />);
};

describe('PrimaryVenueForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all basic fields and sections', () => {
    renderComponent();

    expect(screen.getByText('Test Venue Form')).toBeInTheDocument();

    // Check for some key fields
    expect(screen.getByLabelText(/venue name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-tinymce-editor')).toBeInTheDocument(); // Description
    expect(screen.getByTestId('mock-image-upload-input')).toBeInTheDocument(); // Venue Photo upload
    expect(screen.getByLabelText(/google maps url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state \/ region/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amenities \(one per line\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/parking information/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/public transportation access/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/overall accessibility notes/i)).toBeInTheDocument();
  });

  test('pre-populates with initial formData', () => {
    const initialFormData: VenueData = {
      ...defaultProps.formData,
      venueName: 'Grand Venue Hall',
      websiteUrl: 'http://grandvenue.com',
      description: '<p>A grand place for events.</p>',
      googleMapsUrl: 'http://maps.google.com/?q=grandvenue',
      streetAddress: '123 Main St',
      city: 'Venue City',
      stateRegion: 'Venue State',
      postalCode: '12345',
      country: 'Venue Country',
      contactEmail: 'contact@grandvenue.com',
      contactPhone: '555-1234',
      amenities: ['WiFi', 'Stage'],
      photos: [{ url: 'existing-photo.jpg', caption: 'Main Hall' }],
      parkingInfo: 'Ample parking available.',
      publicTransportInfo: 'Bus stop nearby.',
      overallAccessibilityNotes: 'Fully accessible.',
    };
    renderComponent({ formData: initialFormData });

    expect(screen.getByLabelText(/venue name/i)).toHaveValue('Grand Venue Hall');
    expect(screen.getByLabelText(/website url/i)).toHaveValue('http://grandvenue.com');
    expect(screen.getByTestId('mock-tinymce-editor')).toHaveValue('<p>A grand place for events.</p>');

    // Check that ImageUploadInput received the correct currentImageUrl (via mock)
    const imageUploadMock = screen.getByTestId('mock-image-upload-input');
    expect(imageUploadMock.querySelector('img')).toHaveAttribute('src', 'existing-photo.jpg');
    // And that the caption field is populated (if photo exists)
    expect(screen.getByLabelText(/photo caption/i)).toHaveValue('Main Hall');

    expect(screen.getByLabelText(/google maps url/i)).toHaveValue('http://maps.google.com/?q=grandvenue');
    expect(screen.getByLabelText(/street address/i)).toHaveValue('123 Main St');
    expect(screen.getByLabelText(/city/i)).toHaveValue('Venue City');
    expect(screen.getByLabelText(/state \/ region/i)).toHaveValue('Venue State');
    expect(screen.getByLabelText(/postal code/i)).toHaveValue('12345');
    expect(screen.getByLabelText(/country/i)).toHaveValue('Venue Country');
    expect(screen.getByLabelText(/contact email/i)).toHaveValue('contact@grandvenue.com');
    expect(screen.getByLabelText(/contact phone/i)).toHaveValue('555-1234');
    expect(screen.getByLabelText(/amenities \(one per line\)/i)).toHaveValue('WiFi\nStage'); // Textarea joins with newline
    expect(screen.getByLabelText(/parking information/i)).toHaveValue('Ample parking available.');
    expect(screen.getByLabelText(/public transportation access/i)).toHaveValue('Bus stop nearby.');
    expect(screen.getByLabelText(/overall accessibility notes/i)).toHaveValue('Fully accessible.');
  });

  test('calls onFormDataChange when a text input changes (e.g., venueName)', () => {
    renderComponent();
    const venueNameInput = screen.getByLabelText(/venue name/i);
    fireEvent.change(venueNameInput, { target: { value: 'New Venue' } });
    // For venueName, onFormDataChange is called onBlur
    fireEvent.blur(venueNameInput);
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ venueName: 'New Venue' });
  });

  test('calls onFormDataChange for websiteUrl immediately with http prepended if needed', () => {
    renderComponent();
    const websiteInput = screen.getByLabelText(/website url/i);
    fireEvent.change(websiteInput, { target: { value: 'example.com' } });
    // onChange for websiteUrl calls onFormDataChange directly
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ websiteUrl: 'http://example.com' });

    fireEvent.change(websiteInput, { target: { value: 'https://secure.example.com' } });
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ websiteUrl: 'https://secure.example.com' });
  });

  test('calls onFormDataChange when amenities text area changes', () => {
    renderComponent();
    const amenitiesInput = screen.getByLabelText(/amenities \(one per line\)/i);
    fireEvent.change(amenitiesInput, { target: { value: 'New Amenity 1\nNew Amenity 2' } });
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ amenities: ['New Amenity 1', 'New Amenity 2'] });
  });

  test('calls onFormDataChange when TinyMCE editor content changes', () => {
    renderComponent();
    const editor = screen.getByTestId('mock-tinymce-editor');
    fireEvent.change(editor, { target: { value: '<p>New description.</p>' } });
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ description: '<p>New description.</p>' });
  });

  test('calls onFormDataChange with new photo url when image is uploaded', () => {
    renderComponent({ formData: { ...defaultProps.formData, photos: [] } });
    const uploadButton = screen.getByTestId('mock-upload-btn');
    fireEvent.click(uploadButton);
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ photos: [{ url: 'new-image.jpg', caption: '' }] });
  });

  test('calls onFormDataChange with existing caption when new image is uploaded and caption existed', () => {
    renderComponent({
      formData: {
        ...defaultProps.formData,
        photos: [{ url: 'old.jpg', caption: 'Old Caption' }]
      }
    });
    // Simulate removing the old image first (or just directly uploading)
    // For this test, assume an image is already there and we're replacing it via a new upload.
    // The mock currently calls onUploadComplete with 'new-image.jpg'.
    // The handlePhotoUpload in the component should preserve the caption.
    const uploadButton = screen.getByTestId('mock-upload-btn');
    fireEvent.click(uploadButton);
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ photos: [{ url: 'new-image.jpg', caption: 'Old Caption' }] });
  });

  test('calls onFormDataChange with empty array when image is removed', () => {
    renderComponent({ formData: { ...defaultProps.formData, photos: [{ url: 'existing.jpg', caption: 'Test' }] } });
    const removeButton = screen.getByTestId('mock-remove-btn');
    expect(removeButton).not.toBeDisabled();
    fireEvent.click(removeButton);
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ photos: [] });
  });

  test('calls onFormDataChange when photo caption is changed', () => {
    renderComponent({ formData: { ...defaultProps.formData, photos: [{ url: 'existing.jpg', caption: 'Initial Caption' }] } });
    const captionInput = screen.getByLabelText(/photo caption/i);
    fireEvent.change(captionInput, { target: { value: 'Updated Caption' } });
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ photos: [{ url: 'existing.jpg', caption: 'Updated Caption' }] });
  });

  test('displays error messages when errors prop is provided', () => {
    const errors = {
      venueName: 'Venue name is required!',
      websiteUrl: 'Invalid website URL.',
      // ... add other field errors as needed
    };
    renderComponent({ errors });

    expect(screen.getByLabelText(/venue name/i)).toHaveAccessibleDescription('Venue name is required!');
    expect(screen.getByLabelText(/venue name/i).getAttribute('aria-invalid')).toBe('true');

    expect(screen.getByLabelText(/website url/i)).toHaveAccessibleDescription('Invalid website URL.');
    expect(screen.getByLabelText(/website url/i).getAttribute('aria-invalid')).toBe('true');
  });

  test('disables all inputs when disabled prop is true', () => {
    renderComponent({ disabled: true });

    expect(screen.getByLabelText(/venue name/i)).toBeDisabled();
    expect(screen.getByLabelText(/website url/i)).toBeDisabled();
    expect(screen.getByTestId('mock-tinymce-editor')).toBeDisabled();
    expect(screen.getByTestId('mock-upload-btn')).toBeDisabled();
    // If a photo exists, remove button and caption should also be disabled
    // Test this by providing a photo in formData
  });

  test('disables remove photo button and caption field if disabled prop is true and photo exists', () => {
    renderComponent({
      formData: { ...defaultProps.formData, photos: [{ url: 'photo.jpg', caption: 'A Photo' }] },
      disabled: true
    });
    expect(screen.getByTestId('mock-remove-btn')).toBeDisabled();
    expect(screen.getByLabelText(/photo caption/i)).toBeDisabled();
  });

}); 