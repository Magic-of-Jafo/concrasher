'use client';

import { Box, Container, Skeleton, Paper } from '@mui/material';

export default function Loading() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={300}
          sx={{ 
            borderRadius: 1, 
            mb: { xs: 2, sm: 3, md: 4 }
          }}
        />

        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 1, sm: 2 }
            }}>
              <Skeleton variant="text" width="60%" height={48} />
              <Skeleton variant="rectangular" width={100} height={32} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, sm: 3 } }}>
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="40%" height={24} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="80%" height={24} />
              </Box>

              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="40%" height={24} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="80%" height={24} />
              </Box>
            </Box>

            <Box>
              <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="100%" height={24} />
              <Skeleton variant="text" width="90%" height={24} />
              <Skeleton variant="text" width="95%" height={24} />
            </Box>

            <Box>
              <Skeleton variant="text" width="40%" height={24} />
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                flexWrap: 'wrap',
                gap: { xs: 1, sm: 2 },
                mt: 2 
              }}>
                {[1, 2, 3].map((index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      flex: { sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.333% - 16px)' }
                    }}
                  >
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height={220}
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 