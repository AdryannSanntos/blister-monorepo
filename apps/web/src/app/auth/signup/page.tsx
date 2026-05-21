import { Suspense } from "react";

import { SignupPage } from "@/core/modules/auth/pages/signup-page";

export default function Page() {
  return (
    <Suspense>
      <SignupPage />
    </Suspense>
  );
}
