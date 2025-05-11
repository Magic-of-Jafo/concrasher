'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page'; // Adjust path as necessary
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'), // Import and retain default behavior
  signIn: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: jest.fn(),
}));

describe('LoginPage Component', () => {
  let mockRouterPush: jest.Mock;
  let mockSignIn: jest.Mock;

  beforeEach(() => {
    mockRouterPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });

    mockSignIn = signIn as jest.Mock;
    mockSignIn.mockClear();
    mockRouterPush.mockClear();
  });

  it('should render the login form elements correctly', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should display client-side validation errors for empty fields', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument(); // Zod error for email
      expect(screen.getByText('Password is required')).toBeInTheDocument(); // Zod error for password
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should display client-side validation error for invalid email format', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should call signIn and redirect on successful login', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, url: '/dashboard' });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        redirect: false,
        email: 'test@example.com',
        password: 'password123',
        callbackUrl: '/',
      });
    });
    await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should display error message from signIn on failed login (CredentialsSignin)', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin', url: null });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

   it('should display generic error message from signIn on other errors', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'SomeOtherError', url: null });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('SomeOtherError')).toBeInTheDocument();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should disable submit button while submitting', async () => {
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, error: null, url: '/' }), 100)));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in.../i })).toBeDisabled();

    await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/');
    });
  });

}); 