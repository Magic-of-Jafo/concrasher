import { render, screen, fireEvent } from '@testing-library/react';
import ConventionGrid from './ConventionGrid';
import { Convention, ConventionStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

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
      galleryImageUrls: [],
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
      galleryImageUrls: [],
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
    render(
      <ConventionGrid
        conventions={[]}
        totalPages={1}
        currentPage={1}
        loading={true}
        onPageChange={() => {}}
      />
    );
    
    // Check for loading skeletons. MUI Skeletons don't have an explicit role="img".
    // They are often spans or divs. We can look for a number of them.
    // The component renders 3 skeletons based on the new implementation.
    const skeletons = screen.getAllByLabelText('loading'); // MUI Skeleton has aria-label="loading" by default
    expect(skeletons.length).toBeGreaterThanOrEqual(3); // Check for at least 3 skeletons
  });

  it('renders empty state', () => {
    render(
      <ConventionGrid
        conventions={[]}
        totalPages={1}
        currentPage={1}
        loading={false}
        onPageChange={() => {}}
      />
    );
    
    expect(screen.getByText('No conventions found')).toBeInTheDocument(); // Adjusted text
  });

  it('renders convention cards', () => {
    render(
      <ConventionGrid
        conventions={mockConventions}
        totalPages={1}
        currentPage={1}
        loading={false}
        onPageChange={() => {}}
      />
    );
    
    expect(screen.getByText('Test Convention 1')).toBeInTheDocument();
    expect(screen.getByText('Test Convention 2')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument(); // Adjusted text
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument(); // Adjusted text
  });

  it('navigates to convention detail page when card is clicked', () => {
    render(
      <ConventionGrid
        conventions={mockConventions}
        totalPages={1}
        currentPage={1}
        loading={false}
        onPageChange={() => {}}
      />
    );
    
    fireEvent.click(screen.getByText('Test Convention 1'));
    expect(mockRouter.push).toHaveBeenCalledWith('/conventions/test-convention-1');
  });

  it('does not render pagination elements itself', () => {
    render(
      <ConventionGrid
        conventions={mockConventions}
        totalPages={1} // or 3, doesn't matter for this component
        currentPage={1}
        loading={false}
        onPageChange={() => {}}
      />
    );
    // ConventionGrid itself should not render a <nav> or MUI Pagination specific roles
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
}); 