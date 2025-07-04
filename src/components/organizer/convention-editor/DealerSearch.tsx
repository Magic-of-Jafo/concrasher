'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProfileType } from '@prisma/client';
import { searchBrands } from '@/lib/actions';

type DealerSearchProps = {
    onProfileSelect: (profileId: string, profileType: ProfileType) => void;
};

type SearchResult = {
    id: string;
    name: string | null;
    profileType: 'BRAND';
};

const DealerSearch = ({ onProfileSelect }: DealerSearchProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Debounced search function
    const debouncedSearch = useCallback(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.trim().length >= 3) {
                setIsSearching(true);
                try {
                    const results = await searchBrands(searchQuery.trim());
                    setSearchResults(results);
                    setShowResults(true);
                } catch (error) {
                    console.error('Search error:', error);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Trigger search when query changes
    useEffect(() => {
        const cleanup = debouncedSearch();
        return cleanup;
    }, [debouncedSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (value.length < 3) {
            setShowResults(false);
            setSearchResults([]);
        }
    };

    const handleSelect = (result: SearchResult) => {
        onProfileSelect(result.id, result.profileType as ProfileType);
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

    const handleInputFocus = () => {
        if (searchResults.length > 0) {
            setShowResults(true);
        }
    };

    const handleInputBlur = () => {
        // Delay hiding results to allow clicking on them
        setTimeout(() => setShowResults(false), 200);
    };

    return (
        <div className="p-4 border rounded-md">
            <h3 className="font-semibold mb-2">Link New Dealer</h3>
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Type at least 3 characters to search for brands..."
                    className="w-full p-3 border rounded-md focus:border-blue-500 focus:outline-none"
                />

                {isSearching && (
                    <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                )}

                {showResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg z-10">
                        {searchResults.map((result) => (
                            <div
                                key={result.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => handleSelect(result)}
                            >
                                <span className="font-medium text-gray-900">
                                    {result.name || 'Unnamed Brand'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {showResults && searchResults.length === 0 && searchQuery.length >= 3 && !isSearching && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 p-3 text-gray-500 text-center shadow-lg z-10">
                        No brands found matching &quot;{searchQuery}&quot;
                    </div>
                )}
            </div>

            <div className="mt-2 text-sm text-gray-600">
                <p>
                    <span className="font-medium">🏪 Note:</span> Search for existing brands to link as dealers.
                    <span className="text-gray-500 ml-2">
                        Individual users and talent profiles can be linked elsewhere.
                    </span>
                </p>
            </div>
        </div>
    );
};

export default DealerSearch; 