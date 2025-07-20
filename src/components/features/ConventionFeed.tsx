"use client";

import React, { useState, useEffect } from "react";
import ConventionCard from "@/components/features/ConventionCard";
import { Box, Grid, Paper, Typography, Theme, Button } from "@mui/material";
import { styled } from "@mui/material/styles";
import Link from "next/link";
import { getS3ImageUrl } from "@/lib/defaults";
import FacebookIcon from '@mui/icons-material/Facebook';
import dynamic from "next/dynamic";

// Dynamic import for Groove Video widget to improve page load performance
const GrooveVideoWidget = dynamic(() => import('@/components/features/GrooveVideoWidget'), {
  ssr: false, // This ensures it only loads on the client-side
  loading: () => (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        backgroundColor: '#1a365d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="body2" color="white">
        Loading video...
      </Typography>
    </Box>
  ),
});


const SidebarWidget = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  background: theme.palette.background.paper,
}));

export default function ConventionFeed({ conventions }: { conventions: any[] }) {
  const [filteredSorted, setFilteredSorted] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Helper to get status text
  const getConventionStatusText = (startDate: Date | string | null, endDate: Date | string | null) => {
    if (!isClient) return "Loading..."; // Prevent hydration mismatch
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!startDate) return "Date TBD";
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(0, 0, 0, 0);
    if (today >= start && today <= end) {
      return "Happening Now!";
    }
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return null; // Hide past events
    } else if (diffDays === 0) {
      return "Starts Today";
    } else if (diffDays === 1) {
      return "Starts Tomorrow";
    } else {
      return `In ${diffDays} Days`;
    }
  };

  // Handle client-side filtering and sorting
  useEffect(() => {
    setIsClient(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = conventions
      .filter(con => {
        if (!con.startDate) return false;
        const end = con.endDate ? new Date(con.endDate) : new Date(con.startDate);
        end.setHours(0, 0, 0, 0);
        return end >= today;
      })
      .sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

    setFilteredSorted(filtered);
  }, [conventions]);

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 1400, mx: "auto" }}>
      {/* Hero Section - Full Width with Responsive Layout */}
      <Box sx={{
        width: '100vw',
        mb: 6,
        position: 'relative',
        overflow: 'hidden',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw'
      }}>
        <Paper
          sx={{
            p: 0,
            borderRadius: 0,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            // Responsive heights to prevent blank space
            minHeight: { xs: '300px', sm: '400px', md: '500px', lg: '600px' },
          }}
        >
          {/* GrooveVideo Player as "background" - using same structure as mini-hero */}
          <GrooveVideoWidget id="288647" permalink="UjAdn2s5J45xXy4uBUas" />

          {/* Dark overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(26, 54, 93, 0.7)',
              zIndex: 1,
            }}
          />

          {/* Hero Content - Responsive Layout */}
          <Box sx={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: 1400,
            mx: "auto",
            px: { xs: 1, sm: 2, md: 4 },
            pb: 2.5
          }}>
            {/* Main Headline */}
            <Typography
              sx={{
                mb: { xs: 2, sm: 3, md: 4 },
                fontSize: { xs: '1.5rem', sm: '2.5rem', md: '3.5rem', lg: '4rem' },
                fontFamily: 'Montserrat',
                fontWeight: 900,
                lineHeight: 1.1,
                textAlign: 'center',
                color: '#f5f5dc', // Light cream color
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
              }}
            >
              The Best Guide to Magic Conventions
            </Typography>

            {/* Hero Content - Logo and Buttons Only on Mobile, Full Layout on Desktop */}
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: { xs: 3, lg: 4 },
              alignItems: { xs: 'center', lg: 'stretch' },
              justifyContent: { xs: 'center', lg: 'space-between' },
              width: '100%',
              flex: 1
            }}>
              {/* Left Column - Logo and Buttons (Always in hero) */}
              <Box
                sx={{
                  width: { xs: '100%', lg: '50%' },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: { xs: 2, sm: 3 },
                  order: { xs: 1, lg: 1 },
                  minHeight: { lg: '400px' } // Ensure minimum height for centering
                }}
              >
                {/* Logo - Responsive sizing */}
                <Box sx={{
                  width: { xs: '150px', sm: '200px', md: '300px', lg: '430px' },
                  transform: { xs: 'scale(0.9)', sm: 'scale(1)' }
                }}>
                  <img
                    src={getS3ImageUrl('/images/defaults/convention-crasher-logo.png')}
                    alt="Convention Crasher Logo"
                    style={{
                      width: '100%',
                      height: 'auto',
                    }}
                  />
                </Box>

                {/* Button and Link - Responsive sizing */}
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  width: '100%',
                  maxWidth: { xs: '280px', sm: '375px' },
                  alignItems: 'center',
                  transform: { xs: 'scale(0.9)', sm: 'scale(1)' }
                }}>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    href="/conventions"
                    sx={{
                      px: { xs: 4, sm: 6 },
                      py: 1.5,
                      fontWeight: 600,
                      bgcolor: '#ffd700',
                      color: '#1a365d',
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                      '&:hover': {
                        bgcolor: '#ffed4e',
                      },
                    }}
                  >
                    See All
                  </Button>
                  <Typography
                    component={Link}
                    href="/register"
                    sx={{
                      color: 'white',
                      textDecoration: 'underline',
                      fontSize: { xs: '0.8rem', sm: '0.9rem' },
                      '&:hover': {
                        color: '#ffd700',
                      },
                    }}
                  >
                    Sign Up for Free
                  </Typography>
                </Box>
              </Box>

              {/* Right Column - Convention Cards (Only show on desktop) */}
              <Box
                sx={{
                  width: { xs: '0%', lg: '50%' }, // Hidden on mobile
                  display: { xs: 'none', lg: 'flex' },
                  flexDirection: "column",
                  gap: 2,
                  order: { xs: 2, lg: 2 }
                }}
              >
                {/* Coming Soon Header */}
                <Typography
                  variant="h3"
                  sx={{
                    mb: 2,
                    fontSize: '1.5rem',
                    fontFamily: 'Poppins',
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'white'
                  }}
                >
                  Coming Soon!
                </Typography>
                {!isClient ? (
                  // Loading state for desktop
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography>Loading...</Typography>
                  </Box>
                ) : (
                  filteredSorted.slice(3, 6).map((con: any) => {
                    const statusText = getConventionStatusText(con.startDate, con.endDate);
                    if (!statusText) return null;

                    return (
                      <Box key={con.id}>
                        <ConventionCard convention={con} />
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Mobile Convention Cards Section - Only show on mobile */}
      <Box sx={{
        display: { xs: 'block', lg: 'none' },
        px: { xs: 1, sm: 2, md: 4 },
        py: 3
      }}>
        <Typography
          variant="h3"
          sx={{
            mb: 3,
            fontSize: '1.5rem',
            fontFamily: 'Poppins',
            fontWeight: 600,
            textAlign: 'center',
            color: 'text.primary'
          }}
        >
          Coming Soon!
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!isClient ? (
            // Loading state for mobile
            <Box sx={{ textAlign: 'center' }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : (
            filteredSorted.slice(3, 6).map((con: any) => {
              const statusText = getConventionStatusText(con.startDate, con.endDate);
              if (!statusText) return null;

              return (
                <Box key={con.id}>
                  <ConventionCard convention={con} />
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 1, sm: 2, md: 4 }, py: 4 }}>
        <Grid
          columns={12}
          alignItems="flex-start"
          sx={{ display: "flex", flexWrap: "wrap", gap: 4 }}
        >
          {/* Sidebar */}
          <Box
            sx={{
              flex: { xs: "1 1 100%", md: "1 1 0" },
              minWidth: 0,
              position: { md: "sticky" },
              top: { md: 32 },
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* New content section */}
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="h2"
                sx={{
                  mb: 2,
                  fontSize: '32px',
                  fontFamily: 'Poppins',
                  fontWeight: 800,
                  lineHeight: '1.2000000476837158em',
                  color: 'rgba(0, 0, 0, 0.87)'
                }}
              >
                Never been to a magic convention?
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                You're in the right place.
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                Magic conventions aren't just for pros - they're for anyone who loves the art and wants to see it up close. See shows, lectures, new effects, and jam into the early hours with new friends. Whether you're a casual fan, a curious hobbyist, or just looking for your first taste of the live magic scene, this is where it starts.
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                Convention Crasher makes it easy to discover what's happening, when, and where. You can find a lot of great information. And we have a ton of new site features rolling out over the rest of the year.
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                And if you're an organizer or performer, Convention Crasher helps you connect with exactly the kind of audience you're trying to reach. From full-featured tools to manage your event, to talent profiles and brand pages that help you get noticed.
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                Our industry has seen more growth than ever before. Which means there are a ton of people who have never been to a magic convention. It all starts here!
              </Typography>
              <Typography variant="body1" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                The Convention Crasher Team
              </Typography>
            </Box>
          </Box>
          {/* Main Convention Feed */}
          <Box
            sx={{
              flex: { xs: "1 1 100%", md: "1 1 0" },
              minWidth: 0,
              mb: { xs: 4, md: 0 },
            }}
          >
            <Box display="flex" flexDirection="column" gap={3}>
              {!isClient ? (
                // Loading state for main feed
                <Box sx={{ textAlign: 'center' }}>
                  <Typography>Loading conventions...</Typography>
                </Box>
              ) : filteredSorted.length === 0 ? (
                <Typography color="text.secondary">No conventions found.</Typography>
              ) : (
                filteredSorted.map((con: any, index: number) => {
                  const statusText = getConventionStatusText(con.startDate, con.endDate);
                  if (!statusText) return null; // Hide past events

                  const elements = [
                    <Box key={con.id}>
                      <ConventionCard convention={con} />
                    </Box>
                  ];

                  // Insert Facebook link after the second card
                  if (index === 1) {
                    elements.push(
                      <Box key="facebook-link" sx={{ textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <span style={{ fontSize: '1.2rem' }}>👉</span>
                          <Typography
                            component="a"
                            href="https://www.facebook.com/conventioncrasher"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: 'primary.main',
                              textDecoration: 'underline',
                              fontFamily: 'Open Sans',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            <FacebookIcon sx={{ fontSize: '1.2rem' }} />
                            Follow our Facebook page for feature updates.
                          </Typography>
                          <span style={{ fontSize: '1.2rem' }}>👈</span>
                        </Box>
                      </Box>
                    );
                  }

                  return elements;
                }).flat()
              )}
            </Box>
          </Box>
        </Grid>
      </Box>
    </Box>
  );
} 