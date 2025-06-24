import { Box, Container, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You do not have permission to access this page. Please contact your administrator if you believe this is an error.
        </Typography>
        <Button
          component={Link}
          href="/"
          variant="contained"
          color="primary"
        >
          Return to Home
        </Button>
      </Box>
    </Container>
  );
} 