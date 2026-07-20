import { Convention } from '@prisma/client';
import { ConventionSearchParams } from '../search';

/** A browse row: the Convention plus, in nearest mode, its distance from the
 *  viewer's home base (null when the convention has no coordinates). */
export type BrowseConvention = Convention & { distanceKm?: number | null };

interface PaginatedResponse {
    items: BrowseConvention[];
    total: number;
    page: number;
    totalPages: number;
    /** What the server actually sorted by, and why nearest fell back if it did. */
    sortApplied?: 'soonest' | 'nearest';
    reason?: 'signed-out' | 'no-home-base';
    unit?: 'mi' | 'km';
}

export async function getConventions(params: ConventionSearchParams): Promise<PaginatedResponse> {
    const searchParams = new URLSearchParams();

    if (params.sort) searchParams.set('sort', params.sort);
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

    // Use a relative path for the API call. This works universally for both
    // client-side and server-side rendering, as the browser or server
    // will resolve it against the current host.
    const response = await fetch(`/api/conventions?${searchParams.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch conventions');
    }

    return response.json();
} 