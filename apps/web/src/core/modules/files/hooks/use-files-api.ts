import type {
  CreateFolderDto,
  CreateProjectDto,
  FileBrowseResponse,
  FilePresignedUploadResponse,
  PresignedUploadRequest,
  PresignedUploadResponse,
  ProjectDto,
  UpdateFolderDto,
  UpdateProjectDto,
  WorkspaceFileDto,
  WorkspaceFolderDto,
} from "@company-os/types";
import { MAX_PRESIGNED_UPLOAD_BYTES } from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const filesKeys = {
  all: ["files"] as const,
  browse: (folderId?: string) =>
    [...filesKeys.all, "browse", folderId ?? "root"] as const,
  breadcrumb: (folderId: string) =>
    [...filesKeys.all, "breadcrumb", folderId] as const,
};

export function useFilesBrowse(folderId?: string) {
  return useQuery({
    queryKey: filesKeys.browse(folderId),
    queryFn: async () => {
      const { data } = await apiClient.get<FileBrowseResponse>(
        "/files/browse",
        {
          params: folderId ? { folderId } : undefined,
        },
      );
      return data;
    },
  });
}

export function useFilesBreadcrumb(folderId: string | undefined) {
  return useQuery({
    queryKey: filesKeys.breadcrumb(folderId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<WorkspaceFolderDto[]>(
        `/files/breadcrumb/${folderId}`,
      );
      return data;
    },
    enabled: Boolean(folderId),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateFolderDto) => {
      const { data } = await apiClient.post("/files/folders", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
  });
}

export function useRegisterFileUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      folderId?: string;
      agentId?: string;
      name: string;
      mimeType: string;
      storageKey: string;
      sizeBytes?: number;
      extractData?: boolean;
    }) => {
      const { data } = await apiClient.post<WorkspaceFileDto>(
        "/files/upload",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
  });
}

export function usePresignedUpload() {
  return useMutation<PresignedUploadResponse, Error, PresignedUploadRequest>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<PresignedUploadResponse>(
        "/storage/presigned-upload",
        dto,
      );
      return data;
    },
  });
}

export type UploadWorkspaceFileInput = {
  file: File;
  /** Destination user folder. When omitted the API uses the "Uploads" folder. */
  folderId?: string;
  extractData?: boolean;
  /** Called with the upload percentage (0-100) as bytes stream to S3. */
  onProgress?: (percent: number) => void;
};

/**
 * PUTs a file straight to S3 through a presigned URL, reporting progress.
 * Uses XMLHttpRequest (not the API client) so no auth headers leak to S3 and
 * upload progress events are available.
 */
function putToPresignedUrl(
  url: string,
  file: File,
  mimeType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", mimeType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`S3_UPLOAD_FAILED_${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("S3_UPLOAD_FAILED"));
    xhr.send(file);
  });
}

/**
 * Uploads a file directly to S3 from the browser via a presigned URL — the
 * bytes never touch the API (suited for heavy video files) — then registers
 * the file's metadata in Files.
 */
export function useUploadWorkspaceFile() {
  const registerUpload = useRegisterFileUpload();

  return useMutation({
    mutationFn: async ({
      file,
      folderId,
      extractData = true,
      onProgress,
    }: UploadWorkspaceFileInput) => {
      if (file.size > MAX_PRESIGNED_UPLOAD_BYTES) {
        throw new Error("FILE_TOO_LARGE");
      }

      const mimeType = file.type || "application/octet-stream";

      // The API resolves an S3 key that mirrors the destination folder in the
      // Files tree and reserves a collision-free name for this upload.
      const { data: presigned } =
        await apiClient.post<FilePresignedUploadResponse>(
          "/files/presigned-upload",
          {
            name: file.name,
            mimeType,
            sizeBytes: file.size,
            folderId,
          },
        );

      await putToPresignedUrl(presigned.url, file, mimeType, onProgress);

      return registerUpload.mutateAsync({
        name: presigned.name,
        mimeType,
        storageKey: presigned.key,
        sizeBytes: file.size,
        folderId: presigned.folderId,
        extractData,
      });
    },
  });
}

export type FilePreviewResponse = {
  url: string;
  file: WorkspaceFileDto;
};

/** Resolves a presigned download URL for an existing workspace file. */
export function useFilePreviewUrl(fileId: string | null, enabled = true) {
  return useQuery({
    queryKey: [...filesKeys.all, "preview", fileId ?? ""],
    queryFn: async () => {
      const { data } = await apiClient.get<FilePreviewResponse>(
        `/files/${fileId}/preview`,
      );
      return data;
    },
    enabled: Boolean(fileId) && enabled,
    staleTime: 4 * 60 * 1000,
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await apiClient.patch<WorkspaceFileDto>(`/files/${id}`, {
        name,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateFolderDto & { id: string }) => {
      const { data } = await apiClient.patch<WorkspaceFolderDto>(
        `/files/folders/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/files/folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
  });
}

export function useAgentFolderId(agentId: string) {
  const browse = useFilesBrowse(undefined);

  const agentFolderId = browse.data?.folders.find(
    (folder) => folder.systemKey === `agent:${agentId}`,
  )?.id;

  return {
    agentFolderId,
    isLoading: browse.isLoading,
  };
}

const projectsKeys = {
  all: ["projects"] as const,
  list: () => [...projectsKeys.all, "list"] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectsKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectDto[]>("/projects");
      return data;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProjectDto) => {
      const { data } = await apiClient.post<ProjectDto>("/projects", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: UpdateProjectDto & { id: string }) => {
      const { data } = await apiClient.patch<ProjectDto>(
        `/projects/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}
