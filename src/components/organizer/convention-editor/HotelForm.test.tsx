// src/components/organizer/convention-editor/HotelForm.test.tsx

// This test file should NOT contain any polyfills or global console.error suppressions.
// Those are handled exclusively in jest.polyfills.js.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Use userEvent for realistic interactions
import '@testing-library/jest-dom'; // For extended Jest DOM matchers
import HotelForm from './HotelForm';
import { type HotelData, createDefaultHotel } from '@/lib/validators'; // Ensure HotelData and createDefaultHotel are correctly typed/structured
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// --- Mocks for external components (ensure these are accurate to your component's dependencies) ---

// Mock the TinyMCE Editor component
jest.mock('@tinymce/tinymce-react', () => ({
  Editor: jest.fn((props) => (
    <textarea
      data-testid="mock-tinymce-editor"
      value={props.initialValue || props.value}
      onChange={(e) => {
        if (props.onEditorChange) {
          // Simulate TinyMCE's onEditorChange which passes content as first arg
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

// Mock DatePicker (MUI X Date Pickers)
jest.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: jest.fn((props) => ( // Use props directly here, not destructuring many individual props
    <input
      data-testid={`mock-datepicker-${props.label?.toString().toLowerCase().replace(/\s+/g, '-') || 'date'}`}
      type="date"
      // Convert Date object to YYYY-MM-DD string for input value
      value={props.value ? new Date(props.value).toISOString().split('T')[0] : ''}
      onChange={(e) => {
        // Simulate onChange providing a Date object or null
        props.onChange(e.target.value ? new Date(e.target.value) : null);
      }}
      disabled={props.disabled}
      data-helpertext={props.slotProps?.textField?.helperText} // Helper text in data-attribute
      aria-invalid={props.slotProps?.textField?.error ? 'true' : 'false'} // Set aria-invalid based on error prop
      aria-describedby={props.slotProps?.textField?.helperText ? `${props.label}-helper-text` : undefined}
    />
  )),
}));

// --- Test Setup ---

const mockOnFormDataChange = jest.fn();

const defaultProps = {
  formData: createDefaultHotel(), // Ensure createDefaultHotel provides all necessary properties (like amenities)
  onFormDataChange: mockOnFormDataChange,
  disabled: false,
  errors: {},
  title: 'Test Hotel Form',
  isPrimaryHotel: false,
};

const renderComponent = (props?: Partial<typeof defaultProps>) => {
  // Ensure formData is deeply merged for test specific overrides and defaults are always applied
  const finalProps = {
    ...defaultProps,
    ...props,
    formData: { ...createDefaultHotel(), ...props?.formData },
  };
  return render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <HotelForm {...finalProps} />
    </LocalizationProvider>
  );
};

describe('HotelForm', () => {
  // Declare userEvent instance to be used across tests
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks(); // Clears mock call history before each test
    user = userEvent.setup(); // Initializes a fresh userEvent instance for each test
  });

  // --- Test Cases ---

  test('renders all basic fields', () => {
    renderComponent();
    expect(screen.getByLabelText(/hotel name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-tinymce-editor')).toBeInTheDocument();
    expect(screen.getByLabelText(/google maps url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-image-upload-input')).toBeInTheDocument();
    // Add assertions for new fields like amenities text area, parking info etc.
    expect(screen.getByLabelText(/Hotel Amenities \(one per line\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Parking Information/i)).toBeInTheDocument();
  });

  test('pre-populates with initial formData', () => {
    const initialData: HotelData = {
      ...createDefaultHotel(true), // Ensure amenities and other new fields are defaulted correctly here
      hotelName: 'Grand Hotel',
      websiteUrl: 'http://grandhotel.com',
      photos: [{ url: 'http://grandhotel.com/photo.jpg', caption: 'Grand view' }],
      amenities: ['Pool', 'Gym'], // Example of pre-populating amenities
      parkingInfo: 'Valet parking available',
    };
    renderComponent({ formData: initialData });

    expect(screen.getByLabelText(/hotel name/i)).toHaveValue('Grand Hotel');
    expect(screen.getByLabelText(/website url/i)).toHaveValue('http://grandhotel.com');
    const imagePreview = screen.getByRole('img', { name: /preview/i });
    expect(imagePreview).toHaveAttribute('src', 'http://grandhotel.com/photo.jpg');
    expect(screen.getByLabelText(/Hotel Amenities \(one per line\)/i)).toHaveValue('Pool\nGym');
    expect(screen.getByLabelText(/Parking Information/i)).toHaveValue('Valet parking available');
  });

  test('calls onFormDataChange when a text field is changed', async () => {
    let formData = createDefaultHotel();
    const user = userEvent.setup();

    // Define a stable handler function that can be referenced by name.
    const handleStateChange = (data: Partial<HotelData>) => {
      formData = { ...formData, ...data }; // Update local state variable
      mockOnFormDataChange(data); // Call mock for tracking
      rerender(
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <HotelForm formData={formData} onFormDataChange={handleStateChange} />
        </LocalizationProvider>
      );
    };

    const { rerender } = render(
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <HotelForm
          formData={formData}
          onFormDataChange={handleStateChange}
        />
      </LocalizationProvider>
    );

    const hotelNameInput = screen.getByLabelText(/hotel name/i);

    await user.type(hotelNameInput, 'New Hotel Name');

    // Check that the input now contains the accumulated string
    expect(hotelNameInput).toHaveValue('New Hotel Name');

    // Last call to the mock should be with the full string
    expect(mockOnFormDataChange).toHaveBeenLastCalledWith({ hotelName: 'New Hotel Name' });
  });

  test('calls onFormDataChange when description is changed', async () => {
    renderComponent();
    const editor = screen.getByTestId('mock-tinymce-editor'); // This is your mocked textarea for TinyMCE

    // user.type is appropriate for textareas as well
    await user.type(editor, 'New description for the hotel.');

    // Again, expect the last call to contain the full string after typing
    expect(mockOnFormDataChange).toHaveBeenLastCalledWith({ description: 'New description for the hotel.' });
  });

  test('calls onFormDataChange for image upload', async () => {
    renderComponent();
    const uploadButton = screen.getByTestId('mock-upload-btn');
    await user.click(uploadButton); // Simulate user clicking the upload button

    // Expect the onFormDataChange to be called with the new photo URL
    expect(mockOnFormDataChange).toHaveBeenCalledWith({
      photos: [{ url: 'new-hotel-image.jpg', caption: '' }],
    });
  });

  test('calls onFormDataChange for image removal', async () => {
    renderComponent({
      formData: {
        ...createDefaultHotel(),
        photos: [{ url: 'existing.jpg', caption: 'Old photo' }] // Provide an existing photo to remove
      }
    });
    const removeButton = screen.getByTestId('mock-remove-btn');
    await user.click(removeButton); // Simulate user clicking the remove button

    // Expect the onFormDataChange to be called with an empty photos array
    expect(mockOnFormDataChange).toHaveBeenCalledWith({ photos: [] });
  });

  test('disables all fields when disabled prop is true', () => {
    renderComponent({ disabled: true });
    expect(screen.getByLabelText(/hotel name/i)).toBeDisabled();
    expect(screen.getByTestId('mock-tinymce-editor')).toBeDisabled();
    expect(screen.getByTestId('mock-upload-btn')).toBeDisabled();
    expect(screen.getByLabelText(/website url/i)).toBeDisabled();
    expect(screen.getByLabelText(/google maps url/i)).toBeDisabled();
    expect(screen.getByLabelText(/Parking Information/i)).toBeDisabled(); // Also check a multiline text field
    expect(screen.getByTestId('mock-datepicker-booking-cut-off-date')).toBeDisabled(); // Check DatePicker
  });

  test('displays validation errors', () => {
    const errors = {
      hotelName: 'Hotel name is required',
      websiteUrl: 'Invalid URL format',
      bookingCutoffDate: 'Invalid date',
      groupPrice: 'Price must be a number',
      parkingInfo: 'Parking info too long',
    };
    renderComponent({ errors });

    // Assertions for Material-UI TextField Helper Texts (which render as <p> tags with text content)
    expect(screen.getByText('Hotel name is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/Hotel Name/i)).toHaveAttribute('aria-invalid', 'true');

    expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
    expect(screen.getByLabelText(/Website URL/i)).toHaveAttribute('aria-invalid', 'true');

    expect(screen.getByText('Price must be a number')).toBeInTheDocument();
    expect(screen.getByLabelText(/Group Price/i)).toHaveAttribute('aria-invalid', 'true');

    // Parking Information (Confirmed to be direct text in <p> helperText)
    expect(screen.getByText('Parking info too long')).toBeInTheDocument(); // Expect this to pass now
    expect(screen.getByLabelText(/Parking Information/i)).toHaveAttribute('aria-invalid', 'true');

    // DatePicker Helper Text (mocked to be in a data-attribute)
    const bookingCutoffDateInput = screen.getByTestId('mock-datepicker-booking-cut-off-date');
    expect(bookingCutoffDateInput).toHaveAttribute('data-helpertext', 'Invalid date');
    expect(bookingCutoffDateInput).toHaveAttribute('aria-invalid', 'true');
  });
});