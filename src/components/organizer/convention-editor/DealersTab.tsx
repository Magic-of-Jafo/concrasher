'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProfileType } from '@prisma/client';
import { getDealerLinks, addDealerLink, removeDealerLink, updateDealerLink } from '@/lib/actions';
import DealerSearch from './DealerSearch';
import DealerListItem, { EnhancedDealerLink } from './DealerListItem';
import DealerEditModal from './DealerEditModal';

type DealersTabProps = {
    conventionId: string;
};

const DealersTab = ({ conventionId }: DealersTabProps) => {
    const [dealerLinks, setDealerLinks] = useState<EnhancedDealerLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDealer, setEditingDealer] = useState<EnhancedDealerLink | null>(null);

    const loadDealerLinks = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getDealerLinks(conventionId);
            if (result.success) {
                setDealerLinks(result.data);
            } else {
                setError(result.error ?? 'Failed to load dealers.');
            }
        } catch (e) {
            setError('An unexpected error occurred while loading dealers.');
        } finally {
            setIsLoading(false);
        }
    }, [conventionId]);

    useEffect(() => {
        loadDealerLinks();
    }, [loadDealerLinks]);

    const handleProfileSelect = async (profileId: string, profileType: ProfileType) => {
        const result = await addDealerLink(conventionId, profileId, profileType as 'USER' | 'BRAND');
        if (result.success) {
            loadDealerLinks(); // Refresh the list
        } else {
            setError(result.error ?? 'Failed to add dealer.');
            // Optionally, clear the error after a few seconds
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleRemove = async (dealerLinkId: string) => {
        const result = await removeDealerLink(dealerLinkId);
        if (result.success) {
            loadDealerLinks(); // Refresh the list
        } else {
            setError(result.error ?? 'Failed to remove dealer.');
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleEdit = (dealerLink: EnhancedDealerLink) => {
        setEditingDealer(dealerLink);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDealer(null);
    };

    const handleSaveChanges = async (dealerLinkId: string, overrides: { displayNameOverride?: string; descriptionOverride?: string; }) => {
        const result = await updateDealerLink(dealerLinkId, overrides);
        if (result.success) {
            loadDealerLinks();
            handleCloseModal();
        } else {
            setError(result.error ?? 'Failed to update dealer.');
            // Keep modal open to show error, or handle error inside modal
        }
    };

    if (isLoading) {
        return <div>Loading dealers...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div>
            <DealerSearch onProfileSelect={handleProfileSelect} />
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Linked Dealers</h3>
                {dealerLinks.length === 0 ? (
                    <p>No dealers have been linked yet.</p>
                ) : (
                    <div>
                        {dealerLinks.map((link) => (
                            <DealerListItem
                                key={link.id}
                                dealerLink={link}
                                onRemove={handleRemove}
                                onEdit={handleEdit}
                            />
                        ))}
                    </div>
                )}
            </div>
            {editingDealer && (
                <DealerEditModal
                    isOpen={isModalOpen}
                    dealerLink={editingDealer}
                    onClose={handleCloseModal}
                    onSave={handleSaveChanges}
                />
            )}
        </div>
    );
};

export default DealersTab; 