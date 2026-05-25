"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "src/core/shared/components/ui/tabs";
import { PLATFORM_ADMIN_NAV_ITEMS } from "./platform-admin-primitives";

function isPlatformAdminTabActive(pathname: string, href: string) {
  if (href === "/workspaces/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformAdminTabs() {
  const pathname = usePathname();
  const activeValue =
    PLATFORM_ADMIN_NAV_ITEMS.find((item) =>
      isPlatformAdminTabActive(pathname, item.href),
    )?.href ?? "/workspaces/admin";

  return (
    <Tabs value={activeValue} className="w-full">
      <TabsList variant="underline">
        {PLATFORM_ADMIN_NAV_ITEMS.map((item) => (
          <TabsTrigger key={item.href} value={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
