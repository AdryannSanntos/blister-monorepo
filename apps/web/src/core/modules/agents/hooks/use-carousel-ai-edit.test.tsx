import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "src/core/shared/utils/api-client";
import { useCarouselAiEdit } from "./use-carousel-ai-edit";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("src/core/shared/utils/api-client", () => ({
  apiClient: { post: vi.fn() },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCarouselAiEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls toast.error when the ai-edit request fails", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useCarouselAiEdit("run-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      slideId: "slide_1",
      mode: "rewrite_text",
      prompt: "Deixar mais direto",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível processar o slide. Tente novamente.",
    );
  });

  it("does not call toast.error on success", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { htmlContent: "<h1>Edited</h1>", cssContent: ".title { color: blue; }" },
    });

    const { result } = renderHook(() => useCarouselAiEdit("run-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      slideId: "slide_1",
      mode: "rewrite_text",
      prompt: "Deixar mais direto",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
