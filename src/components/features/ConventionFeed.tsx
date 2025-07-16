"use client";

import React from "react";
import ConventionCard from "@/components/features/ConventionCard";
import { Box, Grid, Paper, Typography, Theme, Button } from "@mui/material";
import { styled } from "@mui/material/styles";
import Link from "next/link";
import { getS3ImageUrl } from "@/lib/defaults";
import Script from "next/script";
import FacebookIcon from '@mui/icons-material/Facebook';


const SidebarWidget = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  background: theme.palette.background.paper,
}));

export default function ConventionFeed({ conventions }: { conventions: any[] }) {
  // Helper to get status text
  const getConventionStatusText = (startDate: Date | string | null, endDate: Date | string | null) => {
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

  // Filter and sort conventions
  const filteredSorted = conventions
    .filter(con => {
      if (!con.startDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = con.endDate ? new Date(con.endDate) : new Date(con.startDate);
      end.setHours(0, 0, 0, 0);
      return end >= today;
    })
    .sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  return (
    <Box sx={{ flexGrow: 1, px: { xs: 1, sm: 2, md: 4 }, py: 4, maxWidth: 1400, mx: "auto" }}>
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
          {/* Mini Hero Section */}
          <Paper
            sx={{
              p: 3,
              mb: 2,
              borderRadius: 2,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '300px',
            }}
          >
            {/* GrooveVideo Player as "background" */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                '& groovevideo-widget': {
                  width: '100% !important',
                  height: '100% !important',
                  objectFit: 'cover',
                },
              }}
            >
              <link href="https://widget.groovevideo.com/widget/app.css" rel="stylesheet" />
              <Script
                src="https://widget.groovevideo.com/widget/app.js"
                strategy="lazyOnload"
              />

              <div dangerouslySetInnerHTML={{
                __html: '<groovevideo-widget id="288647" permalink="UjAdn2s5J45xXy4uBUas"></groovevideo-widget>'
              }} />
            </Box>

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

            {/* Text at top */}
            <Box sx={{ mb: 2, position: 'relative', zIndex: 2, pr: 20 }}>
              <Typography
                sx={{
                  fontSize: '2.5rem',
                  fontFamily: 'Montserrat',
                  fontWeight: 900,
                  lineHeight: 1.1,
                }}
              >
                The Best Guide to Magic Conventions
              </Typography>
            </Box>

            {/* Logo in upper right corner */}
            <Box sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 2,
            }}>
              <img
                src={getS3ImageUrl('/images/defaults/convention-crasher-logo.png')}
                alt="Convention Crasher Logo"
                style={{
                  width: '150px',
                  height: 'auto',
                }}
              />
            </Box>

            {/* Button centered along bottom */}
            <Box sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
            }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#ffd700',
                  color: '#1a365d',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: '#ffed4e',
                  },
                }}
                component={Link}
                href="/register"
              >
                Make Your Free Account
              </Button>
            </Box>
          </Paper>

          {/* New content section */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="h2" sx={{ mb: 2, fontWeight: 600, fontSize: '2rem', fontFamily: 'Montserrat' }}>
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
          <Typography variant="h1" sx={{ mb: 3, fontSize: '2rem', textAlign: 'center' }}>
            Find a Convention Near You
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              size="medium"
              component={Link}
              href="/conventions"
              sx={{
                px: 4,
                py: 0.5,
                fontWeight: 600,
                bgcolor: '#424242',
                color: 'white',
                '&:hover': {
                  bgcolor: '#616161',
                },
              }}
            >
              Browse Complete List
            </Button>
          </Box>
          <Box display="flex" flexDirection="column" gap={3}>
            {filteredSorted.length === 0 ? (
              <Typography color="text.secondary">No conventions found.</Typography>
            ) : (
              filteredSorted.map((con: any, index: number) => {
                const statusText = getConventionStatusText(con.startDate, con.endDate);
                if (!statusText) return null; // Hide past events

                const elements = [
                  <Box key={con.id}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color={statusText === 'Happening Now!' ? 'success.main' : 'primary'} fontWeight={600}>
                        {statusText}
                      </Typography>
                    </Box>
                    <ConventionCard convention={con} />
                  </Box>
                ];

                // Insert Facebook link after the second card
                if (index === 1) {
                  elements.push(
                    <Box key="facebook-link" sx={{ textAlign: 'center' }}>
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
                          justifyContent: 'center',
                          gap: 1,
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        <FacebookIcon sx={{ fontSize: '1.2rem' }} />
                        Follow our Facebook page for feature updates.
                      </Typography>
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
  );
} 