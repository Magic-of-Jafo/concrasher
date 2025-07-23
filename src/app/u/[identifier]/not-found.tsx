import Link from 'next/link';
import { Box, Typography, Button, Container } from '@mui/material';
import { PersonSearch as PersonSearchIcon } from '@mui/icons-material';

export default function UserNotFound() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          textAlign: 'center',
          px: 2,
        }}
      >
        <PersonSearchIcon
          sx={{
            fontSize: { xs: '4rem', sm: '6rem' },
            color: 'text.secondary',
            mb: 3,
          }}
        />
        
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2rem', sm: '3rem' },
            fontWeight: 'bold',
            mb: 2,
          }}
        >
          User Not Found
        </Typography>
        
        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: '1rem', sm: '1.1rem' },
            color: 'text.secondary',
            mb: 4,
            maxWidth: 400,
            lineHeight: 1.6,
          }}
        >
          Sorry, we couldn't find a user with that name or identifier. 
          They may have changed their username or the profile might not exist.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            component={Link}
            href="/"
            variant="contained"
            size="large"
            sx={{ minWidth: 140 }}
          >
            Go Home
          </Button>
          
          <Button
            component={Link}
            href="/conventions"
            variant="outlined"
            size="large"
            sx={{ minWidth: 140 }}
          >
            Browse Conventions
          </Button>
        </Box>
      </Box>
    </Container>
  );
} 