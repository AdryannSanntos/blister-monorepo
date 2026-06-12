import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateFolderDto,
  CreateProjectDto,
  FileBrowseResponse,
  FileUploadResponse,
  PresignedUploadRequest,
  PresignedUploadResponse,
  ProjectDto,
  UpdateProjectDto,
  WorkspaceFileDto,
  WorkspaceFolderDto,
} from "@company-os/types";
import { MAX_PRESIGNED_UPLOAD_BYTES } from "@company-os/types";
import { apiClient } from "src/core/shared/utils/api-client";

const filesKeys = {
  all: ["files"] as const,
  browse: (folderId?: string) => [...filesKeys.all, "browse", folderId ?? "root"] as const,
  breadcrumb: (folderId: string) => [...filesKeys.all, "breadcrumb", folderId] as const,
};

export function useFilesBrowse(folderId?: string) {
  return useQuery({
    queryKey: filesKeys.browse(folderId),
    queryFn: async () => {
      const { data } = await apiClient.get<FileBrowseResponse>("/files/browse", {
        params: folderId ? { folderId } : undefined,
      });
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
      name: string;
      mimeType: string;
      storageKey: string;
      sizeBytes?: number;
      extractData?: boolean;
    }) => {
      const { data } = await apiClient.post<WorkspaceFileDto>("/files/upload", payload);
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

const sanitizeUploadKeyHint = (fileName: string) =>
  `uploads/${Date.now()}-${fileName.replace(/[^\w.-]+/g, "_")}`;

export type UploadWorkspaceFileInput = {
  file: File;
  folderId?: string;
  extractData?: boolean;
};

/** Uploads a file through the API (avoids S3 CORS), registers it in Files. */
export function useUploadWorkspaceFile() {
  const registerUpload = useRegisterFileUpload();

  return useMutation({
    mutationFn: async ({
      file,
      folderId,
      extractData = true,
    }: UploadWorkspaceFileInput) => {
      if (file.size > MAX_PRESIGNED_UPLOAD_BYTES) {
        throw new Error("FILE_TOO_LARGE");
      }

      const mimeType = file.type || "application/octet-stream";
      const keyHint = sanitizeUploadKeyHint(file.name);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("keyHint", keyHint);

      const { data } = await apiClient.post<FileUploadResponse>(
        "/storage/object-upload",
        formData,
        {
          headers: { "Content-Type": undefined },
        },
      );

      return registerUpload.mutateAsync({
        name: file.name,
        mimeType,
        storageKey: data.key,
        sizeBytes: file.size,
        folderId,
        extractData,
      });
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await apiClient.patch<WorkspaceFileDto>(`/files/${id}`, { name });
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

export function useUploadsFolderId() {
  const browse = useFilesBrowse(undefined);

  const uploadsFolderId = browse.data?.folders.find(
    (folder) => folder.systemKey === "uploads",
  )?.id;

  return {
    uploadsFolderId,
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
