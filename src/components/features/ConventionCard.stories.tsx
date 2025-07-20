import type { Meta, StoryObj } from '@storybook/react';
import ConventionCard from './ConventionCard';

// Mock data to make the component display correctly
const mockConvention = {
    name: 'Awesome Magic Con 2025',
    startDate: '2025-10-26T00:00:00.000Z',
    endDate: '2025-10-28T00:00:00.000Z',
    city: 'Las Vegas',
    stateAbbreviation: 'NV',
    country: 'USA',
    profileImageUrl: 'https://convention-crasher.s3.us-east-1.amazonaws.com/uploads/cmash9op50045eirgd2pmfjpk/profile/profile-image.png',
};

// This tells Storybook about your component
const meta: Meta<typeof ConventionCard> = {
    title: 'Components/ConventionCard',
    component: ConventionCard,
};

export default meta;
type Story = StoryObj<typeof ConventionCard>;

// This creates a specific version of your component to display
export const Default: Story = {
    args: {
        convention: mockConvention,
    },
    // ✅ ADD THIS BLOCK
    parameters: {
        design: {
            type: "figspec",
            url: "https://www.figma.com/design/FNnhlfscaElQqW2wMYFug7/Untitled?node-id=6-3&t=NE9VvTuZEojmAw4F-4",
        },
    },
};