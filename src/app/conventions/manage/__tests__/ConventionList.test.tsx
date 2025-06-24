import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConventionList from "../ConventionList";

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

describe("ConventionList", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<ConventionList />, { wrapper });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders conventions when data is loaded", async () => {
    const mockConventions = [
      {
        id: "1",
        name: "Test Convention",
        status: "DRAFT",
        startDate: "2024-01-01",
        endDate: "2024-01-02",
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConventions),
    });

    render(<ConventionList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Test Convention")).toBeInTheDocument();
      expect(screen.getByText("DRAFT")).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Failed to fetch"));

    render(<ConventionList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("No rows")).toBeInTheDocument();
    });
  });

  it("supports pagination", async () => {
    const mockConventions = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      name: `Convention ${i + 1}`,
      status: "DRAFT",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConventions),
    });

    render(<ConventionList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Convention 1")).toBeInTheDocument();
    });

    // Check if pagination controls are present
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
  });

  it("supports row selection", async () => {
    const mockConventions = [
      {
        id: "1",
        name: "Test Convention",
        status: "DRAFT",
        startDate: "2024-01-01",
        endDate: "2024-01-02",
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConventions),
    });

    render(<ConventionList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Test Convention")).toBeInTheDocument();
    });

    // Check if checkbox is present
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });
}); 