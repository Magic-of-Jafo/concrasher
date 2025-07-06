import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewConventionPage from './page'; // The component to test
import { SessionProvider } from 'next-auth/react';

// --- Mocks ---
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    back: jest.fn(), // Add other methods if used by the component
  }),
}));

const mockUseSession = jest.fn();
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'), // Import and retain default behavior
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>, // Keep SessionProvider working
}));

const mockConventionSeriesSelector = jest.fn();
jest.mock('@/components/ConventionSeriesSelector', () => (props: any) => {
  mockConventionSeriesSelector(props);
  // Simulate selecting an existing series for simplicity in some tests
  return (
    <div data-testid="mock-convention-series-selector">
      <button onClick={() => props.onSeriesSelect('series-123')}>Select Existing Series</button>
      <button onClick={() => props.onNewSeriesCreate({ name: 'New Mock Series' })}>Create New Series</button>
    </div>
  );
});

const mockConventionEditorTabs = jest.fn();
jest.mock('@/components/organizer/convention-editor/ConventionEditorTabs', () => (props: any) => {
  mockConventionEditorTabs(props);
  // Simulate form input and save
  return (
    <div data-testid="mock-convention-editor-tabs">
      <button
        onClick={() => props.onSave({
          name: 'Test Convention from Tabs',
          slug: 'test-convention-from-tabs',
          isTBD: true,
          isOneDayEvent: false,
          city: 'Tab City',
          stateName: 'Tab State',
          stateAbbreviation: 'TS',
          country: 'Tab Country',
          descriptionShort: 'Short tab desc',
          descriptionMain: 'Main tab desc',
        })}
      >
        Save Convention
      </button>
      <button onClick={() => props.onCancel()}>Cancel</button>
      {props.isSaving && <p>Saving...</p>}
    </div>
  );
});

global.fetch = jest.fn();

// --- Test Suite ---

const renderNewConventionPage = (session: any) => {
  mockUseSession.mockReturnValue(session);
  return render(
    // SessionProvider might not be strictly necessary here if useSession is fully mocked,
    // but it's good practice if the component or children expect it.
    <SessionProvider session={session.data}>
      <NewConventionPage />
    </SessionProvider>
  );
};

describe('NewConventionPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    // Default to authenticated organizer session
    mockUseSession.mockReturnValue({
      data: { user: { roles: ['ORGANIZER'] } },
      status: 'authenticated',
    });
  });

  test('renders ConventionSeriesSelector initially', () => {
    renderNewConventionPage({ data: { user: { roles: ['ORGANIZER'] } }, status: 'authenticated' });
    expect(screen.getByTestId('mock-convention-series-selector')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-convention-editor-tabs')).not.toBeInTheDocument();
  });

  test('transitions to ConventionEditorTabs after series selection', () => {
    renderNewConventionPage({ data: { user: { roles: ['ORGANIZER'] } }, status: 'authenticated' });
    fireEvent.click(screen.getByText('Select Existing Series'));
    expect(screen.getByTestId('mock-convention-editor-tabs')).toBeInTheDocument();
    expect(mockConventionEditorTabs).toHaveBeenCalledWith(expect.objectContaining({
      initialConventionData: { seriesId: 'series-123' },
      isEditing: false,
    }));
  });

  test('calls API with correct data on save and navigates on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'conv-new-id', name: 'Test Convention from Tabs' }),
    });

    renderNewConventionPage({ data: { user: { roles: ['ORGANIZER'] } }, status: 'authenticated' });

    // Step 1: Select series to show editor
    fireEvent.click(screen.getByText('Select Existing Series'));
    expect(screen.getByTestId('mock-convention-editor-tabs')).toBeInTheDocument();

    // Step 2: Click save button within the mocked editor tabs
    fireEvent.click(screen.getByText('Save Convention'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/organizer/conventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Convention from Tabs',
          slug: 'test-convention-from-tabs',
          isTBD: true,
          isOneDayEvent: false,
          city: 'Tab City',
          stateName: 'Tab State',
          stateAbbreviation: 'TS',
          country: 'Tab Country',
          descriptionShort: 'Short tab desc',
          descriptionMain: 'Main tab desc',
          status: 'DRAFT',
        }),
      });
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/organizer/conventions');
    });
  });

  test('displays error message on API failure during save', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create convention' }),
    });

    renderNewConventionPage({ data: { user: { roles: ['ORGANIZER'] } }, status: 'authenticated' });
    fireEvent.click(screen.getByText('Select Existing Series'));
    fireEvent.click(screen.getByText('Save Convention'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Failed to create convention')).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  describe('Session Handling', () => {
    test('shows loading spinner when session is loading', () => {
      renderNewConventionPage({ data: null, status: 'loading' });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('redirects to /login if session is unauthenticated', () => {
      renderNewConventionPage({ data: null, status: 'unauthenticated' });
      expect(mockRouterPush).toHaveBeenCalledWith('/login');
    });

    test('redirects to /unauthorized if user is not an ORGANIZER', () => {
      renderNewConventionPage({
        data: { user: { roles: ['USER'] } }, // User without ORGANIZER role
        status: 'authenticated',
      });
      expect(mockRouterPush).toHaveBeenCalledWith('/unauthorized');
    });

    test('renders content if user is an ORGANIZER', () => {
      renderNewConventionPage({
        data: { user: { roles: ['ORGANIZER'] } },
        status: 'authenticated',
      });
      // Should render the series selector initially
      expect(screen.getByTestId('mock-convention-series-selector')).toBeInTheDocument();
    });
  });

  // Add tests for new series creation flow if necessary, though it mostly calls an API and then selects.

}); 