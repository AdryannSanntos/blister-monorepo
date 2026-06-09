"use client";

import { Tabs, TabsList, TabsTrigger } from "src/core/shared/components/ui/tabs";

import { usePlatformAdminNavItems } from "./platform-admin-primitives";
import { usePlatformAdminTab } from "../hooks/use-platform-admin-tab";

export function PlatformAdminTabs() {
  const [tab, setTab] = usePlatformAdminTab();
  const navItems = usePlatformAdminNavItems();

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => void setTab(value)}
      className="w-full"
    >
      <TabsList variant="pill" className="flex-wrap justify-start">
        {navItems.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
