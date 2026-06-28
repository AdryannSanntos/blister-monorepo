"use client";

import type { ReactNode } from "react";

import { AuthGuard } from "src/core/shared/components/auth-guard";
import { OnboardingProfileModal } from "src/core/modules/onboarding/components/onboarding-profile-modal";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      {children}
      <OnboardingProfileModal />
    </AuthGuard>
  );
}
