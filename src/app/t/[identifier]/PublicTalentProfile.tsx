'use client';

import React from 'react';
import { Box, Avatar, Typography, Button, Chip, Container, IconButton, Link } from '@mui/material';
import {
    Work as BookIcon,
    Email as EmailIcon,
    PersonAdd as FollowIcon,
    Share as ShareIcon,
    Edit as EditIcon,
    AccountCircle,
    PlayCircle as VideoIcon,
    CalendarToday as CalendarIcon,
    LocationOn as LocationIcon,
    Language as WebsiteIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { Role, ConventionStatus } from '@prisma/client';
import { getS3ImageUrl } from '@/lib/defaults';
import { formatRoleLabel } from '@/lib/user-utils';
import { DISPLAY, BODY } from '@/lib/fonts';

/**
 * Public talent page — the performer's sales page (2026-07 redesign).
 *
 * LinkedIn-shaped: one identity card up top, then a single scroll of section
 * cards (desktop: 2fr main + 1fr rail; mobile: one column). Structurally the
 * OPPOSITE of the member page (a flat, card-less document): a browser knows
 * which page type they're on from the architecture alone. Gold is the talent
 * room; media leads because it sells.
 */

interface TalentProfileData {
    id: string;
    userId: string | null;
    displayName: string;
    tagline: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    websiteUrl: string | null;
    contactEmail: string | null;
    skills: string[];
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        roles: Role[];
        createdAt: Date;
    } | null;
    media: Array<{
        id: string;
        url: string;
        type: 'IMAGE' | 'VIDEO_LINK';
        caption: string | null;
        order: number | null;
    }>;
    conventions: Array<{
        id: string;
        convention: {
            id: string;
            name: string;
            startDate: Date | null;
            endDate: Date | null;
            city: string | null;
            country: string | null;
            status: ConventionStatus;
        };
    }>;
}

interface PublicTalentProfileProps {
    talentProfile: TalentProfileData;
    currentUserId?: string | null;
}

const cardSx = {
    backgroundColor: 'var(--cc-panel)',
    border: '1px solid var(--cc-panel-border)',
    borderRadius: '12px',
    p: { xs: 2, sm: 3 },
} as const;

const cardTitleSx = {
    fontFamily: DISPLAY,
    fontWeight: 800,
    fontSize: '1.05rem',
    color: 'var(--cc-ink)',
    mb: 2,
} as const;

const roleChipSx = {
    borderRadius: '8px',
    height: 'auto',
    py: 0.3,
    backgroundColor: 'var(--cc-bg)',
    border: '1px solid var(--cc-panel-border)',
    color: 'var(--cc-muted)',
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: '0.66rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    '& .MuiChip-label': { px: 1.1 },
};

function formatDateRange(startDate: Date | null, endDate: Date | null): string {
    if (!startDate) return 'TBD';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const full: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
    if (!end || start.toDateString() === end.toDateString()) return start.toLocaleDateString('en-US', full);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', full)}`;
}

function formatLocation(city: string | null, country: string | null): string {
    if (!city && !country) return 'Location TBD';
    return [city, country].filter(Boolean).join(', ');
}

function videoThumbnail(url: string): string | null {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : null;
}

