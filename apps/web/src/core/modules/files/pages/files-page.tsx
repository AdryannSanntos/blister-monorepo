"use client";

import { FolderPlus, FolderOpen, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsStringEnum, parseAsString, useQueryState } from "nuqs";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { FilesBreadcrumb } from "src/core/modules/files/components/files-breadcrumb";
import { FilesFolderGrid } from "src/core/modules/files/components/files-folder-grid";
import { FilesGridView } from "src/core/modules/files/components/files-grid-view";
import { FilesListView } from "src/core/modules/files/components/files-list-view";
import { FilesNameDialog } from "src/core/modules/files/components/files-name-dialog";
import { FilesUploadDialog } from "src/core/modules/files/components/files-upload-dialog";
import { useFilesExplorer } from "src/core/modules/files/hooks/use-files-explorer";
import {
  useCreateFolder,
  useDeleteFile,
  useDeleteFolder,
  useUpdateFile,
  useUpdateFolder,
  useUploadWorkspaceFile,
} from "src/core/modules/files/hooks/use-files-api";
import type { FileEntry, FileFolder } from "src/core/modules/files/types/files.types";
import { toApiFolderId } from "src/core/modules/files/utils/files-mapper";
import {
  canCreateFolderIn,
  canUploadTo,
} from "src/core/modules/files/utils/files-rules";
import { BlisterChipRow } from "src/core/shared/components/blister/blister-chip-row";
import { Button } from "src/core/shared/components/ui/button";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type DialogTarget =
  | { type: "folder"; item: FileFolder }
  | { type: "file"; item: FileEntry }
  | null;

const viewOptions = [
  { id: "list", label: "list" },
  { id: "grid", label: "grid" },
] as const;

