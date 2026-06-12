"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  AGENT_RUNS_FIXTURE,
  type AgentRunFixture,
} from "../fixtures/agent-runs.fixture";
import { FILES_FIXTURE, FOLDERS_FIXTURE } from "../fixtures/files-tree.fixture";
import { INITIAL_OWNED } from "../fixtures/marketplace-items.fixture";
import { WORKSPACE_SETTINGS_FIXTURE } from "../fixtures/workspace-settings.fixture";
import type { OwnedState } from "../types/marketplace";
import type { FileEntry, FileFolder } from "src/core/modules/files/types/files.types";
import type { WorkspaceSettingsFixture } from "../fixtures/workspace-settings.fixture";
import {
  canCreateFolderIn,
  canDeleteFile,
  canDeleteFolder,
  canRenameFile,
  canRenameFolder,
  resolveUploadFolderId,
} from "src/core/modules/files/utils/files-rules";

type BlisterOsStore = {
  credits: number;
  owned: Record<string, OwnedState>;
  ownedAgentIds: string[];
  settings: WorkspaceSettingsFixture;
  folders: FileFolder[];
  files: FileEntry[];
  editorStyleId: string | null;
  agentRuns: AgentRunFixture[];
  redeemItem: (itemId: string, price: number, agentId?: string) => boolean;
  addAgentRun: (
    input: Omit<AgentRunFixture, "id" | "createdAt"> & { createdAt?: string },
  ) => AgentRunFixture;
  setEditorStyleId: (styleId: string | null) => void;
  updateSettings: (patch: Partial<WorkspaceSettingsFixture>) => void;
  createFolder: (name: string, parentId: string) => boolean;
  renameFolder: (folderId: string, name: string) => boolean;
  deleteFolder: (folderId: string) => boolean;
  addFile: (input: Omit<FileEntry, "id">) => void;
  renameFile: (fileId: string, name: string) => boolean;
  deleteFile: (fileId: string) => boolean;
};

const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useBlisterOsStore = create<BlisterOsStore>()(
  persist(
    (set, get) => ({
      credits: 240,
      owned: { ...INITIAL_OWNED },
      ownedAgentIds: [],
      settings: { ...WORKSPACE_SETTINGS_FIXTURE },
      folders: [...FOLDERS_FIXTURE],
      files: [...FILES_FIXTURE],
      editorStyleId: "es-corte-seco",
      agentRuns: [...AGENT_RUNS_FIXTURE],
      addAgentRun: (input) => {
        const run: AgentRunFixture = {
          ...input,
          id: createId("run"),
          createdAt: input.createdAt ?? new Date().toISOString(),
        };

        set((state) => ({
          agentRuns: [run, ...state.agentRuns],
        }));

        return run;
      },
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
      setEditorStyleId: (styleId) => set({ editorStyleId: styleId }),
      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
      createFolder: (name, parentId) => {
        const state = get();
        const parent = state.folders.find((folder) => folder.id === parentId);
        if (!parent || !canCreateFolderIn(parent)) return false;

        set((current) => ({
          folders: [
            ...current.folders,
            {
              id: createId("folder"),
              name,
              parentId,
              kind: "user" as const,
              systemKey: null,
            },
          ],
        }));

        return true;
      },
      renameFolder: (folderId, name) => {
        const state = get();
        const folder = state.folders.find((entry) => entry.id === folderId);
        if (!folder || !canRenameFolder(folder)) return false;

        set((current) => ({
          folders: current.folders.map((entry) =>
            entry.id === folderId ? { ...entry, name } : entry,
          ),
        }));

        return true;
      },
      deleteFolder: (folderId) => {
        const state = get();
        const folder = state.folders.find((entry) => entry.id === folderId);
        if (!folder || !canDeleteFolder(folder, 
          state.folders.filter((f) => f.parentId === folderId).length +
          state.files.filter((f) => f.folderId === folderId).length
        )) {
          return false;
        }

        set((current) => ({
          folders: current.folders.filter((entry) => entry.id !== folderId),
        }));

        return true;
      },
      addFile: (input) => {
        const state = get();
        const targetFolderId = resolveUploadFolderId(
          input.folderId,
          state.folders,
        );

        set((current) => ({
          files: [
            ...current.files,
            { ...input, folderId: targetFolderId, id: createId("file") },
          ],
        }));
      },
      renameFile: (fileId, name) => {
        const state = get();
        const file = state.files.find((entry) => entry.id === fileId);
        if (!file || !canRenameFile(file)) return false;

        set((current) => ({
          files: current.files.map((entry) =>
            entry.id === fileId ? { ...entry, name } : entry,
          ),
        }));

        return true;
      },
      deleteFile: (fileId) => {
        const state = get();
        const file = state.files.find((entry) => entry.id === fileId);
        if (!file || !canDeleteFile(file)) return false;

        set((current) => ({
          files: current.files.filter((entry) => entry.id !== fileId),
        }));

        return true;
      },
    }),
    { name: "blister:os-store-v2" },
  ),
);

export const useOwnedCount = () =>
  useBlisterOsStore((state) => Object.keys(state.owned).length);

export const useHasAgentEntitlement = (agentId: string) =>
  useBlisterOsStore((state) => state.ownedAgentIds.includes(agentId));
