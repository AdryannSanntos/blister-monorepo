import { Suspense } from "react";
import { ServiceUnavailablePage } from "@/core/modules/auth/pages/service-unavailable-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ServiceUnavailablePage />
    </Suspense>
  );
}
