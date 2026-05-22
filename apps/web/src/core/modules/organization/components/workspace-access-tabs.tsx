"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "src/core/shared/components/ui/tabs";

const ACCESS_ROUTES = {
  team: "/dashboard/workspace/team",
  permissions: "/dashboard/workspace/permissions",
} as const;

export function WorkspaceAccessTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const value = pathname.startsWith(ACCESS_ROUTES.permissions)
    ? "permissions"
    : "team";

  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => {
        router.push(
          nextValue === "permissions"
            ? ACCESS_ROUTES.permissions
            : ACCESS_ROUTES.team,
        );
      }}
    >
      <TabsList variant="underline">
        <TabsTrigger value="team">Equipe</TabsTrigger>
        <TabsTrigger value="permissions">Permissões</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
