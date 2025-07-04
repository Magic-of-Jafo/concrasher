'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedDealerLink } from './DealerListItem';

type DealerEditModalProps = {
    dealerLink: EnhancedDealerLink;
    isOpen: boolean;
    onClose: () => void;
    onSave: (dealerLinkId: string, overrides: { displayNameOverride?: string; descriptionOverride?: string; }) => void;
};

const DealerEditModal = ({ dealerLink, isOpen, onClose, onSave }: DealerEditModalProps) => {
    const [displayName, setDisplayName] = useState(dealerLink.displayNameOverride || '');
    const [description, setDescription] = useState(dealerLink.descriptionOverride || '');

    useEffect(() => {
        setDisplayName(dealerLink.displayNameOverride || '');
        setDescription(dealerLink.descriptionOverride || '');
    }, [dealerLink]);

    if (!isOpen) {
        return null;
    }

    const handleSave = () => {
        onSave(dealerLink.id, {
            displayNameOverride: displayName,
            descriptionOverride: description,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Edit Dealer Overrides</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Display Name Override</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        placeholder={dealerLink.profile?.name || 'Original Name'}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank to use original name: {dealerLink.profile?.name}</p>
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700">Description Override</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        placeholder="Enter an optional description for this convention..."
                    />
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DealerEditModal; 