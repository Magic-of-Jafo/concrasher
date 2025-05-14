import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BulkActions from "../BulkActions";

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
    expect(screen.getByText("Delete Selected")).toBeInTheDocument();
    expect(screen.getByText("Change Status")).toBeInTheDocument();
  });

  it("handles bulk delete action", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<BulkActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByText("Delete Selected"));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/conventions/bulk",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            ids: mockProps.selectedIds,
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
    fireEvent.click(screen.getByText("Change Status"));

    // Select new status
    await waitFor(() => {
      expect(screen.getByLabelText("Status")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByLabelText("Status"));
    fireEvent.click(screen.getByText("PUBLISHED"));

    // Confirm status change
    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/conventions/bulk",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "status",
            ids: mockProps.selectedIds,
            status: "PUBLISHED",
          }),
        })
      );
      expect(mockProps.onActionComplete).toHaveBeenCalled();
    });
  });

  it("shows error message when bulk action fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Failed to perform action"));

    render(<BulkActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByText("Delete Selected"));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.getByText("Failed to perform action")).toBeInTheDocument();
    });
  });

  it("shows loading state during bulk action", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<BulkActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByText("Delete Selected"));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
}); 