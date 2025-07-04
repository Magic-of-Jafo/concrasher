import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BasicInfoTab } from './BasicInfoTab';
import { type BasicInfoFormData } from '@/lib/validators';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Mock the TinyMCE Editor component
jest.mock('@tinymce/tinymce-react', () => ({
  Editor: jest.fn((props) => (
    <textarea
      data-testid="mock-tinymce-editor"
      value={props.value}
      onChange={(e) => props.onEditorChange(e.target.value, {} as any)}
    />
  )),
}));

// Mock FuzzyStateInput
jest.mock('@/components/ui/FuzzyStateInput', () => ({
  FuzzyStateInput: jest.fn(({ value, onChange, error, helperText, required, sx }) => (
    <input
      data-testid="mock-fuzzy-state-input"
      value={value}
      onChange={(e) => onChange(e.target.value, e.target.value.toUpperCase().substring(0, 2))} // Mock abbreviation
      data-error={error}
      data-helpertext={helperText}
      data-required={required}
    />
  ))
}));


const mockOnFormChange = jest.fn();

const defaultProps = {
  onFormChange: mockOnFormChange,
  value: {
    name: '',
    slug: '',
    startDate: null,
    endDate: null,
    isOneDayEvent: false,
    isTBD: false,
  },
  errors: {},
  isEditing: false,
};

const renderWithProviders = (ui: React.ReactElement, props?: Partial<typeof defaultProps>) => {
  return render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <BasicInfoTab {...defaultProps} {...props} />
    </LocalizationProvider>
  );
};

describe('BasicInfoTab', () => {
  it('renders without crashing', () => {
    renderWithProviders(<BasicInfoTab {...defaultProps} />);
    expect(screen.getByLabelText(/Convention Name/i)).toBeInTheDocument();
  });
}); 