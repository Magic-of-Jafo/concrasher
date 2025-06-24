import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConventionActions from "../ConventionActions";
import { ConventionStatus } from "@prisma/client";

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

describe("ConventionActions", () => {
  const mockProps = {
    conventionId: "1",
    conventionName: "Test Convention",
    currentStatus: ConventionStatus.DRAFT,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders action buttons", () => {
    render(<ConventionActions {...mockProps} />, { wrapper });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens menu when clicking action button", () => {
    render(<ConventionActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Change Status")).toBeInTheDocument();
  });

  it("handles edit action", () => {
    render(<ConventionActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Edit"));
    // Add assertions for edit action
  });

  it("handles delete action", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<ConventionActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Delete"));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/conventions/${mockProps.conventionId}`,
        expect.any(Object)
      );
    });
  });

  it("handles duplicate action", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<ConventionActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Duplicate"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/conventions/${mockProps.conventionId}/duplicate`,
        expect.any(Object)
      );
    });
  });

  it("handles status change", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<ConventionActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
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
        `/api/conventions/${mockProps.conventionId}/status`,
        expect.any(Object)
      );
    });
  });

  it("shows error message when action fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Failed to perform action"));

    render(<ConventionActions {...mockProps} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Delete"));

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.getByText("Failed to perform action")).toBeInTheDocument();
    });
  });
}); 