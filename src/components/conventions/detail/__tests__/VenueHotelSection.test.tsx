import React from 'react';
import { render, screen } from '@testing-library/react';
import VenueHotelSection from '../VenueHotelSection';
import { mockConvention } from './__mocks__/mockConvention';

describe('VenueHotelSection', () => {
    it('renders heading', () => {
        render(<VenueHotelSection convention={mockConvention} />);
        expect(screen.getByRole('heading', { name: /Venue & Hotel Information/i })).toBeInTheDocument();
    });
}); 