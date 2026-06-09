"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { CreditSummary } from "@company-os/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useCredits() {
  return useQuery<CreditSummary>({
    queryKey: ["credits"],
    queryFn: async () => {
      const { data } = await axios.get<CreditSummary>(
        `${API}/api/company/credits`,
        { withCredentials: true },
      );
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
