import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic'; // Force dynamic rendering

// Smart filter function to handle array searches and variations
function smartFilterTimezones(timezones: any[], search: string) {
    const searchTerm = search.toLowerCase().trim();

    // Create variations of the search term for IANA ID matching
    const searchVariations = [
        searchTerm,
        searchTerm.replace(/\s+/g, '_'), // "new york" → "new_york"
        searchTerm.replace(/_/g, ' '),   // "new_york" → "new york"
        searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1), // Capitalize first letter
        searchTerm.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('_'), // "new york" → "New_York"
        searchTerm.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('_'), // "new_york" → "New_York"
    ];

    return timezones.filter(timezone => {
        // Check if any of the standard fields match
        const standardMatch = [
            timezone.value,
            timezone.text,
            timezone.ianaId,
            timezone.abbr
        ].some(field => field && field.toLowerCase().includes(searchTerm));

        if (standardMatch) return true;

        // Check if any utcAlias contains any of our search variations
        const aliasMatch = timezone.utcAliases && timezone.utcAliases.some((alias: string) => {
            const aliasLower = alias.toLowerCase();
            return searchVariations.some(variation =>
                aliasLower.includes(variation.toLowerCase()) ||
                aliasLower.includes(`/${variation.toLowerCase()}`) ||
                aliasLower.endsWith(variation.toLowerCase())
            );
        });

        return aliasMatch;
    });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        // For search, we'll get all timezones and filter them intelligently
        // This ensures we don't miss matches in the utcAliases array
        const whereClause = search ? {} : {}; // Get all for now, we'll filter in JS

        // Fetch timezones from the database
        let timezones = await db.timezone.findMany({
            where: whereClause,
            select: {
                id: true,
                ianaId: true,
                value: true,
                abbr: true,
                offset: true,
                isdst: true,
                text: true,
                utcAliases: true
            },
            orderBy: [
                { value: 'asc' }, // Sort by display name first
                { text: 'asc' }   // Then by description
            ]
        });

        // Apply smart filtering if we have a search term
        if (search) {
            timezones = smartFilterTimezones(timezones, search);
            // Limit results for performance (show top 50 matches)
            timezones = timezones.slice(0, 50);
        }

        // Transform the data for the frontend
        const formattedTimezones = timezones.map(timezone => ({
            id: timezone.id,
            ianaId: timezone.ianaId,
            value: timezone.value,
            abbr: timezone.abbr,
            offset: timezone.offset,
            isdst: timezone.isdst,
            text: timezone.text,
            utcAliases: timezone.utcAliases,
            // Create a display label for the selector
            displayLabel: formatTimezoneLabel(timezone)
        }));

        return NextResponse.json({
            success: true,
            timezones: formattedTimezones,
            total: formattedTimezones.length
        });

    } catch (error) {
        console.error('Error fetching timezones:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch timezones'
            },
            { status: 500 }
        );
    }
}

// Helper function to format timezone labels according to the architecture brief
function formatTimezoneLabel(timezone: any): string {
    // Extract city/region from the text field
    // Example: "(UTC-07:00) Mountain Time (US & Canada)" -> "Mountain Time (US & Canada) (UTC-07:00)"
    // Example: "(UTC+10:00) Sydney" -> "Sydney (UTC+10:00)"

    if (!timezone.text) {
        return timezone.value || timezone.ianaId;
    }

    // Extract the UTC offset and description
    const utcOffsetMatch = timezone.text.match(/\(UTC([+-]\d{2}:\d{2})\)/);
    const utcOffset = utcOffsetMatch ? utcOffsetMatch[1] : '';

    // Extract the description part (everything after the UTC offset)
    const description = timezone.text.replace(/^\(UTC[+-]\d{2}:\d{2}\)\s*/, '');

    // Format: "Description (UTC±XX:XX)" with abbreviation if available
    let label = description;
    if (utcOffset) {
        label += ` (UTC${utcOffset})`;
    }

    // Add abbreviation if available and different from description
    if (timezone.abbr && !label.includes(timezone.abbr)) {
        label += ` - ${timezone.abbr}`;
    }

    return label;
} 