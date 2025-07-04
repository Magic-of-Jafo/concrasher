import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DealersTab from './DealersTab';
import { getDealerLinks, addDealerLink, removeDealerLink, updateDealerLink } from '@/lib/actions';
import { ProfileType } from '@prisma/client';

// Mock the actions
jest.mock('@/lib/actions', () => ({
    getDealerLinks: jest.fn(),
    addDealerLink: jest.fn(),
    removeDealerLink: jest.fn(),
    updateDealerLink: jest.fn(),
}));

// Mock DealerSearch component
jest.mock('./DealerSearch', () => {
    return function MockDealerSearch({ onProfileSelect }: { onProfileSelect: (profileId: string, profileType: ProfileType) => void }) {
        return (
            <div data-testid="dealer-search">
                <button
                    onClick={() => onProfileSelect('brand-1', ProfileType.BRAND)}
                >
                    Select Test Brand
                </button>
                <button
                    onClick={() => onProfileSelect('brand-2', ProfileType.BRAND)}
                >
                    Select Another Brand
                </button>
            </div>
        );
    };
});

// Mock DealerListItem component
jest.mock('./DealerListItem', () => {
    return function MockDealerListItem({ dealerLink, onEdit, onRemove }: any) {
        return (
            <div data-testid={`dealer-item-${dealerLink.id}`}>
                <span>{dealerLink.linkedProfile.name}</span>
                <button onClick={() => onEdit(dealerLink)}>Customize</button>
                <button onClick={() => onRemove(dealerLink.id)}>Remove</button>
            </div>
        );
    };
});

// Mock DealerEditModal component
jest.mock('./DealerEditModal', () => {
    return function MockDealerEditModal({ isOpen, dealerLink, onClose, onSave }: any) {
        if (!isOpen) return null;

        return (
            <div data-testid="dealer-edit-modal">
                <h2>Customize Dealer</h2>
                <input
                    data-testid="display-name-input"
                    defaultValue={dealerLink?.displayNameOverride || dealerLink?.linkedProfile?.name || ''}
                />
                <textarea
                    data-testid="description-input"
                    defaultValue={dealerLink?.descriptionOverride || dealerLink?.linkedProfile?.description || ''}
                />
                <button onClick={() => {
                    const displayNameInput = document.querySelector('[data-testid="display-name-input"]') as HTMLInputElement;
                    const descriptionInput = document.querySelector('[data-testid="description-input"]') as HTMLTextAreaElement;
                    onSave(dealerLink.id, {
                        displayNameOverride: displayNameInput?.value || '',
                        descriptionOverride: descriptionInput?.value || ''
                    });
                }}>Save</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        );
    };
});

const mockDealerLinks = [
    {
        id: 'dealer-1',
        conventionId: 'conv-1',
        linkedProfileId: 'brand-1',
        profileType: ProfileType.BRAND,
        displayNameOverride: null,
        descriptionOverride: null,
        linkedProfile: {
            id: 'brand-1',
            name: 'Existing Brand',
            description: 'Existing brand description',
            profileType: ProfileType.BRAND
        }
    },
    {
        id: 'dealer-2',
        conventionId: 'conv-1',
        linkedProfileId: 'brand-2',
        profileType: ProfileType.BRAND,
        displayNameOverride: 'Custom Brand Name',
        descriptionOverride: 'Custom brand description',
        linkedProfile: {
            id: 'brand-2',
            name: 'Another Brand',
            description: 'Another brand description',
            profileType: ProfileType.BRAND
        }
    }
];

