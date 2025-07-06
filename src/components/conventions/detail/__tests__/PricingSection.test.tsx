import React from 'react';
import { render, screen } from '@testing-library/react';
import PricingSection from '../PricingSection';
import { mockConvention } from './__mocks__/mockConvention';

describe('PricingSection', () => {
    it('renders heading', () => {
        render(<PricingSection convention={mockConvention} />);
        expect(screen.getByRole('heading', { name: /Pricing/i })).toBeInTheDocument();
    });
}); 