import React from 'react';
import { render, screen } from '@testing-library/react';
import DealersSection from '../DealersSection';

const mockConventionNoDealers = { dealerLinks: [] };

const mockConventionWithDealers: any = {
    dealerLinks: [
        {
            id: '1',
            profileType: 'BRAND' as 'BRAND',
            name: 'Acme Co',
            profileImageUrl: null,
            profileLink: '/brands/1',
        },
    ],
};

describe('DealersSection', () => {
    it('renders empty state when no dealers', () => {
        render(<DealersSection convention={mockConventionNoDealers} />);
        expect(screen.getByText(/Dealers/i)).toBeInTheDocument();
        expect(screen.getByText(/has not been announced/i)).toBeInTheDocument();
    });

    it('renders dealer cards when dealers exist', () => {
        render(<DealersSection convention={mockConventionWithDealers} />);
        expect(screen.getByText('Acme Co')).toBeInTheDocument();
    });
}); 