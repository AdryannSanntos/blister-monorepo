"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "company-os:active-org";

export function useActiveOrganization() {
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveOrgIdState(stored);
    }
  }, []);

  const setActiveOrgId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveOrgIdState(id);
  }, []);

  const clearActiveOrg = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveOrgIdState(null);
  }, []);

  return { activeOrgId, setActiveOrgId, clearActiveOrg };
}
