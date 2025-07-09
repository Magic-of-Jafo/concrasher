import { Convention } from '@prisma/client';
import { ConventionSearchParams } from '../search';

interface PaginatedResponse {
    items: Convention[];
    total: number;
    page: number;
    totalPages: number;
}

export async function getConventions(params: ConventionSearchParams): Promise<PaginatedResponse> {
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.set('query', params.query);
    if (params.city) searchParams.set('city', params.city);
    if (params.state) searchParams.set('state', params.state);
    if (params.country) searchParams.set('country', params.country);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status && params.status.length > 0) {
        searchParams.set('status', params.status[0]);
    }

    // Use absolute URL for server component
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/conventions?${searchParams.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch conventions');
    }

    return response.json();
} 