import { Suspense } from "react";

import { LoginPage } from "@/core/modules/auth/pages/login-page";

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
