'use client';

import React from 'react';
import { ConventionDealerLink, ProfileType } from '@prisma/client';

export type EnhancedDealerLink = ConventionDealerLink & {
    profile?: { name: string | null } | null;
};

// We'll need to fetch the actual profile name, so let's prepare for that
type DealerListItemProps = {
    dealerLink: EnhancedDealerLink;
    onRemove: (dealerLinkId: string) => void;
    onEdit: (dealerLink: EnhancedDealerLink) => void;
};

const DealerListItem = ({ dealerLink, onRemove, onEdit }: DealerListItemProps) => {
    const originalName = dealerLink.profile?.name ?? 'Loading...';
    const displayName = dealerLink.displayNameOverride || originalName;

    return (
        <div className="flex items-center justify-between p-2 border-b">
            <div>
                <p className="font-semibold">{displayName}</p>
                {dealerLink.displayNameOverride && (
                    <p className="text-sm text-gray-500">Original: {originalName}</p>
                )}
                <p className="text-sm text-gray-600">{dealerLink.descriptionOverride}</p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onEdit(dealerLink)}
                    className="text-sm text-blue-500 hover:underline"
                >
                    Edit
                </button>
                <button
                    onClick={() => onRemove(dealerLink.id)}
                    className="text-sm text-red-500 hover:underline"
                >
                    Remove
                </button>
            </div>
        </div>
    );
};

export default DealerListItem; 