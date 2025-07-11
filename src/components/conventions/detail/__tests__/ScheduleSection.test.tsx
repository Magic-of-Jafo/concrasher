import React from 'react';
import { render, screen } from '@testing-library/react';
import ScheduleSection from '../ScheduleSection';
import { mockConvention } from './__mocks__/mockConvention';

describe('ScheduleSection', () => {
    it('renders heading', () => {
        render(<ScheduleSection convention={{ ...mockConvention, startDate: '2025-01-01T00:00:00Z', endDate: '2025-01-03T00:00:00Z', scheduleDays: [] }} />);
        expect(screen.getByRole('heading', { name: /Schedule/i })).toBeInTheDocument();
    });
}); 