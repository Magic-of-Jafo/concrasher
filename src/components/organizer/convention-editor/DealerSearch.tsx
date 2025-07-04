'use client';

import React, { useState } from 'react';
import { ProfileType } from '@prisma/client';
import { searchProfiles } from '@/lib/actions';

type DealerSearchProps = {
    onProfileSelect: (profileId: string, profileType: ProfileType) => void;
};

const DealerSearch = ({ onProfileSelect }: DealerSearchProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [profileType, setProfileType] = useState<ProfileType>(ProfileType.USER);
    const [searchResults, setSearchResults] = useState<{ id: string; name: string | null }[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const results = await searchProfiles(searchQuery, profileType as 'USER' | 'BRAND');
        setSearchResults(results);
        setIsSearching(false);
    };

    const handleSelect = (profileId: string, profileType: ProfileType) => {
        onProfileSelect(profileId, profileType);
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className="p-4 border rounded-md">
            <h3 className="font-semibold mb-2">Link New Dealer</h3>
            <div className="flex gap-2 mb-2">
                <select
                    value={profileType}
                    onChange={(e) => setProfileType(e.target.value as ProfileType)}
                    className="p-2 border rounded"
                >
                    <option value={ProfileType.USER}>User</option>
                    <option value={ProfileType.BRAND}>Brand</option>
                    <option value={ProfileType.TALENT} disabled>
                        Talent (Coming Soon)
                    </option>
                </select>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="flex-grow p-2 border rounded"
                />
                <button onClick={handleSearch} disabled={isSearching} className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400">
                    {isSearching ? 'Searching...' : 'Search'}
                </button>
            </div>
            <div>
                {searchResults.map((result) => (
                    <div
                        key={result.id}
                        className="p-2 border-b hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSelect(result.id, profileType)}
                    >
                        {result.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DealerSearch; 