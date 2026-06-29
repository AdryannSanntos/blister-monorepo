"use client";

import type { ReactNode } from "react";

import { EnsureActiveWorkspace } from "src/core/modules/workspaces/components/ensure-active-workspace";
import { OnboardingProfileModal } from "src/core/modules/onboarding/components/onboarding-profile-modal";
import { AuthGuard } from "src/core/shared/components/auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <EnsureActiveWorkspace />
      {children}
      <OnboardingProfileModal />
    </AuthGuard>
  );
}
