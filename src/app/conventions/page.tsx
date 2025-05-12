'use client';

import { useState, useEffect } from 'react';
import { Box, Container, Grid, useTheme, useMediaQuery, Paper } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { FilterPanel } from './FilterPanel';
import { ConventionGrid } from './ConventionGrid';
import { Convention } from '@prisma/client';

interface SearchResponse {
  items: Convention[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ConventionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchConventions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/conventions?${searchParams?.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch conventions');
        const data: SearchResponse = await response.json();
        setConventions(data.items);
        setTotalPages(data.totalPages);
        setCurrentPage(data.page);
      } catch (error) {
        console.error('Error fetching conventions:', error);
        // TODO: Add error handling UI
      } finally {
        setIsLoading(false);
      }
    };

    fetchConventions();
  }, [searchParams]);

  const handlePageChange = (page: number) => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    window.history.pushState({}, '', `/conventions?${params.toString()}`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          bgcolor: 'background.paper',
          minHeight: '100vh'
        }}
      >
        <Grid container spacing={3}>
          {!isMobile && (
            <Grid item xs={12} md={3}>
              <Paper 
                elevation={1} 
                sx={{ 
                  height: '100%',
                  bgcolor: 'background.paper',
                  position: 'sticky',
                  top: 24
                }}
              >
                <FilterPanel />
              </Paper>
            </Grid>
          )}
          <Grid item xs={12} md={isMobile ? 12 : 9}>
            <Box sx={{ mb: 3 }}>
              <SearchBar />
            </Box>
            {isMobile && (
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <FilterPanel />
              </Box>
            )}
            <Paper 
              elevation={1} 
              sx={{ 
                p: 3,
                bgcolor: 'background.paper'
              }}
            >
              <ConventionGrid
                conventions={conventions}
                totalPages={totalPages}
                currentPage={currentPage}
                isLoading={isLoading}
                onPageChange={handlePageChange}
              />
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
} 