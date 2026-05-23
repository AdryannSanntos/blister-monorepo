"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Toaster } from "@/core/shared/components/ui/sonner";
import { TooltipProvider } from "@/core/shared/components/ui/tooltip";

import { queryClient } from "../utils/query-client";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          <TooltipProvider delayDuration={240}>{children}</TooltipProvider>
          <Toaster position="top-right" closeButton />
        </ThemeProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
