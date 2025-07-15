'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import CreatableSelect from 'react-select/creatable';

interface Tag {
    id: string;
    name: string;
}

interface TagOption {
    value: string;
    label: string;
    __isNew__?: boolean;
}

interface TagEditorProps {
    value: Tag[];
    onChange: (tags: Tag[]) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ value, onChange }) => {
    const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await fetch('/api/tags');
                if (!response.ok) throw new Error('Failed to fetch tags');
                const data: Tag[] = await response.json();
                const options = data.map(tag => ({ value: tag.id, label: tag.name }));
                setAvailableTags(options);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTags();
    }, []);

    const handleChange = (selectedOptions: readonly TagOption[] | null) => {
        const newTags = selectedOptions
            ? selectedOptions.map(option => ({
                id: option.__isNew__ ? '' : option.value,
                name: option.label,
            }))
            : [];
        onChange(newTags);
    };

    const selectedValue = value ? value.map(tag => ({
        value: tag.id || tag.name,
        label: tag.name,
    })) : [];

    return (
        <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
                Tags
            </Typography>
            <CreatableSelect
                isMulti
                options={availableTags}
                value={selectedValue}
                onChange={handleChange}
                isLoading={isLoading}
                placeholder="Select tags or type to create new ones..."
                styles={{
                    control: (base) => ({ ...base, backgroundColor: '#1e1e1e', borderColor: 'rgba(255, 255, 255, 0.23)' }),
                    menu: (base) => ({ ...base, backgroundColor: '#2d2d2d' }),
                    option: (base, { isFocused, isSelected }) => ({ ...base, backgroundColor: isSelected ? '#555' : isFocused ? '#444' : '#2d2d2d', color: '#fff' }),
                    multiValue: (base) => ({ ...base, backgroundColor: '#555' }),
                    multiValueLabel: (base) => ({ ...base, color: '#fff' }),
                    input: (base) => ({ ...base, color: '#fff' }),
                }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Add relevant tags to improve discoverability. You can select from the list or type a new tag and press Enter.
            </Typography>
        </Box>
    );
};

export default TagEditor; 