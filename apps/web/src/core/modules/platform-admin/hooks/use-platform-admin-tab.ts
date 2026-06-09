"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

export const PLATFORM_ADMIN_TAB_VALUES = [
  "overview",
  "admins",
  "support",
  "ai-catalog",
  "rag",
  "credits",
] as const;

export type PlatformAdminTabValue = (typeof PLATFORM_ADMIN_TAB_VALUES)[number];

export function usePlatformAdminTab() {
  return useQueryState(
    "tab",
    parseAsStringLiteral(PLATFORM_ADMIN_TAB_VALUES).withDefault("overview"),
  );
}
