/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateTableModal } from "./create-table-modal";
import { ReactNode } from "react";

// Mock the toast hook
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CreateTableModal", () => {
  let user: UserEvent;
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  it("renders the modal with form fields when open", () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreateTableModal open={true} onOpenChange={onOpenChange} />
      </Wrapper>
    );

    expect(screen.getByText("Create New Table")).toBeInTheDocument();
    expect(screen.getByLabelText("Table Title")).toBeInTheDocument();
    expect(screen.getByText("Select a rulebook")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Table" })).toBeInTheDocument();
  });

  it("shows validation errors when submitting an empty form", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreateTableModal open={true} onOpenChange={onOpenChange} />
      </Wrapper>
    );

    const createButton = screen.getByRole("button", { name: "Create Table" });
    await user.click(createButton);

    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
    expect(await screen.findByText("Rulebook is required.")).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("submits the form successfully and calls onOpenChange", async () => {
    const Wrapper = createWrapper();
    const mockApiResponse = { id: 'table-123', accessCode: 'ABCDE' };
    
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockApiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
    }));

    render(
      <Wrapper>
        <CreateTableModal open={true} onOpenChange={onOpenChange} />
      </Wrapper>
    );

    await user.type(screen.getByLabelText("Table Title"), "My Test Table");
    
    // Open the select and click an option
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "D&D 5th Edition" }));

    await user.click(screen.getByRole("button", { name: "Create Table" }));

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: "Table created successfully!",
        }));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

   it("shows an error toast if the API call fails", async () => {
    const Wrapper = createWrapper();
    const errorMessage = "Server is on fire";
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(new Response(errorMessage, {
        status: 500,
    }));

    render(
      <Wrapper>
        <CreateTableModal open={true} onOpenChange={onOpenChange} />
      </Wrapper>
    );

    await user.type(screen.getByLabelText("Table Title"), "Another Table");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Pathfinder" }));
    await user.click(screen.getByRole("button", { name: "Create Table" }));

     await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: "Failed to create table",
            variant: "destructive",
        }));
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
