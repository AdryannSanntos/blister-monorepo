import { Suspense } from "react";

import { AcceptInvitePage } from "src/core/modules/organization/pages/accept-invite-page";

export default function Page() {
  return (
    <Suspense>
      <AcceptInvitePage />
    </Suspense>
  );
}
