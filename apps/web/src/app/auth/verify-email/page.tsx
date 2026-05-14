import { Suspense } from "react";

import { VerifyEmailPage } from "@/core/modules/auth/pages/verify-email-page";

export default function Page() {
  return (
    <Suspense>
      <VerifyEmailPage />
    </Suspense>
  );
}