const PublicTalentProfile: React.FC<PublicTalentProfileProps> = ({ talentProfile, currentUserId }) => {
    const isOwner = currentUserId === talentProfile.userId;
    const bookingRef = React.useRef<HTMLDivElement>(null);

    const scrollToBooking = () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        bookingRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    };

    const hasContact = !!(talentProfile.contactEmail || talentProfile.websiteUrl);

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: 'var(--cc-bg)', color: 'var(--cc-ink)', fontFamily: BODY, py: { xs: 2, sm: 4 } }}>
            <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>

                {/* ============ Identity card ============
                    Talent wears its own base color (warm umber dark / gold wash
                    light) under the shared metallic sheen — the at-a-glance cue
                    for the profile type. */}
                <Box
                    sx={{
                        ...cardSx,
                        mb: { xs: 2, sm: 3 },
                        backgroundColor: 'var(--cc-id-talent)',
                        backgroundImage: 'var(--cc-id-sheen)',
                    }}
                >
                    <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* Gold-ringed avatar — the performer, spotlit. */}
                        {talentProfile.profilePictureUrl ? (
                            <Avatar
                                src={getS3ImageUrl(talentProfile.profilePictureUrl)}
                                sx={{
                                    width: { xs: 96, sm: 140 }, height: { xs: 96, sm: 140 },
                                    border: '3px solid var(--cc-gold)',
                                    boxShadow: '0 0 22px rgba(223, 208, 184, 0.28)',
                                    backgroundColor: 'var(--cc-bg)',
                                    flexShrink: 0,
                                }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    width: { xs: 96, sm: 140 }, height: { xs: 96, sm: 140 },
                                    border: '3px solid var(--cc-gold)', boxShadow: '0 0 22px rgba(223, 208, 184, 0.28)',
                                    borderRadius: '50%', backgroundColor: 'var(--cc-bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}
                            >
                                <AccountCircle sx={{ fontSize: { xs: 56, sm: 84 }, color: 'var(--cc-soft)' }} />
                            </Box>
                        )}

                        <Box sx={{ flex: 1, minWidth: 220 }}>
                            {/* The one gold wordmark on the page — the page's identity. */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Typography
                                    component="span"
                                    sx={{
                                        fontFamily: DISPLAY, fontSize: '0.72rem', fontWeight: 800,
                                        letterSpacing: '0.26em', textTransform: 'uppercase',
                                        color: 'var(--cc-gold)', textShadow: 'var(--cc-glow-gold)',
                                    }}
                                >
                                    Talent
                                </Typography>
                                {isOwner && (
                                    <IconButton
                                        component="a"
                                        href="/profile?tab=talent"
                                        size="small"
                                        aria-label="Edit talent profile"
                                        sx={{ color: 'var(--cc-soft)', '&:hover': { color: 'var(--cc-gold)' } }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>

                            <Typography
                                component="h1"
                                sx={{
                                    fontFamily: DISPLAY, fontWeight: 800, color: 'var(--cc-ink)',
                                    fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1.15,
                                    letterSpacing: '-0.015em', textWrap: 'balance', mt: 0.5,
                                }}
                            >
                                {talentProfile.displayName}
                            </Typography>

                            {talentProfile.tagline && (
                                <Typography sx={{ fontFamily: BODY, fontStyle: 'italic', color: 'var(--cc-muted)', fontSize: { xs: '0.92rem', sm: '1rem' }, mt: 0.5, maxWidth: '52ch' }}>
                                    {talentProfile.tagline}
                                </Typography>
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                                {(talentProfile.user?.roles ?? []).filter((r) => r !== Role.USER).map((role) => (
                                    <Chip key={role} label={formatRoleLabel(role)} size="small" sx={roleChipSx} />
                                ))}
                                <Typography suppressHydrationWarning sx={{ fontFamily: BODY, fontSize: '0.8rem', color: 'var(--cc-soft)' }}>
                                    Talent since {new Date(talentProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Action row */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 2.5 }}>
                        <Button
                            variant="contained"
                            disabled
                            startIcon={<BookIcon />}
                            sx={{
                                fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none', borderRadius: '8px', boxShadow: 'none',
                                '&.Mui-disabled': { backgroundColor: 'var(--cc-bg)', color: 'var(--cc-soft)', border: '1px solid var(--cc-hairline)' },
                            }}
                        >
                            Book
                        </Button>
                        {hasContact && (
                            <Button
                                variant="outlined"
                                onClick={scrollToBooking}
                                startIcon={<EmailIcon />}
                                sx={{
                                    fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none', borderRadius: '8px',
                                    color: 'var(--cc-ink)', borderColor: 'var(--cc-panel-border)',
                                    '&:hover': { borderColor: 'var(--cc-gold)', backgroundColor: 'var(--cc-bg)' },
                                }}
                            >
                                Contact
                            </Button>
                        )}
                        <Button
                            variant="outlined"
                            disabled
                            startIcon={<FollowIcon />}
                            sx={{ fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&.Mui-disabled': { borderColor: 'var(--cc-hairline)', color: 'var(--cc-soft)' } }}
                        >
                            Follow
                        </Button>
                        <Button
                            variant="outlined"
                            disabled
                            startIcon={<ShareIcon />}
                            sx={{ fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&.Mui-disabled': { borderColor: 'var(--cc-hairline)', color: 'var(--cc-soft)' } }}
                        >
                            Share
                        </Button>
                        <Typography sx={{ fontFamily: BODY, fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cc-soft)', ml: 0.5 }}>
                            Book, Follow &amp; Share coming soon
                        </Typography>
                    </Box>
                </Box>

                {/* ============ Content: main column + rail ============ */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: { xs: 2, sm: 3 }, alignItems: 'start' }}>

                    {/* -------- Main column -------- */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 }, minWidth: 0 }}>

                        {/* Media — leads because it sells. Hidden when empty. */}
                        {talentProfile.media.length > 0 && (
                            <Box sx={cardSx}>
                                <Typography component="h2" sx={cardTitleSx}>Photos &amp; Videos</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5 }}>
                                    {talentProfile.media.map((item) => {
                                        const isVideo = item.type === 'VIDEO_LINK';
                                        const src = isVideo ? videoThumbnail(item.url) : (getS3ImageUrl(item.url) || item.url);
                                        return (
                                            <Box
                                                key={item.id}
                                                component="a"
                                                href={isVideo ? item.url : (getS3ImageUrl(item.url) || item.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={item.caption || (isVideo ? 'Watch video' : 'View photo')}
                                                sx={{
                                                    position: 'relative', display: 'block', aspectRatio: '1 / 1',
                                                    borderRadius: '8px', overflow: 'hidden',
                                                    border: '1px solid var(--cc-panel-border)', backgroundColor: 'var(--cc-bg)',
                                                    transition: 'border-color 0.18s ease-out, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                                                    '&:hover': { borderColor: 'var(--cc-gold)', transform: 'translateY(-2px)' },
                                                    '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                                                    '@media (prefers-reduced-motion: reduce)': { transition: 'border-color 0.18s', '&:hover': { transform: 'none' } },
                                                }}
                                            >
                                                {src ? (
                                                    <Box component="img" src={src} alt={item.caption || ''} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <VideoIcon sx={{ fontSize: '2.4rem', color: 'var(--cc-soft)' }} />
                                                    </Box>
                                                )}
                                                {isVideo && (
                                                    <Box sx={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <VideoIcon sx={{ fontSize: '2.6rem', color: '#fff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}

                        {/* Upcoming appearances — the proof they work. */}
                        <Box sx={cardSx}>
                            <Typography component="h2" sx={cardTitleSx}>Upcoming Appearances</Typography>
                            {talentProfile.conventions.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    {talentProfile.conventions.map((booking, i) => (
                                        <Box
                                            key={booking.id}
                                            sx={{
                                                py: 1.75,
                                                borderTop: i === 0 ? 'none' : '1px solid var(--cc-hairline)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                                            }}
                                        >
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.98rem', color: 'var(--cc-ink)' }}>
                                                    {booking.convention.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <CalendarIcon sx={{ fontSize: '0.95rem', color: 'var(--cc-soft)' }} />
                                                        <Typography suppressHydrationWarning sx={{ fontFamily: BODY, fontSize: '0.82rem', color: 'var(--cc-muted)' }}>
                                                            {formatDateRange(booking.convention.startDate, booking.convention.endDate)}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <LocationIcon sx={{ fontSize: '0.95rem', color: 'var(--cc-soft)' }} />
                                                        <Typography sx={{ fontFamily: BODY, fontSize: '0.82rem', color: 'var(--cc-muted)' }}>
                                                            {formatLocation(booking.convention.city, booking.convention.country)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Link
                                                href={`/conventions/${booking.convention.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ color: 'var(--cc-cyan)', textDecoration: 'none', fontFamily: DISPLAY, fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                                            >
                                                View Convention →
                                            </Link>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>
                                    No upcoming appearances yet.
                                </Typography>
                            )}
                        </Box>

                        {/* About */}
                        <Box sx={cardSx}>
                            <Typography component="h2" sx={cardTitleSx}>About {talentProfile.displayName}</Typography>
                            {talentProfile.bio ? (
                                <Typography
                                    component="div"  // bio HTML contains <p> tags; a <p> wrapper would nest <p> in <p> and break hydration
                                    sx={{ fontFamily: BODY, lineHeight: 1.7, color: 'var(--cc-ink)', maxWidth: '70ch', '& p': { margin: 0, mb: 1 }, '& p:last-child': { mb: 0 } }}
                                    dangerouslySetInnerHTML={{ __html: talentProfile.bio }}
                                />
                            ) : (
                                <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>
                                    This talent hasn&apos;t added a bio yet.
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* -------- Rail -------- */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 }, minWidth: 0 }}>

                        {/* Booking / contact — the conversion card. */}
                        <Box ref={bookingRef} sx={{ ...cardSx, scrollMarginTop: '24px' }}>
                            <Typography component="h2" sx={cardTitleSx}>Booking &amp; Contact</Typography>
                            {hasContact ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                                    {talentProfile.contactEmail && (
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                                            <EmailIcon sx={{ color: 'var(--cc-gold)', fontSize: '1.15rem', mt: 0.25 }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontFamily: BODY, fontSize: '0.78rem', color: 'var(--cc-soft)' }}>Email</Typography>
                                                <Link href={`mailto:${talentProfile.contactEmail}`} sx={{ color: 'var(--cc-cyan)', textDecoration: 'none', fontFamily: BODY, fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all', '&:hover': { textDecoration: 'underline' } }}>
                                                    {talentProfile.contactEmail}
                                                </Link>
                                            </Box>
                                        </Box>
                                    )}
                                    {talentProfile.websiteUrl && (
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                                            <WebsiteIcon sx={{ color: 'var(--cc-gold)', fontSize: '1.15rem', mt: 0.25 }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontFamily: BODY, fontSize: '0.78rem', color: 'var(--cc-soft)' }}>Website</Typography>
                                                <Link href={talentProfile.websiteUrl} target="_blank" rel="noopener noreferrer" sx={{ color: 'var(--cc-cyan)', textDecoration: 'none', fontFamily: BODY, fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all', '&:hover': { textDecoration: 'underline' } }}>
                                                    {talentProfile.websiteUrl}
                                                </Link>
                                            </Box>
                                        </Box>
                                    )}
                                    <Typography sx={{ fontFamily: BODY, fontSize: '0.8rem', color: 'var(--cc-muted)', lineHeight: 1.6 }}>
                                        For bookings and appearance inquiries, reach out directly. Response times vary with the show schedule.
                                    </Typography>
                                </Box>
                            ) : (
                                <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>
                                    No public contact information yet.
                                </Typography>
                            )}
                        </Box>

                        {/* Lectures & products */}
                        {talentProfile.skills.length > 0 && (
                            <Box sx={cardSx}>
                                <Typography component="h2" sx={cardTitleSx}>Lectures &amp; Products</Typography>
                                <Box component="ul" sx={{ pl: 2, m: 0, '& li': { mb: 0.75, fontFamily: BODY, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--cc-ink)' } }}>
                                    {talentProfile.skills.map((skill, index) => (
                                        <Typography component="li" key={index}>{skill}</Typography>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Member cross-link (claimed profiles only) */}
                        {talentProfile.user && (
                            <Box sx={cardSx}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <PersonIcon sx={{ color: 'var(--cc-cyan)', fontSize: '1.1rem' }} />
                                    <Typography sx={{ ...cardTitleSx, mb: 0, fontSize: '0.95rem' }}>Community Member</Typography>
                                </Box>
                                <Typography sx={{ fontFamily: BODY, fontSize: '0.85rem', color: 'var(--cc-muted)', mb: 1.5, lineHeight: 1.6 }}>
                                    {talentProfile.displayName} is a ConventionCrasher member.
                                </Typography>
                                <Link
                                    href={`/u/${talentProfile.user.id}`}
                                    sx={{ color: 'var(--cc-cyan)', textDecoration: 'none', fontFamily: DISPLAY, fontWeight: 700, fontSize: '0.85rem', '&:hover': { textDecoration: 'underline' } }}
                                >
                                    View member profile →
                                </Link>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};

export default PublicTalentProfile;
