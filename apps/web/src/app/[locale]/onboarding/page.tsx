import { Suspense } from "react";
import { OnboardingPage } from "src/core/modules/onboarding/pages/onboarding-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      }
    >
      <OnboardingPage />
    </Suspense>
  );
}
