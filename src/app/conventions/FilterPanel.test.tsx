import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConventionType, ConventionStatus } from '@prisma/client';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock MUI components
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    useTheme: () => ({
      breakpoints: {
        down: () => false,
      },
    }),
    useMediaQuery: () => false,
  };
});

describe('FilterPanel', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it('renders filter panel with all filter options', () => {
    render(<FilterPanel />);
    
    // Check for all filter inputs
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
    expect(screen.getByLabelText('State/Province')).toBeInTheDocument();
    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('Convention Types')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Min Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Price')).toBeInTheDocument();
  });

  it('initializes with search param values', () => {
    const searchParams = new URLSearchParams();
    searchParams.set('country', 'USA');
    searchParams.set('state', 'CA');
    searchParams.set('city', 'San Francisco');
    searchParams.set('types', 'GAMING,ANIME');
    searchParams.set('status', 'UPCOMING,ACTIVE');
    searchParams.set('minPrice', '10');
    searchParams.set('maxPrice', '100');
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);
    
    render(<FilterPanel />);
    
    expect(screen.getByLabelText('Country')).toHaveValue('USA');
    expect(screen.getByLabelText('State/Province')).toHaveValue('CA');
    expect(screen.getByLabelText('City')).toHaveValue('San Francisco');
    expect(screen.getByLabelText('Min Price')).toHaveValue('10');
    expect(screen.getByLabelText('Max Price')).toHaveValue('100');
  });

  it('updates URL when filters are applied', async () => {
    render(<FilterPanel />);
    
    // Set filter values
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'USA' } });
    fireEvent.change(screen.getByLabelText('State/Province'), { target: { value: 'CA' } });
    
    // Click apply button
    fireEvent.click(screen.getByText('Apply Filters'));
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('country=USA')
      );
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('state=CA')
      );
    });
  });

  it('clears all filters when clear button is clicked', async () => {
    const searchParams = new URLSearchParams();
    searchParams.set('country', 'USA');
    searchParams.set('state', 'CA');
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);
    
    render(<FilterPanel />);
    
    // Click clear button
    fireEvent.click(screen.getByText('Clear Filters'));
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.not.stringContaining('country=USA')
      );
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.not.stringContaining('state=CA')
      );
    });
  });

  it('resets to page 1 when filters are applied', async () => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', '2');
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);
    
    render(<FilterPanel />);
    
    // Set a filter and apply
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'USA' } });
    fireEvent.click(screen.getByText('Apply Filters'));
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
    });
  });
}); 