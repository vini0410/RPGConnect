/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./use-auth";
import { ReactNode } from "react";
import { User } from "@shared/schema";
import * as queryClientModule from "../lib/queryClient";

// Mock the toast hook
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock the queryClient module. This factory is hoisted.
// We define and create the test client *inside* the factory to avoid reference errors.
vi.mock("../lib/queryClient", async (importOriginal) => {
    const originalModule = await importOriginal<typeof queryClientModule>();
    const testQueryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: Infinity },
            mutations: { retry: false },
        },
    });
    return {
        ...originalModule,
        queryClient: testQueryClient,
    };
});

const mockUser: User = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  password: "hashedpassword",
  createdAt: new Date(), // Use Date object
  updatedAt: new Date(), // Use Date object
};

// The wrapper now uses the mocked queryClient directly from the module
const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClientModule.queryClient}>
        <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
);


describe("useAuth", () => {
  let fetchSpy: vi.SpyInstance;

  beforeEach(() => {
    fetchSpy = vi.spyOn(window, "fetch");
    // Clear mocks and the cache before each test
    vi.clearAllMocks();
    queryClientModule.queryClient.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should show loading state initially and then null user on 401", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  it("should fetch and set user on successful auth check", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockUser), {
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it("should handle login success and update the query cache", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockUser), {
            headers: { "Content-Type": "application/json" }
        })
    );

    act(() => {
      result.current.loginMutation.mutate({
        email: "test@example.com",
        password: "password",
      });
    });

    await waitFor(() => {
      expect(result.current.loginMutation.isSuccess).toBe(true);
      const user = queryClientModule.queryClient.getQueryData<User>(["/api/user"]);
      expect(user).toEqual(mockUser);
    });
  });

   it('should handle login failure and show toast', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 })); 

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const error = new Error("400: Invalid email or password");
    fetchSpy.mockRejectedValueOnce(error);

    act(() => {
        result.current.loginMutation.mutate({ email: 'test@example.com', password: 'wrong' });
    });

    await waitFor(() => {
        expect(result.current.loginMutation.isError).toBe(true);
        expect(mockToast).toHaveBeenCalledWith({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
        });
    });
  });

  it('should handle logout success and clear the user from cache', async () => {
    queryClientModule.queryClient.setQueryData(['/api/user'], mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));

    act(() => {
        result.current.logoutMutation.mutate();
    });

    await waitFor(() => {
        expect(result.current.logoutMutation.isSuccess).toBe(true);
        const user = queryClientModule.queryClient.getQueryData<User>(["/api/user"]);
        expect(user).toBeNull();
    });
  });

   it('should handle user update success and update cache', async () => {
    queryClientModule.queryClient.setQueryData(['/api/user'], mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    const updatedUser = { ...mockUser, name: "Updated Name" };
     fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(updatedUser), {
            headers: { "Content-Type": "application/json" }
        })
    );

    act(() => {
        result.current.updateUserMutation.mutate({ name: "Updated Name" });
    });

    await waitFor(() => {
        expect(result.current.updateUserMutation.isSuccess).toBe(true);
        const user = queryClientModule.queryClient.getQueryData<User>(["/api/user"]);
        expect(user?.name).toBe("Updated Name");
        expect(mockToast).toHaveBeenCalledWith({
            title: "Profile updated",
            description: "Your profile has been successfully updated.",
        });
    });
  });
});
