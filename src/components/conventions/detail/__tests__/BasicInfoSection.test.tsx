import React from 'react';
import { render, screen } from '@testing-library/react';
import BasicInfoSection from '../BasicInfoSection';
import { mockConvention } from './__mocks__/mockConvention';

describe('BasicInfoSection', () => {
    it('renders convention name', () => {
        render(<BasicInfoSection convention={mockConvention} />);
        expect(screen.getByRole('heading', { name: /TestCon/i })).toBeInTheDocument();
    });
}); 