describe('DealersTab', () => {
    const user = userEvent.setup();
    const mockGetDealerLinks = getDealerLinks as jest.Mock;
    const mockAddDealerLink = addDealerLink as jest.Mock;
    const mockRemoveDealerLink = removeDealerLink as jest.Mock;
    const mockUpdateDealerLink = updateDealerLink as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDealerLinks.mockResolvedValue({ success: true, data: mockDealerLinks });
        mockAddDealerLink.mockResolvedValue({ success: true });
        mockRemoveDealerLink.mockResolvedValue({ success: true });
        mockUpdateDealerLink.mockResolvedValue({ success: true });
    });

    it('renders loading state initially', () => {
        mockGetDealerLinks.mockImplementation(() => new Promise(() => { })); // Never resolves
        render(<DealersTab conventionId="conv-1" />);

        expect(screen.getByText('Loading dealers...')).toBeInTheDocument();
    });

    it('loads and displays existing dealers', async () => {
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(mockGetDealerLinks).toHaveBeenCalledWith('conv-1');
        });

        await waitFor(() => {
            expect(screen.getByTestId('dealer-search')).toBeInTheDocument();
            expect(screen.getByTestId('dealer-item-dealer-1')).toBeInTheDocument();
            expect(screen.getByTestId('dealer-item-dealer-2')).toBeInTheDocument();
            expect(screen.getByText('Existing Brand')).toBeInTheDocument();
            expect(screen.getByText('Another Brand')).toBeInTheDocument();
        });
    });

    it('displays empty state when no dealers are linked', async () => {
        mockGetDealerLinks.mockResolvedValue({ success: true, data: [] });
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByText('No dealers have been linked yet.')).toBeInTheDocument();
        });
    });

    it('displays error state when loading fails', async () => {
        mockGetDealerLinks.mockResolvedValue({ success: false, error: 'Failed to load' });
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByText('Error: Failed to load')).toBeInTheDocument();
        });
    });

    it('links a new dealer when selected from search', async () => {
        mockGetDealerLinks.mockResolvedValue({ success: true, data: [] });
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-search')).toBeInTheDocument();
        });

        const selectButton = screen.getByText('Select Test Brand');
        await user.click(selectButton);

        await waitFor(() => {
            expect(mockAddDealerLink).toHaveBeenCalledWith('conv-1', 'brand-1', 'BRAND');
        });
    });

    it('removes a dealer when remove button is clicked', async () => {
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-item-dealer-1')).toBeInTheDocument();
        });

        const removeButton = screen.getAllByText('Remove')[0];
        await user.click(removeButton);

        await waitFor(() => {
            expect(mockRemoveDealerLink).toHaveBeenCalledWith('dealer-1');
        });
    });

    it('opens edit modal when customize button is clicked', async () => {
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-item-dealer-1')).toBeInTheDocument();
        });

        const customizeButton = screen.getAllByText('Customize')[0];
        await user.click(customizeButton);

        expect(screen.getByTestId('dealer-edit-modal')).toBeInTheDocument();
        expect(screen.getByText('Customize Dealer')).toBeInTheDocument();
    });

    it('saves dealer customization when modal is submitted', async () => {
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-item-dealer-1')).toBeInTheDocument();
        });

        // Open edit modal
        const customizeButton = screen.getAllByText('Customize')[0];
        await user.click(customizeButton);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-edit-modal')).toBeInTheDocument();
        });

        // Modify the inputs
        const displayNameInput = screen.getByTestId('display-name-input');
        const descriptionInput = screen.getByTestId('description-input');

        await user.clear(displayNameInput);
        await user.type(displayNameInput, 'Custom Display Name');

        await user.clear(descriptionInput);
        await user.type(descriptionInput, 'Custom description text');

        // Save changes
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);

        await waitFor(() => {
            expect(mockUpdateDealerLink).toHaveBeenCalledWith('dealer-1', {
                displayNameOverride: 'Custom Display Name',
                descriptionOverride: 'Custom description text'
            });
        });
    });

    it('closes edit modal when cancel is clicked', async () => {
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-item-dealer-1')).toBeInTheDocument();
        });

        // Open edit modal
        const customizeButton = screen.getAllByText('Customize')[0];
        await user.click(customizeButton);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-edit-modal')).toBeInTheDocument();
        });

        // Cancel the modal
        const cancelButton = screen.getByText('Cancel');
        await user.click(cancelButton);

        await waitFor(() => {
            expect(screen.queryByTestId('dealer-edit-modal')).not.toBeInTheDocument();
        });
    });

    it('handles dealer linking errors gracefully', async () => {
        mockGetDealerLinks.mockResolvedValue({ success: true, data: [] });
        mockAddDealerLink.mockResolvedValue({ success: false, error: 'Network error' });

        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-search')).toBeInTheDocument();
        });

        const selectButton = screen.getByText('Select Test Brand');
        await user.click(selectButton);

        await waitFor(() => {
            expect(mockAddDealerLink).toHaveBeenCalled();
        });

        // Component should handle the error gracefully
        await waitFor(() => {
            expect(screen.getByText('Error: Network error')).toBeInTheDocument();
        });
    });

    it('silently ignores duplicate dealer linking attempts', async () => {
        mockGetDealerLinks.mockResolvedValue({ success: true, data: [] });
        mockAddDealerLink.mockResolvedValue({
            success: false,
            error: 'Profile is already linked as a dealer to this convention'
        });

        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('dealer-search')).toBeInTheDocument();
        });

        const selectButton = screen.getByText('Select Test Brand');
        await user.click(selectButton);

        await waitFor(() => {
            expect(mockAddDealerLink).toHaveBeenCalled();
        });

        // Should not show error for duplicates
        expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });

    it('refreshes dealer list after successful operations', async () => {
        render(<DealersTab conventionId="conv-1" />);

        await waitFor(() => {
            expect(mockGetDealerLinks).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByTestId('dealer-item-dealer-1')).toBeInTheDocument();
        });

        // Perform an operation that should refresh the list
        const removeButton = screen.getAllByText('Remove')[0];
        await user.click(removeButton);

        await waitFor(() => {
            expect(mockRemoveDealerLink).toHaveBeenCalledWith('dealer-1');
        });

        // Should call getDealerLinks again to refresh the list
        await waitFor(() => {
            expect(mockGetDealerLinks).toHaveBeenCalledTimes(2);
        });
    });
}); 