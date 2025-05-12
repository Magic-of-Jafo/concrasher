import { render, screen, fireEvent } from '@testing-library/react';
import { ConventionGrid } from './ConventionGrid';
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
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      venueName: 'Test Venue',
      description: 'Test description',
      websiteUrl: 'https://test.com',
      organizerUserId: 'user1',
      conventionSeriesId: null,
      status: ConventionStatus.UPCOMING,
      type: 'GAMING',
      bannerImageUrl: null,
      galleryImageUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Test Convention 2',
      slug: 'test-convention-2',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-03'),
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      venueName: 'Test Venue 2',
      description: 'Test description 2',
      websiteUrl: 'https://test2.com',
      organizerUserId: 'user2',
      conventionSeriesId: null,
      status: ConventionStatus.ACTIVE,
      type: 'ANIME',
      bannerImageUrl: null,
      galleryImageUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
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
        isLoading={true}
        onPageChange={() => {}}
      />
    );
    
    // Check for loading skeletons
    const skeletons = screen.getAllByRole('img', { hidden: true });
    expect(skeletons).toHaveLength(6); // 6 skeleton cards
  });

  it('renders empty state', () => {
    render(
      <ConventionGrid
        conventions={[]}
        totalPages={1}
        currentPage={1}
        isLoading={false}
        onPageChange={() => {}}
      />
    );
    
    expect(screen.getByText('No conventions found matching your criteria')).toBeInTheDocument();
  });

  it('renders convention cards', () => {
    render(
      <ConventionGrid
        conventions={mockConventions}
        totalPages={1}
        currentPage={1}
        isLoading={false}
        onPageChange={() => {}}
      />
    );
    
    expect(screen.getByText('Test Convention 1')).toBeInTheDocument();
    expect(screen.getByText('Test Convention 2')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA, USA')).toBeInTheDocument();
    expect(screen.getByText('Los Angeles, CA, USA')).toBeInTheDocument();
  });

  it('navigates to convention detail page when card is clicked', () => {
    render(
      <ConventionGrid
        conventions={mockConventions}
        totalPages={1}
        currentPage={1}
        isLoading={false}
        onPageChange={() => {}}
      />
    );
    
    fireEvent.click(screen.getByText('Test Convention 1'));
    expect(mockRouter.push).toHaveBeenCalledWith('/conventions/test-convention-1');
  });

  it('renders pagination when total pages > 1', () => {
    render(
      <ConventionGrid
        conventions={mockConventions}
        totalPages={3}
        currentPage={1}
        isLoading={false}
        onPageChange={() => {}}
      />
    );
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('does not render pagination when total pages = 1', () => {
    render(
      <ConventionGrid
        conventions={mockConventions}
        totalPages={1}
        currentPage={1}
        isLoading={false}
        onPageChange={() => {}}
      />
    );
    
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('calls onPageChange when page is changed', () => {
    const handlePageChange = jest.fn();
    render(
      <ConventionGrid
        conventions={mockConventions}
        totalPages={3}
        currentPage={1}
        isLoading={false}
        onPageChange={handlePageChange}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });
}); 