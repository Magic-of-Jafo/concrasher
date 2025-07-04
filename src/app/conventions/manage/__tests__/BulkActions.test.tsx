import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BulkActions from "../../../organizer/conventions/BulkActions";

// Mock the fetch function
global.fetch = jest.fn();

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Wrapper component to provide React Query context
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const testQueryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("BulkActions", () => {
  const mockProps = {
    selectedIds: ["1", "2", "3"],
    onActionComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when no items are selected", () => {
    render(<BulkActions selectedIds={[]} onActionComplete={jest.fn()} />, { wrapper });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders bulk action buttons when items are selected", () => {
    render(<BulkActions {...mockProps} />, { wrapper });
    expect(screen.getByText(/delete selected/i)).toBeInTheDocument();
    expect(screen.getByText(/change status/i)).toBeInTheDocument();
  });

  it("handles bulk delete action", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<BulkActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByText(/delete selected/i));

    // Confirm deletion - check for the actual dialog title
    await waitFor(() => {
      expect(screen.getByText("Move Selected to Trash?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Move to Trash"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/conventions/bulk",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            conventionIds: mockProps.selectedIds,
          }),
        })
      );
      expect(mockProps.onActionComplete).toHaveBeenCalled();
    });
  });

  it("handles bulk status change", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<BulkActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByText(/change status/i));

    // Check for the status change dialog title
    await waitFor(() => {
      expect(screen.getByText("Change Convention Status")).toBeInTheDocument();
    });

    // Select new status and confirm - use role selector for Material-UI Select
    const statusSelect = screen.getByRole("combobox");
    fireEvent.mouseDown(statusSelect);
    await waitFor(() => {
      expect(screen.getByText("PUBLISHED")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("PUBLISHED"));
    fireEvent.click(screen.getByText("Update Status"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/conventions/bulk",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "status",
            conventionIds: mockProps.selectedIds,
            status: "PUBLISHED",
          }),
        })
      );
      expect(mockProps.onActionComplete).toHaveBeenCalled();
    });
  });

  it("shows error message when bulk action fails", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<BulkActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByText(/delete selected/i));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText("Move Selected to Trash?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Move to Trash"));

    // Check that error was logged to console since component doesn't show UI error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Bulk action failed:", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it("shows loading state during bulk action", async () => {
    let resolveFetch: (value: any) => void = () => { };
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(resolve => {
      resolveFetch = resolve;
    }));

    render(<BulkActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByText(/delete selected/i));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText("Move Selected to Trash?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Move to Trash"));

    // Check for LinearProgress component while mutation is pending
    await waitFor(() => {
      expect(document.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    });

    // Resolve the fetch to complete the test
    resolveFetch({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await waitFor(() => {
      expect(mockProps.onActionComplete).toHaveBeenCalled();
    });
  });
}); 