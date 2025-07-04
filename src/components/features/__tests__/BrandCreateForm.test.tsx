import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BrandCreateForm from '../BrandCreateForm';
import { createBrand, updateBrand } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

// Mock the server actions
jest.mock('@/lib/actions', () => ({
    createBrand: jest.fn(),
    updateBrand: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

const mockCreateBrand = createBrand as jest.Mock;
const mockUpdateBrand = updateBrand as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

const createSchema = z.object({
    name: z.string().min(3, { message: 'String must contain at least 3 character(s)' }),
    websiteUrl: z.string().optional(),
    logoUrl: z.string().optional(),
    description: z.string().optional(),
});

const updateSchema = createSchema.extend({
    id: z.string(),
});

describe('BrandCreateForm', () => {
    let mockRouterPush: jest.Mock;

    beforeEach(() => {
        mockRouterPush = jest.fn();
        mockUseRouter.mockReturnValue({ push: mockRouterPush });
        mockCreateBrand.mockClear();
        mockUpdateBrand.mockClear();
    });

    describe('Create Mode', () => {
        it('renders the form with name and description fields', () => {
            render(<BrandCreateForm createSchema={createSchema} />);
            expect(screen.getByLabelText(/Brand Name/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Brand Description/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Create Brand/i })).toBeInTheDocument();
        });

        it('shows validation errors for invalid input', async () => {
            render(<BrandCreateForm createSchema={createSchema} />);
            fireEvent.click(screen.getByRole('button', { name: /Create Brand/i }));

            expect(await screen.findByText(/String must contain at least 3 character/i)).toBeInTheDocument();
            expect(mockCreateBrand).not.toHaveBeenCalled();
        });

        it('calls the createBrand server action and redirects on success', async () => {
            mockCreateBrand.mockResolvedValue({ success: true });
            render(<BrandCreateForm createSchema={createSchema} />);

            fireEvent.change(screen.getByLabelText(/Brand Name/i), { target: { value: 'My Awesome Brand' } });
            fireEvent.click(screen.getByRole('button', { name: /Create Brand/i }));

            await waitFor(() => {
                expect(mockCreateBrand).toHaveBeenCalledWith({
                    name: 'My Awesome Brand',
                    description: '',
                    logoUrl: '',
                    websiteUrl: '',
                });
            });

            await waitFor(() => {
                expect(mockRouterPush).toHaveBeenCalledWith('/profile');
            });
        });

        it('displays a server error message on failure', async () => {
            mockCreateBrand.mockResolvedValue({ success: false, error: 'Brand name already exists' });
            render(<BrandCreateForm createSchema={createSchema} />);

            fireEvent.change(screen.getByLabelText(/Brand Name/i), { target: { value: 'My Awesome Brand' } });
            fireEvent.click(screen.getByRole('button', { name: /Create Brand/i }));

            expect(await screen.findByText('Brand name already exists')).toBeInTheDocument();
            expect(mockRouterPush).not.toHaveBeenCalled();
        });
    });

    describe('Edit Mode', () => {
        const initialData = {
            id: 'brand-123',
            name: 'Existing Brand',
            description: 'An existing description.',
            logoUrl: null,
            websiteUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ownerId: 'user-123',
        };

        it('renders the form with pre-populated data and "Save Changes" button', () => {
            render(<BrandCreateForm initialData={initialData} updateSchema={updateSchema} />);
            expect(screen.getByLabelText(/Brand Name/i)).toHaveValue(initialData.name);
            expect(screen.getByLabelText(/Brand Description/i)).toHaveValue(initialData.description);
            expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
        });

        it('calls the updateBrand server action on submit', async () => {
            mockUpdateBrand.mockResolvedValue({ success: true });
            render(<BrandCreateForm initialData={initialData} updateSchema={updateSchema} />);

            fireEvent.change(screen.getByLabelText(/Brand Name/i), { target: { value: 'Updated Brand Name' } });
            fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

            await waitFor(() => {
                expect(mockUpdateBrand).toHaveBeenCalledWith({
                    id: 'brand-123',
                    name: 'Updated Brand Name',
                    description: 'An existing description.',
                    logoUrl: '',
                    websiteUrl: '',
                });
            });

            await waitFor(() => {
                expect(mockRouterPush).toHaveBeenCalledWith('/profile');
            });
        });

        it('displays a server error message on update failure', async () => {
            mockUpdateBrand.mockResolvedValue({ success: false, error: 'Update failed' });
            render(<BrandCreateForm initialData={initialData} updateSchema={updateSchema} />);

            fireEvent.change(screen.getByLabelText(/Brand Name/i), { target: { value: 'Updated Brand Name' } });
            fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

            expect(await screen.findByText('Update failed')).toBeInTheDocument();
            expect(mockRouterPush).not.toHaveBeenCalled();
        });
    });
});
