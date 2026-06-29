"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { INITIAL_OWNED } from "../fixtures/marketplace-items.fixture";
import { WORKSPACE_SETTINGS_FIXTURE } from "../fixtures/workspace-settings.fixture";
import type { OwnedState } from "../types/marketplace";
import type { WorkspaceSettingsFixture } from "../fixtures/workspace-settings.fixture";

type BlisterOsStore = {
  credits: number;
  owned: Record<string, OwnedState>;
  ownedAgentIds: string[];
  settings: WorkspaceSettingsFixture;
  redeemItem: (itemId: string, price: number, agentId?: string) => boolean;
  updateSettings: (patch: Partial<WorkspaceSettingsFixture>) => void;
};

export const useBlisterOsStore = create<BlisterOsStore>()(
  persist(
    (set, get) => ({
      credits: 240,
      owned: { ...INITIAL_OWNED },
      ownedAgentIds: [],
      settings: { ...WORKSPACE_SETTINGS_FIXTURE },
      redeemItem: (itemId, price, agentId) => {
        const state = get();
        if (state.owned[itemId]) return false;

        if (price > 0 && state.credits < price) return false;

        set((current) => {
          const owned = {
            ...current.owned,
            [itemId]: price === 0 ? ("redeemed" as const) : ("purchased" as const),
          };
          const ownedAgentIds =
            agentId && !current.ownedAgentIds.includes(agentId)
              ? [...current.ownedAgentIds, agentId]
              : current.ownedAgentIds;

          return {
            owned,
            ownedAgentIds,
            credits: price > 0 ? current.credits - price : current.credits,
          };
        });

        return true;
      },
      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
    }),
    { name: "blister:os-store-v2" },
  ),
);
