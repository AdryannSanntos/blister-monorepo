"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CampaignStatus = "ACTIVE" | "ARCHIVED";

export type LocalCampaign = {
  id: string;
  name: string;
  objective: string;
  context?: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
};

type CampaignStore = {
  campaigns: LocalCampaign[];
  createCampaign: (input: { name: string; objective: string; context?: string }) => LocalCampaign;
  updateCampaign: (
    id: string,
    input: Partial<Pick<LocalCampaign, "name" | "objective" | "context" | "status">>,
  ) => void;
  deleteCampaign: (id: string) => void;
};

function createCampaignId() {
  return `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set) => ({
      campaigns: [],
      createCampaign: (input) => {
        const now = new Date().toISOString();
        const campaign: LocalCampaign = {
          id: createCampaignId(),
          name: input.name,
          objective: input.objective,
          context: input.context,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          campaigns: [campaign, ...state.campaigns],
        }));

        return campaign;
      },
      updateCampaign: (id, input) => {
        set((state) => ({
          campaigns: state.campaigns.map((campaign) =>
            campaign.id === id
              ? { ...campaign, ...input, updatedAt: new Date().toISOString() }
              : campaign,
          ),
        }));
      },
      deleteCampaign: (id) => {
        set((state) => ({
          campaigns: state.campaigns.filter((campaign) => campaign.id !== id),
        }));
      },
    }),
    {
      name: "blister:campaigns",
    },
  ),
);

export function useCampaigns() {
  const campaigns = useCampaignStore((state) => state.campaigns);
  const createCampaign = useCampaignStore((state) => state.createCampaign);
  const updateCampaign = useCampaignStore((state) => state.updateCampaign);
  const deleteCampaign = useCampaignStore((state) => state.deleteCampaign);

  return {
    campaigns: campaigns.filter((campaign) => campaign.status === "ACTIVE"),
    allCampaigns: campaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