export const FilesPage = () => {
  const t = useTranslations("files");

  const [folderId, setFolderId] = useQueryState(
    "folderId",
    parseAsString.withDefault("root"),
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum(["grid", "list"]).withDefault("list"),
  );

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [extractOnUpload, setExtractOnUpload] = useState(true);
  const [renameTarget, setRenameTarget] = useState<DialogTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<DialogTarget>(null);

  const createFolder = useCreateFolder();
  const uploadFile = useUploadWorkspaceFile();
  const updateFile = useUpdateFile();
  const deleteFileMutation = useDeleteFile();
  const updateFolder = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();

  const {
    currentFolder,
    breadcrumb,
    childFoldersWithCounts,
    folderFiles,
    isEmpty,
    isLoading,
    isError,
    refetch,
    permissions,
  } = useFilesExplorer(folderId);

  const handleNavigate = useCallback(
    (nextFolderId: string) => {
      void setFolderId(nextFolderId);
    },
    [setFolderId],
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!canUploadTo(currentFolder)) {
        toast.error(t("cannotUploadHere"));
        return;
      }

      try {
        await uploadFile.mutateAsync({
          file,
          folderId: toApiFolderId(folderId),
          extractData: extractOnUpload,
        });
        toast.success(t("uploadSuccess", { name: file.name }));
      } catch (error) {
        const message =
          error instanceof Error && error.message === "FILE_TOO_LARGE"
            ? t("fileTooLarge")
            : error instanceof Error
              ? error.message
              : t("uploadFailed");
        toast.error(message);
      }
    },
    [currentFolder, extractOnUpload, folderId, t, uploadFile],
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!canCreateFolderIn(currentFolder)) {
        toast.error(t("cannotCreateFolderHere"));
        return;
      }

      try {
        await createFolder.mutateAsync({
          name,
          parentId: toApiFolderId(folderId),
        });
        toast.success(t("createFolderSuccess", { name }));
      } catch {
        toast.error(t("createFolderFailed"));
      }
    },
    [createFolder, currentFolder, folderId, t],
  );

  const handleRename = useCallback(
    async (name: string) => {
      if (!renameTarget) return;

      if (renameTarget.type === "folder") {
        try {
          await updateFolder.mutateAsync({ id: renameTarget.item.id, name });
          toast.success(t("renameFolderSuccess", { name }));
        } catch {
          toast.error(t("cannotRenameFolder"));
        }
        return;
      }

      try {
        await updateFile.mutateAsync({ id: renameTarget.item.id, name });
        toast.success(t("renameFileSuccess", { name }));
      } catch {
        toast.error(t("cannotRenameFile"));
      }
    },
    [renameTarget, t, updateFile, updateFolder],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "folder") {
      try {
        await deleteFolderMutation.mutateAsync(deleteTarget.item.id);
        toast.success(t("deleteFolderSuccess", { name: deleteTarget.item.name }));
      } catch {
        toast.error(t("cannotDeleteFolder"));
      }
      return;
    }

    try {
      await deleteFileMutation.mutateAsync(deleteTarget.item.id);
      toast.success(t("deleteFileSuccess", { name: deleteTarget.item.name }));
    } catch {
      toast.error(t("cannotDeleteFile"));
    }
  }, [deleteFileMutation, deleteFolderMutation, deleteTarget, t]);

  const renameDialogTitle =
    renameTarget?.type === "folder"
      ? t("renameFolderTitle")
      : t("renameFileTitle");
  const renameDialogInitialValue = renameTarget?.item.name ?? "";

  const deleteDialogTitle =
    deleteTarget?.type === "folder"
      ? t("deleteFolderTitle")
      : t("deleteFileTitle");
  const deleteDialogDescription =
    deleteTarget?.type === "folder"
      ? t("deleteFolderDescription", { name: deleteTarget.item.name })
      : t("deleteFileDescription", {
          name: deleteTarget?.type === "file" ? deleteTarget.item.name : "",
        });

  return (
    <div data-testid="files-page">
      <PageLayout
        icon={FolderOpen}
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BlisterChipRow
              ariaLabel={t("viewAria")}
              value={view}
              onChange={(value) => void setView(value as "grid" | "list")}
              options={viewOptions.map((option) => ({
                id: option.id,
                label: option.id === "grid" ? t("viewGrid") : t("viewList"),
              }))}
            />
            <Button
              variant="outline"
              disabled={!permissions.canCreateFolder || createFolder.isPending}
              onClick={() => setIsCreateFolderOpen(true)}
            >
              <FolderPlus className="size-4" />
              {t("newFolder")}
            </Button>
            <Button
              disabled={!permissions.canUpload || uploadFile.isPending}
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload className="size-4" />
              {t("upload")}
            </Button>
          </div>
        }
      >
        <FilesBreadcrumb
          trail={breadcrumb}
          activeFolderId={folderId}
          onNavigate={handleNavigate}
        />

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="size-5 animate-spin text-[var(--accent-primary)]" aria-hidden />
            <Paragraph tone="tertiary">{t("loading")}</Paragraph>
          </div>
        ) : null}

        {isError ? (
          <EmptyState
            icon={FolderOpen}
            title={t("loadErrorTitle")}
            description={t("loadErrorDescription")}
            action={
              <Button variant="outline" onClick={() => void refetch()}>
                {t("retry")}
              </Button>
            }
          />
        ) : null}

        {!isLoading && !isError ? (
          <div className="flex flex-col gap-6">
            <FilesFolderGrid
              folders={childFoldersWithCounts}
              onOpen={handleNavigate}
              onRename={(folder) => setRenameTarget({ type: "folder", item: folder })}
              onDelete={(folder) => setDeleteTarget({ type: "folder", item: folder })}
            />

            {view === "list" ? (
              <FilesListView
                files={folderFiles}
                onRename={(file) => setRenameTarget({ type: "file", item: file })}
                onDelete={(file) => setDeleteTarget({ type: "file", item: file })}
              />
            ) : (
              <FilesGridView
                files={folderFiles}
                onRename={(file) => setRenameTarget({ type: "file", item: file })}
                onDelete={(file) => setDeleteTarget({ type: "file", item: file })}
              />
            )}

            {isEmpty ? (
              <EmptyState
                icon={FolderOpen}
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                action={
                  permissions.canUpload ? (
                    <Button onClick={() => setIsUploadOpen(true)}>
                      <Upload className="size-4" />
                      {t("upload")}
                    </Button>
                  ) : undefined
                }
              />
            ) : null}
          </div>
        ) : null}
      </PageLayout>

      <FilesNameDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        title={t("newFolder")}
        placeholder={t("folderNamePlaceholder")}
        confirmLabel={t("create")}
        onConfirm={handleCreateFolder}
      />

      <FilesNameDialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        title={renameDialogTitle}
        initialValue={renameDialogInitialValue}
        placeholder={t("namePlaceholder")}
        confirmLabel={t("save")}
        onConfirm={handleRename}
      />

      <FilesUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        extractOnUpload={extractOnUpload}
        onExtractChange={setExtractOnUpload}
        onFileSelect={(file) => void handleUploadFile(file)}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteDialogTitle}
        description={deleteDialogDescription}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        destructive
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};
