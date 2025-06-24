import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConventionForm } from '../components/ConventionForm';
import { useConvention } from '../hooks/useConvention';
import { useAuth } from '../hooks/useAuth';

// Mock the hooks
jest.mock('../hooks/useConvention');
jest.mock('../hooks/useAuth');

describe('ConventionForm', () => {
  const mockCreateConvention = jest.fn();
  const mockUser = { id: '1', username: 'testuser' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useConvention as jest.Mock).mockReturnValue({
      createConvention: mockCreateConvention,
      loading: false,
      error: null,
    });
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });
  });

  it('renders the form', () => {
    render(<ConventionForm />);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });
}); 