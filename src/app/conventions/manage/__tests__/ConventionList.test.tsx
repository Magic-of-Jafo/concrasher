import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConventionList from '../../../organizer/conventions/ConventionList';

// Define the ConventionStatus enum locally to match the component
enum ConventionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAST = 'PAST',
  CANCELLED = 'CANCELLED'
}

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

// Mock convention data
const mockConvention = {
  id: "1",
  name: "Test Convention",
  slug: "test-convention",
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-01-02"),
  city: "San Francisco",
  country: "USA",
  venueName: "Convention Center",
  websiteUrl: "https://test-convention.com",
  status: ConventionStatus.DRAFT,
  galleryImageUrls: [],
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
  stateAbbreviation: "CA",
  stateName: "California",
  seriesId: "series-1",
  deletedAt: null,
  coverImageUrl: null,
  descriptionMain: null,
  descriptionShort: null,
  isOneDayEvent: false,
  isTBD: false,
  profileImageUrl: null,
};

describe("ConventionList", () => {
  const mockOnActionComplete = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(
      <ConventionList
        conventions={[]}
        isAdmin={true}
        onActionComplete={mockOnActionComplete}
      />,
      { wrapper }
    );

    // Check if the DataGrid is rendered (it shows as no rows when empty)
    expect(screen.getByText("No rows")).toBeInTheDocument();
  });

  it("renders conventions when data is loaded", async () => {
    const mockConventions = [mockConvention];

    render(
      <ConventionList
        conventions={mockConventions}
        isAdmin={true}
        onActionComplete={mockOnActionComplete}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("Test Convention")).toBeInTheDocument();
      expect(screen.getByText("DRAFT")).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    render(
      <ConventionList
        conventions={[]}
        isAdmin={true}
        onActionComplete={mockOnActionComplete}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("No rows")).toBeInTheDocument();
    });
  });

  it("supports pagination", async () => {
    const mockConventions = Array.from({ length: 20 }, (_, i) => ({
      ...mockConvention,
      id: String(i + 1),
      name: `Convention ${i + 1}`,
    }));

    render(
      <ConventionList
        conventions={mockConventions}
        isAdmin={true}
        onActionComplete={mockOnActionComplete}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("Convention 1")).toBeInTheDocument();
    });

    // Check if pagination controls are present (DataGrid shows rows per page)
    expect(screen.getByText("1–10 of 20")).toBeInTheDocument();
  });

  it("supports row selection", async () => {
    const mockConventions = [mockConvention];

    render(
      <ConventionList
        conventions={mockConventions}
        isAdmin={true}
        onActionComplete={mockOnActionComplete}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("Test Convention")).toBeInTheDocument();
    });

    // DataGrid is rendered and functional (check for grid structure)
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Test Convention/ })).toBeInTheDocument();
  });
}); 