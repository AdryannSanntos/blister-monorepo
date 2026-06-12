"use client";

import { marketplaceItemSchema } from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "src/core/shared/utils/api-client";

const entitlementsResponseSchema = z.array(marketplaceItemSchema);

export const captionStylesQueryKey = ["caption-styles"] as const;

export const useCaptionStyles = () =>
  useQuery({
    queryKey: captionStylesQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get("/marketplace/entitlements", {
        params: { type: "caption-style" },
      });
      return entitlementsResponseSchema.parse(data);
    },
  });
