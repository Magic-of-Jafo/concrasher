import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ConventionGrid from './ConventionGrid';
import { Convention, ConventionStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Create a theme for Material-UI
const theme = createTheme();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('ConventionGrid', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockConventions: Convention[] = [
    {
      id: '1',
      name: 'Test Convention 1',
      slug: 'test-convention-1',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-03'),
      isOneDayEvent: false,
      isTBD: false,
      city: 'San Francisco',
      stateAbbreviation: 'CA',
      stateName: 'California',
      country: 'USA',
      venueName: 'Test Venue',
      descriptionMain: 'Test description',
      descriptionShort: null,
      websiteUrl: 'https://test.com',
      seriesId: null,
      status: ConventionStatus.PUBLISHED,
      coverImageUrl: null,
      profileImageUrl: null,
      guestsStayAtPrimaryVenue: false,
      timezone: 'America/Los_Angeles',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: '2',
      name: 'Test Convention 2',
      slug: 'test-convention-2',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-03'),
      isOneDayEvent: false,
      isTBD: false,
      city: 'Los Angeles',
      stateAbbreviation: 'CA',
      stateName: 'California',
      country: 'USA',
      venueName: 'Test Venue 2',
      descriptionMain: 'Test description 2',
      descriptionShort: null,
      websiteUrl: 'https://test2.com',
      seriesId: null,
      status: ConventionStatus.PUBLISHED,
      coverImageUrl: null,
      profileImageUrl: null,
      guestsStayAtPrimaryVenue: false,
      timezone: 'America/Los_Angeles',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders loading state', () => {
    renderWithProviders(<ConventionGrid conventions={[]} loading={true} />);
    // Material-UI Skeleton components render as spans with specific styling
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state', () => {
    renderWithProviders(<ConventionGrid conventions={[]} loading={false} />);
    expect(screen.getByText('No conventions found')).toBeInTheDocument();
  });

  it('renders convention cards', () => {
    renderWithProviders(<ConventionGrid conventions={mockConventions} loading={false} />);
    expect(screen.getByText('Test Convention 1')).toBeInTheDocument();
    expect(screen.getByText('Test Convention 2')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument();
  });

  it('navigates to convention detail page when card is clicked', () => {
    renderWithProviders(<ConventionGrid conventions={mockConventions} loading={false} />);
    fireEvent.click(screen.getByText('Test Convention 1'));
    expect(mockRouter.push).toHaveBeenCalledWith('/conventions/test-convention-1');
  });

  it('does not render pagination elements itself', () => {
    renderWithProviders(<ConventionGrid conventions={mockConventions} loading={false} />);
    // ConventionGrid itself should not render a <nav> or MUI Pagination specific roles
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
}); 