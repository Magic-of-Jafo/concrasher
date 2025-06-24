import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Page from "../page";

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

describe("Convention Management Page", () => {
  const mockConventions = [
    {
      id: "1",
      name: "Test Convention 1",
      status: "DRAFT",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
    },
    {
      id: "2",
      name: "Test Convention 2",
      status: "PUBLISHED",
      startDate: "2024-02-01",
      endDate: "2024-02-02",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConventions),
    });
  });

  it("renders the page with conventions", async () => {
    render(<Page />, { wrapper });

    // Check if page title is rendered
    expect(screen.getByText("Convention Management")).toBeInTheDocument();

    // Wait for conventions to load
    await waitFor(() => {
      expect(screen.getByText("Test Convention 1")).toBeInTheDocument();
      expect(screen.getByText("Test Convention 2")).toBeInTheDocument();
    });

    // Check if status chips are rendered
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(screen.getByText("PUBLISHED")).toBeInTheDocument();
  });

  it("handles bulk operations", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConventions),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<Page />, { wrapper });

    // Wait for conventions to load
    await waitFor(() => {
      expect(screen.getByText("Test Convention 1")).toBeInTheDocument();
    });

    // Select conventions
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]); // Select first convention
    fireEvent.click(checkboxes[2]); // Select second convention

    // Perform bulk delete
    fireEvent.click(screen.getByText("Delete Selected"));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    // Verify bulk delete API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/conventions/bulk",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            ids: ["1", "2"],
          }),
        })
      );
    });
  });

  it("handles individual convention actions", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConventions),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<Page />, { wrapper });

    // Wait for conventions to load
    await waitFor(() => {
      expect(screen.getByText("Test Convention 1")).toBeInTheDocument();
    });

    // Open action menu for first convention
    const actionButtons = screen.getAllByRole("button", { name: /actions/i });
    fireEvent.click(actionButtons[0]);

    // Change status
    fireEvent.click(screen.getByText("Change Status"));

    // Select new status
    await waitFor(() => {
      expect(screen.getByLabelText("Status")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByLabelText("Status"));
    fireEvent.click(screen.getByText("PUBLISHED"));

    // Confirm status change
    fireEvent.click(screen.getByText("Update"));

    // Verify status update API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/conventions/1/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            status: "PUBLISHED",
          }),
        })
      );
    });
  });

  it("handles error states", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Failed to fetch"));

    render(<Page />, { wrapper });

    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText("No rows")).toBeInTheDocument();
    });
  });

  it("handles pagination", async () => {
    const mockPaginatedConventions = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      name: `Convention ${i + 1}`,
      status: "DRAFT",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPaginatedConventions),
    });

    render(<Page />, { wrapper });

    // Wait for conventions to load
    await waitFor(() => {
      expect(screen.getByText("Convention 1")).toBeInTheDocument();
    });

    // Check if pagination controls are present
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();

    // Click next page
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Verify pagination API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
        expect.any(Object)
      );
    });
  });
}); 