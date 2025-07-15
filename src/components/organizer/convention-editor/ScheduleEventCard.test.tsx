import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import ScheduleEventCard from './ScheduleEventCard';

describe('ScheduleEventCard', () => {
    const mockEvent = {
        title: 'Test Panel',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
    };

    it('renders event details correctly', () => {
        const onEdit = jest.fn();
        const onDelete = jest.fn();
        render(<ScheduleEventCard event={mockEvent} onEdit={onEdit} onDelete={onDelete} />);

        // Check for the event title
        expect(screen.getByText('Test Panel')).toBeTruthy();

        // Check for the time display
        expect(screen.getByText('10:00 AM - 11:00 AM')).toBeTruthy();
    });

    it('calls onEdit and onDelete when buttons are clicked', () => {
        const onEdit = jest.fn();
        const onDelete = jest.fn();
        render(<ScheduleEventCard event={mockEvent} onEdit={onEdit} onDelete={onDelete} />);

        fireEvent.click(screen.getByRole('button', { name: /edit/i }));
        expect(onEdit).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        expect(onDelete).toHaveBeenCalledTimes(1);
    });
}); 