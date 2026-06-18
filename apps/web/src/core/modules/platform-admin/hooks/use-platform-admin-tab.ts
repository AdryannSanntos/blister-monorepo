"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

export const PLATFORM_ADMIN_TAB_VALUES = [
  "overview",
  "admins",
  "support",
  "agents",
  "ai-catalog",
  "credits",
] as const;

export type PlatformAdminTabValue = (typeof PLATFORM_ADMIN_TAB_VALUES)[number];

export function isPlatformAdminTabValue(
  value: string,
): value is PlatformAdminTabValue {
  return PLATFORM_ADMIN_TAB_VALUES.includes(value as PlatformAdminTabValue);
}

export function usePlatformAdminTab() {
  return useQueryState(
    "tab",
    parseAsStringLiteral(PLATFORM_ADMIN_TAB_VALUES).withDefault("overview"),
  );
}
