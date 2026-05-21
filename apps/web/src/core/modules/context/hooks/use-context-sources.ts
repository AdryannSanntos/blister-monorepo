import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from 'src/core/shared/utils/api-client';

export type ContextSourceKind = 'file' | 'url' | 'manual';

export type ContextPipelineStatus =
  | 'pending'
  | 'ingesting'
  | 'extracting'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'error';

export type ContextSource = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  sourceKind: ContextSourceKind;
  sourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  objectKey: string | null;
  publicUrl: string | null;
  pipelineStatus: ContextPipelineStatus;
  pipelineError: string | null;
  extractedContent: string | null;
  normalizedContent: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  tags: string[];
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContextArtifact = {
  id: string;
  organizationId: string;
  objectKey: string | null;
  publicUrl: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncedAt: string | null;
  syncError: string | null;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
} | null;

export type ListContextFilters = {
  search?: string;
  status?: ContextPipelineStatus;
  sourceKind?: ContextSourceKind;
  category?: string;
};

export type CreateContextSourceInput = {
  title: string;
  description?: string;
  sourceKind: ContextSourceKind;
  sourceUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  objectKey?: string;
  publicUrl?: string;
  tags?: string[];
  category?: string;
};

export type ReviewContextSourceInput = {
  decision: 'approve' | 'reject';
  reviewNotes?: string;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useContextSources(orgId: string | null, filters?: ListContextFilters) {
  return useQuery<ContextSource[]>({
    queryKey: ['context-sources', orgId, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ContextSource[]>(`/organizations/${orgId}/context`, {
        params: filters,
      });
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useContextSource(orgId: string | null, sourceId: string | null) {
  return useQuery<ContextSource>({
    queryKey: ['context-source', orgId, sourceId],
    queryFn: async () => {
      const { data } = await apiClient.get<ContextSource>(
        `/organizations/${orgId}/context/${sourceId}`,
      );
      return data;
    },
    enabled: Boolean(orgId) && Boolean(sourceId),
  });
}

export function useContextArtifact(orgId: string | null) {
  return useQuery<ContextArtifact>({
    queryKey: ['context-artifact', orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<ContextArtifact>(
        `/organizations/${orgId}/context/artifact`,
      );
      return data;
    },
    enabled: Boolean(orgId),
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.syncStatus === 'syncing' ? 3000 : false;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateContextUploadUrl(orgId: string | null) {
  return useMutation({
    mutationFn: async (input: { fileName: string; contentType: string; size: number }) => {
      const { data } = await apiClient.post<{
        uploadUrl: string;
        objectKey: string;
        publicUrl?: string;
      }>(`/organizations/${orgId}/context/upload-url`, input);
      return data;
    },
  });
}

export function useCreateContextSource(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateContextSourceInput) => {
      const { data } = await apiClient.post<ContextSource>(
        `/organizations/${orgId}/context`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-sources', orgId] });
      toast.success('Fonte adicionada — iniciando pipeline de ingestão');
    },
    onError: () => toast.error('Erro ao adicionar fonte de contexto'),
  });
}

export function useUpdateContextSource(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceId,
      ...dto
    }: Partial<CreateContextSourceInput> & { sourceId: string }) => {
      const { data } = await apiClient.patch<ContextSource>(
        `/organizations/${orgId}/context/${sourceId}`,
        dto,
      );
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['context-sources', orgId] });
      queryClient.invalidateQueries({ queryKey: ['context-source', orgId, result.id] });
      toast.success('Fonte atualizada');
    },
    onError: () => toast.error('Erro ao atualizar fonte'),
  });
}

export function useReviewContextSource(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceId,
      ...input
    }: ReviewContextSourceInput & { sourceId: string }) => {
      const { data } = await apiClient.post<ContextSource>(
        `/organizations/${orgId}/context/${sourceId}/review`,
        input,
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['context-sources', orgId] });
      queryClient.invalidateQueries({ queryKey: ['context-source', orgId, data.id] });
      queryClient.invalidateQueries({ queryKey: ['context-artifact', orgId] });
      const label = data.pipelineStatus === 'approved' ? 'aprovada' : 'rejeitada';
      toast.success(`Fonte ${label}`);
    },
    onError: () => toast.error('Erro na revisão'),
  });
}

export function useDeleteContextSource(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string) => {
      await apiClient.delete(`/organizations/${orgId}/context/${sourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-sources', orgId] });
      toast.success('Fonte removida');
    },
    onError: () => toast.error('Erro ao remover fonte'),
  });
}

export function useSyncContextArtifact(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ContextArtifact>(
        `/organizations/${orgId}/context/artifact/sync`,
        {},
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-artifact', orgId] });
      toast.success('Sincronização do artefato iniciada');
    },
    onError: () => toast.error('Erro ao iniciar sincronização'),
  });
}
