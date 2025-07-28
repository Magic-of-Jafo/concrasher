'use client';

import React from 'react';
import { Menu, MenuItem, Button } from '@mui/material';
import Link from 'next/link';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

interface HeaderMyStuffMenuProps {
    anchorEl: HTMLElement | null;
    onClose: () => void;
    onOpen: (event: React.MouseEvent<HTMLElement>) => void;
    session: any;
    hasActiveTalentProfile: boolean;
}

export default function HeaderMyStuffMenu({
    anchorEl,
    onClose,
    onOpen,
    session,
    hasActiveTalentProfile,
}: HeaderMyStuffMenuProps) {
    return (
        <>
            <Button
                color="inherit"
                onClick={onOpen}
                endIcon={<ArrowDropDownIcon />}
            >
                My Stuff
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={onClose}
            >
                <MenuItem component={Link} href={`/u/${session?.user?.id}`} onClick={onClose}>
                    My User Profile
                </MenuItem>
                {hasActiveTalentProfile && (
                    <MenuItem component={Link} href={`/t/${session?.user?.talentProfile?.id}`} onClick={onClose}>
                        My Talent Profile
                    </MenuItem>
                )}
            </Menu>
        </>
    );
} 