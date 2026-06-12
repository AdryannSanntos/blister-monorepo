import { z } from "zod";

export const marketplaceItemTypeSchema = z.enum([
  "edit-style",
  "post-style",
  "pack",
  "template",
  "asset",
  "agent",
]);

export type MarketplaceItemType = z.infer<typeof marketplaceItemTypeSchema>;

export const marketplaceItemSchema = z.object({
  id: z.string(),
  type: marketplaceItemTypeSchema,
  name: z.string(),
  author: z.string(),
  price: z.number(),
  flag: z.enum(["destaque", "novo"]).optional(),
  description: z.string(),
  palette: z.tuple([z.string(), z.string(), z.string()]),
  specs: z
    .object({
      pace: z.string().optional(),
      captions: z.string().optional(),
      transitions: z.string().optional(),
      formats: z.string().optional(),
    })
    .optional(),
  includes: z.array(z.string()).optional(),
  agentId: z.string().optional(),
});

export type MarketplaceItem = z.infer<typeof marketplaceItemSchema>;

export const ownedStateSchema = z.enum(["redeemed", "purchased"]);

export type OwnedState = z.infer<typeof ownedStateSchema>;
