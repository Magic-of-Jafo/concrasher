import { render, screen, waitFor } from '@testing-library/react';
import Page from '../page';
import { getConventionById } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  getConventionById: jest.fn()
}));

describe('Convention Detail Page', () => {
  const mockConvention = {
    id: '1',
    name: 'Test Convention',
    description: 'Test Description',
    startDate: new Date('2024-01-01').toISOString(),
    endDate: new Date('2024-01-03').toISOString(),
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    venueName: 'Test Venue',
    status: 'ACTIVE',
    bannerImageUrl: 'https://example.com/banner.jpg',
    websiteUrl: 'https://example.com',
    galleryImageUrls: [
      'https://example.com/gallery1.jpg',
      'https://example.com/gallery2.jpg'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders convention details when data is loaded', async () => {
    (getConventionById as jest.Mock).mockResolvedValue(mockConvention);

    render(<Page params={{ id: '1' }} />);

    // Initially shows loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Convention')).toBeInTheDocument();
    });

    // Verify all convention details are displayed
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText(/Test Venue/)).toBeInTheDocument();
    expect(screen.getByText(/Test City/)).toBeInTheDocument();
    expect(screen.getByText(/Test State/)).toBeInTheDocument();
    expect(screen.getByText(/Test Country/)).toBeInTheDocument();
  });

  it('handles 404 error when convention is not found', async () => {
    (getConventionById as jest.Mock).mockRejectedValue(new Error('Convention not found'));

    render(<Page params={{ id: '999' }} />);

    // Initially shows loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Convention Not Found')).toBeInTheDocument();
    });
  });

  it('handles general error when API call fails', async () => {
    (getConventionById as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Page params={{ id: '1' }} />);

    // Initially shows loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });
  });
}); 