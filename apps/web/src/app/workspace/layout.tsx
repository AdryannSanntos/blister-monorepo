import { WorkspaceShell } from 'src/core/modules/workspace/components/workspace-shell';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
