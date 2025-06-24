import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HotelForm from './HotelForm'; // Adjusted import
import { type HotelData } from '@/lib/validators';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

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
      <button onClick={() => onUploadComplete('new-hotel-image.jpg')} data-testid="mock-upload-btn" disabled={disabled}>
        Upload
      </button>
      <button onClick={() => onRemoveImage && onRemoveImage()} data-testid="mock-remove-btn" disabled={disabled || !currentImageUrl}>
        Remove
      </button>
    </div>
  ));
});

// Mock DatePicker
jest.mock('@mui/x-date-pickers/DatePicker', () => ({
    DatePicker: jest.fn(({ label, value, onChange, disabled, slotProps }) => (
      <input
        data-testid={`mock-datepicker-${label?.toString().toLowerCase().replace(/\s+/g, '-') || 'date'}`}
        type="date"
        value={value ? new Date(value).toISOString().split('T')[0] : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
        disabled={disabled}
        data-helpertext={slotProps?.textField?.helperText}
        aria-invalid={slotProps?.textField?.error}
        aria-describedby={slotProps?.textField?.helperText ? `${label}-helper-text` : undefined}
      />
    )),
  }));

const mockOnFormDataChange = jest.fn();

const defaultHotelFormData: HotelData = {
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
  amenities: [],
  photos: [],
  groupRateOrBookingCode: '',
  groupPrice: '',
  bookingLink: '',
  bookingCutoffDate: null,
  isPrimaryHotel: false,
  isAtPrimaryVenueLocation: false,
  markedForPrimaryPromotion: false,
  // tempId is optional
};

const defaultProps = {
  formData: defaultHotelFormData,
  onFormDataChange: mockOnFormDataChange,
  disabled: false,
  errors: {},
  title: 'Test Hotel Form',
  isPrimaryHotel: false,
};

const renderComponent = (props?: Partial<typeof defaultProps>) => {
  // Ensure formData is always fully provided even if overridden partially
  const finalProps = { 
    ...defaultProps, 
    ...props, 
    formData: { ...defaultHotelFormData, ...props?.formData } 
  };
  return render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <HotelForm {...finalProps} />
    </LocalizationProvider>
  );
};

describe('HotelForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all basic fields and sections', () => {
    renderComponent();
    expect(screen.getByText('Test Hotel Form')).toBeInTheDocument();

    expect(screen.getByLabelText(/hotel name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-tinymce-editor')).toBeInTheDocument(); // Description
    expect(screen.getByLabelText(/google maps url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/group rate \/ booking code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price per night/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/booking link/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-datepicker-booking-cut-off-date')).toBeInTheDocument();
    expect(screen.getByTestId('mock-image-upload-input')).toBeInTheDocument();
    expect(screen.getByLabelText(/hotel amenities/i)).toBeInTheDocument();
  });

  test('pre-populates with initial formData', () => {
    const initialFormData: HotelData = {
      ...defaultHotelFormData,
      hotelName: 'Grand Hotel',
      websiteUrl: 'http://grandhotel.com',
      description: '<p>A grand place to stay.</p>',
      photos: [{ url: 'hotel-room.jpg', caption: 'Deluxe Room' }],
      groupRateOrBookingCode: 'GROUP123',
      groupPrice: '150.00',
      bookingLink: 'http://grandhotel.com/book?code=GROUP123',
      bookingCutoffDate: new Date(2024, 11, 31), // Dec 31, 2024
    };
    renderComponent({ formData: initialFormData });

    expect(screen.getByLabelText(/hotel name/i)).toHaveValue('Grand Hotel');
    expect(screen.getByLabelText(/website url/i)).toHaveValue('http://grandhotel.com');
    expect(screen.getByTestId('mock-tinymce-editor')).toHaveValue('<p>A grand place to stay.</p>');
    expect(screen.getByTestId('mock-image-upload-input').querySelector('img')).toHaveAttribute('src', 'hotel-room.jpg');
    expect(screen.getByLabelText(/photo caption/i)).toHaveValue('Deluxe Room');
    expect(screen.getByLabelText(/group rate \/ booking code/i)).toHaveValue('GROUP123');
    expect(screen.getByLabelText(/price per night/i)).toHaveValue('150.00');
    expect(screen.getByLabelText(/booking link/i)).toHaveValue('http://grandhotel.com/book?code=GROUP123');
    expect(screen.getByTestId('mock-datepicker-booking-cut-off-date')).toHaveValue('2024-12-31');
  });

  test('calls onFormDataChange for text input (hotelName)', () => {
    renderComponent();
    const input = screen.getByLabelText(/hotel name/i);
    fireEvent.change(input, { target: { value: 'New Hotel Name' } });
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ hotelName: 'New Hotel Name' });
  });

  test('calls onFormDataChange for bookingCutoffDate via DatePicker mock', () => {
    renderComponent();
    const dateInput = screen.getByTestId('mock-datepicker-booking-cut-off-date');
    fireEvent.change(dateInput, { target: { value: '2025-01-15' } }); // YYYY-MM-DD format
    // The mock DatePicker converts this string to a Date object
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ bookingCutoffDate: new Date(2025, 0, 15) }); // Month is 0-indexed
  });

  test('calls onFormDataChange for image upload', () => {
    renderComponent({ formData: { ...defaultHotelFormData, photos: [] } });
    fireEvent.click(screen.getByTestId('mock-upload-btn'));
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ photos: [{ url: 'new-hotel-image.jpg', caption: '' }] });
  });

  test('calls onFormDataChange for image removal', () => {
    renderComponent({ formData: { ...defaultHotelFormData, photos: [{ url: 'existing.jpg', caption: '' }] } });
    fireEvent.click(screen.getByTestId('mock-remove-btn'));
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ photos: [] });
  });
  
  test('displays error messages', () => {
    const errors = {
      hotelName: 'Hotel name is required.',
      bookingCutoffDate: 'Date is invalid.'
    };
    renderComponent({ errors });
    expect(screen.getByLabelText(/hotel name/i)).toHaveAccessibleDescription('Hotel name is required.');
    const datePicker = screen.getByTestId('mock-datepicker-booking-cut-off-date');
    expect(datePicker).toHaveAttribute('data-helpertext', 'Date is invalid.');
    expect(datePicker).toHaveAttribute('aria-invalid', 'true');
  });

  test('disables inputs when disabled prop is true', () => {
    renderComponent({ disabled: true, formData: { ...defaultHotelFormData, photos: [{url: 'test.jpg', caption: ''}] } });
    expect(screen.getByLabelText(/hotel name/i)).toBeDisabled();
    expect(screen.getByTestId('mock-tinymce-editor')).toBeDisabled();
    expect(screen.getByTestId('mock-datepicker-booking-cut-off-date')).toBeDisabled();
    expect(screen.getByTestId('mock-upload-btn')).toBeDisabled();
    expect(screen.getByTestId('mock-remove-btn')).toBeDisabled();
    expect(screen.getByLabelText(/photo caption/i)).toBeDisabled();
  });

}); 