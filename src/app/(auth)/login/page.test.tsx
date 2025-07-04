'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('LoginPage Component', () => {
  let mockRouterPush: jest.Mock;
  let mockSignIn: jest.Mock;
  let mockUseSearchParams: jest.Mock;

  beforeEach(() => {
    mockRouterPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });

    mockUseSearchParams = jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue('/conventions'),
    });
    require('next/navigation').useSearchParams = mockUseSearchParams;

    mockSignIn = signIn as jest.Mock;
    jest.clearAllMocks();
  });

  it('should render the login form elements correctly', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should call signIn with correct parameters on form submission', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        redirect: true,
        email: 'test@example.com',
        password: 'password123',
        callbackUrl: '/conventions',
      });
    });
  });

  it('should display error message on failed login', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
  });

  it('should display generic error message from signIn on other errors', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'Some other error' });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Some other error')).toBeInTheDocument();
    });
  });

  it('should disable submit button while submitting', async () => {
    // Mock signIn to return a promise that we can control
    let resolveSignIn: (value: any) => void;
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });
    mockSignIn.mockReturnValue(signInPromise);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Button should be disabled and show "Logging In..."
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logging in.../i })).toBeDisabled();
    });

    // Resolve the promise and check that button is re-enabled
    resolveSignIn!({ ok: true, error: null });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled();
    });
  });

  it('should handle unexpected errors gracefully', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });
  });
}); 