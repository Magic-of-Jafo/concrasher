"use client";

import React from "react";
import ConventionCard from "@/components/features/ConventionCard";
import { Box, Grid, Paper, Typography, Theme } from "@mui/material";
import { styled } from "@mui/material/styles";

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
          <SidebarWidget>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              ✨ Featured Convention
            </Typography>
            <Typography color="text.secondary">Coming soon...</Typography>
          </SidebarWidget>
          <SidebarWidget>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              🧵 Community Posts
            </Typography>
            <Typography color="text.secondary">Coming soon...</Typography>
          </SidebarWidget>
          <SidebarWidget>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              📣 Upcoming Deadlines
            </Typography>
            <Typography color="text.secondary">Coming soon...</Typography>
          </SidebarWidget>
          <SidebarWidget>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              🔗 Submit a Convention
            </Typography>
            <Typography color="text.secondary">Coming soon...</Typography>
          </SidebarWidget>
        </Box>
        {/* Main Convention Feed */}
        <Box
          sx={{
            flex: { xs: "1 1 100%", md: "1 1 0" },
            minWidth: 0,
            mb: { xs: 4, md: 0 },
          }}
        >
          <Typography variant="h1" sx={{ mb: 3 }}>
            Upcoming Conventions
          </Typography>
          <Box display="flex" flexDirection="column" gap={3}>
            {filteredSorted.length === 0 ? (
              <Typography color="text.secondary">No conventions found.</Typography>
            ) : (
              filteredSorted.map((con: any) => {
                const statusText = getConventionStatusText(con.startDate, con.endDate);
                if (!statusText) return null; // Hide past events
                return (
                  <Box key={con.id}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color={statusText === 'Happening Now!' ? 'success.main' : 'primary'} fontWeight={600}>
                        {statusText}
                      </Typography>
                    </Box>
                    <ConventionCard convention={con} />
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      </Grid>
    </Box>
  );
} 