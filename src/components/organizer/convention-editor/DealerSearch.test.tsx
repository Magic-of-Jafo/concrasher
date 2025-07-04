import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DealerSearch from './DealerSearch';
import { searchBrands } from '@/lib/actions';
import { ProfileType } from '@prisma/client';

// Mock the search action
jest.mock('@/lib/actions', () => ({
    searchBrands: jest.fn(),
}));

// Mock the debounce hook
jest.mock('@/hooks/useDebounce', () => ({
    useDebounce: jest.fn((value) => value), // Return value immediately for testing
}));

const mockBrands = [
    {
        id: 'brand-1',
        name: 'Test Brand',
        profileType: 'BRAND' as const,
    },
    {
        id: 'brand-2',
        name: 'Another Brand',
        profileType: 'BRAND' as const,
    },
];

describe('DealerSearch', () => {
    const user = userEvent.setup();
    const mockSearchBrands = searchBrands as jest.Mock;
    const mockOnProfileSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchBrands.mockResolvedValue(mockBrands);
    });

    it('renders search input with placeholder text', () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        expect(screen.getByPlaceholderText('Type at least 3 characters to search for brands...')).toBeInTheDocument();
    });

    it('shows no results initially', () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        expect(screen.queryByText('Test Brand')).not.toBeInTheDocument();
    });

    it('searches for brands when typing 3 or more characters', async () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');

        // Type less than 3 characters - should not search
        await user.type(searchInput, 'te');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));
        expect(mockSearchBrands).not.toHaveBeenCalled();

        // Type 3 characters - should search
        await user.type(searchInput, 's');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(mockSearchBrands).toHaveBeenCalledWith('tes');
        });
    });

    it('displays search results in dropdown', async () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'test');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
            expect(screen.getByText('Another Brand')).toBeInTheDocument();
        });
    });

    it('shows loading spinner while searching', async () => {
        mockSearchBrands.mockImplementation(() => new Promise(() => { })); // Never resolves

        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'test');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(document.querySelector('.animate-spin')).toBeInTheDocument(); // Look for spinner by class
        });
    });

    it('shows "No brands found" when search returns empty results', async () => {
        mockSearchBrands.mockResolvedValue([]);

        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'nonexistent');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(screen.getByText(/No brands found matching.*nonexistent/)).toBeInTheDocument();
        });
    });

    it('handles search errors gracefully', async () => {
        mockSearchBrands.mockRejectedValue(new Error('Search failed'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'test');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    it('calls onProfileSelect when a brand is clicked', async () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'test');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Test Brand'));

        expect(mockOnProfileSelect).toHaveBeenCalledWith('brand-1', ProfileType.BRAND);
    });

    it('clears search input after selecting a brand', async () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'test');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Test Brand'));

        expect(searchInput).toHaveValue('');
    });

    it('does not search when typing less than 3 characters', async () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');

        await user.type(searchInput, 'a');
        await user.type(searchInput, 'b');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        expect(mockSearchBrands).not.toHaveBeenCalled();
        expect(screen.queryByText('Test Brand')).not.toBeInTheDocument();
    });

    it('shows dropdown when focusing input with existing results', async () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'test');

        // Wait for debounce and results to appear
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
        });

        // Blur to hide results
        await user.tab();

        // Wait for blur timeout
        await new Promise(resolve => setTimeout(resolve, 250));

        // Focus again - should show results
        await user.click(searchInput);

        expect(screen.getByText('Test Brand')).toBeInTheDocument();
    });

    it('displays brand names correctly', async () => {
        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'test');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
            expect(screen.getByText('Another Brand')).toBeInTheDocument();
        });
    });

    it('handles brands with null names', async () => {
        mockSearchBrands.mockResolvedValue([
            {
                id: 'brand-null',
                name: null,
                profileType: 'BRAND' as const,
            }
        ]);

        render(<DealerSearch onProfileSelect={mockOnProfileSelect} />);

        const searchInput = screen.getByPlaceholderText('Type at least 3 characters to search for brands...');
        await user.type(searchInput, 'test');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));

        await waitFor(() => {
            expect(screen.getByText('Unnamed Brand')).toBeInTheDocument();
        });
    });
}); 