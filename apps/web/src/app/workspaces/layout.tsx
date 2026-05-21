import { WorkspacesShell } from "src/core/modules/organization/components/workspaces-shell";

export default function WorkspacesLayout({ children }: { children: React.ReactNode }) {
  return <WorkspacesShell>{children}</WorkspacesShell>;
}
