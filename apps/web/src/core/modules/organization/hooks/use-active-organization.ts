"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "company-os:active-org";
const COOKIE_KEY = "company-os-active-org";

function readCookieValue(name: string) {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

function writeCookieValue(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function deleteCookieValue(name: string) {
  document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax`;
}

export function useActiveOrganization() {
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? readCookieValue(COOKIE_KEY);
    if (stored) {
      setActiveOrgIdState(stored);
      localStorage.setItem(STORAGE_KEY, stored);
    }

    setIsLoaded(true);
  }, []);

  const setActiveOrgId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    writeCookieValue(COOKIE_KEY, id);
    setActiveOrgIdState(id);
  }, []);

  const clearActiveOrg = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    deleteCookieValue(COOKIE_KEY);
    setActiveOrgIdState(null);
  }, []);

  return { activeOrgId, setActiveOrgId, clearActiveOrg, isLoaded };
}
