import { Box, Container, Typography, Button, Card, CardContent, CardActions } from '@mui/material';
import Link from 'next/link';
import { getAllConventions } from '@/lib/api';
import { format } from 'date-fns';
import { Convention } from '@prisma/client';

export default async function ConventionsPage() {
  const conventions = await getAllConventions();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: { xs: 2, sm: 3, md: 4 }
        }}>
          <Typography variant="h4" component="h1">
            Conventions
          </Typography>
          <Button
            component={Link}
            href="/conventions/new"
            variant="contained"
            color="primary"
          >
            New Convention
          </Button>
        </Box>

        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3
        }}>
          {conventions.map((convention: Convention) => (
            <Box 
              key={convention.id} 
              sx={{ 
                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' },
                minWidth: 0
              }}
            >
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {convention.name}
                  </Typography>
                  <Typography color="text.secondary" gutterBottom>
                    {format(new Date(convention.startDate), 'PPP')} -{' '}
                    {format(new Date(convention.endDate), 'PPP')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {convention.venueName && `${convention.venueName}, `}
                    {convention.city}, {convention.state}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    component={Link}
                    href={`/conventions/${convention.id}`}
                    size="small"
                    color="primary"
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
} 