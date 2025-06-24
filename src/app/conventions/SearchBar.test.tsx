import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from './SearchBar';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('SearchBar', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it('renders with default placeholder', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search conventions...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchBar placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('updates URL when search value changes', async () => {
    render(<SearchBar />);
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'test search' } });
    
    // Wait for debounce
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('query=test+search')
      );
    });
  });

  it('clears search value when clear button is clicked', () => {
    render(<SearchBar />);
    const input = screen.getByRole('textbox');
    
    // Set initial value
    fireEvent.change(input, { target: { value: 'test search' } });
    expect(input).toHaveValue('test search');
    
    // Click clear button
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    expect(input).toHaveValue('');
  });

  it('initializes with search param value', () => {
    const searchParams = new URLSearchParams();
    searchParams.set('query', 'initial search');
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);
    
    render(<SearchBar />);
    expect(screen.getByRole('textbox')).toHaveValue('initial search');
  });

  it('resets to page 1 when search changes', async () => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', '2');
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);
    
    render(<SearchBar />);
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'new search' } });
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
    });
  });
}); 