import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import ScheduleTimelineView from './ScheduleTimelineView';

describe('ScheduleTimelineView', () => {
    it('displays a message when there are no schedule items', () => {
        render(<ScheduleTimelineView scheduleItems={[]} />);
        expect(screen.getByText('No events scheduled yet.')).toBeInTheDocument();
    });

    it('renders a list of schedule items', () => {
        const mockItems = [
            { id: 1, title: 'Opening Ceremony' },
            { id: 2, title: 'Developer Q&A' },
        ];
        render(<ScheduleTimelineView scheduleItems={mockItems} />);

        expect(screen.getByText('Opening Ceremony')).toBeInTheDocument();
        expect(screen.getByText('Developer Q&A')).toBeInTheDocument();
    });

    it('calls onEdit and onDelete when buttons are clicked', () => {
        const mockItems = [{ id: 1, title: 'Test Event' }];
        const onEdit = jest.fn();
        const onDelete = jest.fn();
        render(<ScheduleTimelineView scheduleItems={mockItems} onEdit={onEdit} onDelete={onDelete} />);

        // Find buttons within the context of the event
        const eventRow = screen.getByText('Test Event').closest('div');
        const editButton = screen.getByLabelText('Edit');
        const deleteButton = screen.getByLabelText('Delete');

        fireEvent.click(editButton);
        expect(onEdit).toHaveBeenCalledWith(mockItems[0]);
        expect(onEdit).toHaveBeenCalledTimes(1);

        fireEvent.click(deleteButton);
        expect(onDelete).toHaveBeenCalledWith(mockItems[0]);
        expect(onDelete).toHaveBeenCalledTimes(1);
    });
}); 