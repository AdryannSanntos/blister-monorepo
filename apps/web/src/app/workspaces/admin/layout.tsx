import { PlatformAdminShell } from "src/core/modules/platform-admin/components/platform-admin-shell";

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformAdminShell>{children}</PlatformAdminShell>;
}
