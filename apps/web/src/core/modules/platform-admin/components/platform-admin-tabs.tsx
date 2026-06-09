"use client";

import { Tabs, TabsList, TabsTrigger } from "src/core/shared/components/ui/tabs";

import {
  isPlatformAdminTabValue,
  usePlatformAdminTab,
} from "../hooks/use-platform-admin-tab";
import { usePlatformAdminNavItems } from "./platform-admin-primitives";

export function PlatformAdminTabs() {
  const [tab, setTab] = usePlatformAdminTab();
  const navItems = usePlatformAdminNavItems();

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (isPlatformAdminTabValue(value)) void setTab(value);
      }}
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
