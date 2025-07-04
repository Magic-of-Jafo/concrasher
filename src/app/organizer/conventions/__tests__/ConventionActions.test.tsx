import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from 'next/navigation';
import ConventionActions, { ConventionActionsProps } from "../ConventionActions";
import { ConventionStatus, Convention } from "@prisma/client";

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

global.fetch = jest.fn();

const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
};
(useRouter as jest.Mock).mockReturnValue(mockRouter);

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const renderWithProviders = (ui: React.ReactElement) => {
    const testQueryClient = createTestQueryClient();
    return render(
        <QueryClientProvider client={testQueryClient}>
            {ui}
        </QueryClientProvider>
    );
};

const mockConvention: Convention = {
    id: 'convention-123',
    name: 'TestCon',
    status: ConventionStatus.DRAFT,
    slug: 'testcon',
    startDate: new Date(),
    endDate: new Date(),
    descriptionShort: 'A test convention',
    descriptionMain: 'A long description for a test convention.',
    isOneDayEvent: false,
    isTBD: false,
    city: 'Test City',
    stateAbbreviation: 'TS',
    stateName: 'Test State',
    country: 'Testland',
    timezone: 'America/New_York',
    websiteUrl: 'http://testcon.com',
    coverImageUrl: null,
    profileImageUrl: null,
    venueName: 'Test Venue',
    guestsStayAtPrimaryVenue: false,
    seriesId: 'series-456',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
};


describe("ConventionActions", () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        mockRouter.push.mockClear();
    });

    it("renders action buttons", () => {
        renderWithProviders(<ConventionActions convention={mockConvention} />);
        expect(screen.getByRole("button", { name: /convention actions/i })).toBeInTheDocument();
    });

    it("shows all menu items when button is clicked", () => {
        renderWithProviders(<ConventionActions convention={mockConvention} />);
        fireEvent.click(screen.getByRole("button", { name: /convention actions/i }));
        expect(screen.getByText("View")).toBeInTheDocument();
        expect(screen.getByText("Edit")).toBeInTheDocument();
        expect(screen.getByText("Duplicate")).toBeInTheDocument();
        expect(screen.getByText(/Delete/)).toBeInTheDocument();
        expect(screen.getByText("Change Status")).toBeInTheDocument();
    });

    it("handles edit action", () => {
        renderWithProviders(<ConventionActions convention={mockConvention} />);
        fireEvent.click(screen.getByRole("button", { name: /convention actions/i }));
        fireEvent.click(screen.getByText("Edit"));
        expect(mockRouter.push).toHaveBeenCalledWith(`/organizer/conventions/${mockConvention.id}/edit`);
    });

    it("handles delete action and shows success", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ message: "Convention deleted successfully" }),
        });
        const onActionComplete = jest.fn();
        renderWithProviders(<ConventionActions convention={mockConvention} onConventionUpdated={onActionComplete} />);

        fireEvent.click(screen.getByRole("button", { name: /convention actions/i }));
        fireEvent.click(screen.getByText(/Delete/));

        expect(await screen.findByText(/move to trash\?/i)).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to move/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /move to trash/i }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `/api/organizer/conventions/${mockConvention.id}`,
                { method: 'DELETE' }
            );
        });

        expect(await screen.findByText(/convention moved to trash/i)).toBeInTheDocument();
        expect(onActionComplete).toHaveBeenCalled();
    });

    it("handles duplicate action", async () => {
        const duplicatedConventionId = 'duplicated-123';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ id: duplicatedConventionId }),
        });

        renderWithProviders(<ConventionActions convention={mockConvention} />);
        fireEvent.click(screen.getByRole("button", { name: /convention actions/i }));
        fireEvent.click(screen.getByText("Duplicate"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `/api/conventions/${mockConvention.id}/duplicate`,
                { method: 'POST' }
            );
        });

        expect(await screen.findByText(/convention duplicated successfully/i)).toBeInTheDocument();
        expect(mockRouter.push).toHaveBeenCalledWith(`/organizer/conventions/${duplicatedConventionId}/edit`);
    });

    it("handles status change", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
        const onActionComplete = jest.fn();
        renderWithProviders(<ConventionActions convention={mockConvention} onConventionUpdated={onActionComplete} />);

        fireEvent.click(screen.getByRole("button", { name: /convention actions/i }));
        fireEvent.click(screen.getByText("Change Status"));

        expect(await screen.findByRole('heading', { name: /change convention status/i })).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByRole('combobox'));
        fireEvent.click(await screen.findByRole('option', { name: 'PUBLISHED' }));

        fireEvent.click(screen.getByRole("button", { name: "Update Status" }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `/api/organizer/conventions/${mockConvention.id}`,
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({ status: ConventionStatus.PUBLISHED }),
                })
            );
        });

        expect(await screen.findByText(/convention status updated successfully/i)).toBeInTheDocument();
        expect(onActionComplete).toHaveBeenCalled();
    });

    it("shows error message when action fails", async () => {
        const errorMessage = "This is a test failure";
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ message: errorMessage }),
        });

        renderWithProviders(<ConventionActions convention={mockConvention} />);
        fireEvent.click(screen.getByRole("button", { name: /convention actions/i }));
        fireEvent.click(screen.getByText(/Delete/));

        fireEvent.click(await screen.findByRole('button', { name: /move to trash/i }));

        expect(await screen.findByText(errorMessage)).toBeInTheDocument();
        expect(screen.queryByText(/convention moved to trash/i)).not.toBeInTheDocument();
    });
}); 