"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import {
  useFilesBrowse,
  useFilesBreadcrumb,
} from "src/core/modules/files/hooks/use-files-api";
import {
  createRootFolder,
  mapWorkspaceFile,
  mapWorkspaceFolder,
  toApiFolderId,
} from "src/core/modules/files/utils/files-mapper";
import {
  canCreateFolderIn,
  canUploadTo,
} from "src/core/modules/files/utils/files-rules";

export const useFilesExplorer = (folderId: string) => {
  const t = useTranslations("files");
  const apiFolderId = toApiFolderId(folderId);

  const browse = useFilesBrowse(apiFolderId);
  const breadcrumbQuery = useFilesBreadcrumb(apiFolderId);

  const rootFolder = useMemo(() => createRootFolder(t("rootLabel")), [t]);

  const currentFolder = useMemo(() => {
    if (folderId === rootFolder.id) return rootFolder;
    const active = breadcrumbQuery.data?.at(-1);
    return active ? mapWorkspaceFolder(active) : rootFolder;
  }, [breadcrumbQuery.data, folderId, rootFolder]);

  const breadcrumb = useMemo(() => {
    if (folderId === rootFolder.id) return [rootFolder];
    const trail = (breadcrumbQuery.data ?? []).map(mapWorkspaceFolder);
    return [rootFolder, ...trail];
  }, [breadcrumbQuery.data, folderId, rootFolder]);

  const childFolders = useMemo(
    () =>
      (browse.data?.folders ?? [])
        .map(mapWorkspaceFolder)
        .sort((left, right) => {
          if (left.kind !== right.kind) {
            return left.kind === "system" ? -1 : 1;
          }
          return left.name.localeCompare(right.name, "pt-BR");
        }),
    [browse.data?.folders],
  );

  const folderFiles = useMemo(
    () =>
      (browse.data?.files ?? [])
        .map(mapWorkspaceFile)
        .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    [browse.data?.files],
  );

  const childFoldersWithCounts = useMemo(
    () =>
      childFolders.map((folder) => {
        const apiFolder = browse.data?.folders.find((entry) => entry.id === folder.id);
        return {
          folder,
          itemCount: apiFolder?.fileCount ?? 0,
        };
      }),
    [browse.data?.folders, childFolders],
  );

  const isEmpty = childFolders.length === 0 && folderFiles.length === 0;
  const isLoading = browse.isLoading || (Boolean(apiFolderId) && breadcrumbQuery.isLoading);
  const isError = browse.isError || breadcrumbQuery.isError;

  return {
    currentFolder,
    breadcrumb,
    childFolders,
    childFoldersWithCounts,
    folderFiles,
    isEmpty,
    isLoading,
    isError,
    refetch: browse.refetch,
    permissions: {
      canCreateFolder: canCreateFolderIn(currentFolder),
      canUpload: canUploadTo(currentFolder),
    },
  };
};
