import { Suspense } from "react";

import { ResetPasswordPage } from "@/core/modules/auth/pages/reset-password-page";

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
