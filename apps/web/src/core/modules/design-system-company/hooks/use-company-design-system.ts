import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from 'src/core/shared/utils/api-client';

export type DesignArtifactSyncStatus = 'idle' | 'pending' | 'synced' | 'failed';
export type DesignAssetRole =
  | 'logo'
  | 'logo-variation'
  | 'brand-guideline'
  | 'color-reference'
  | 'typography-reference'
  | 'visual-reference'
  | 'campaign-reference'
  | 'product-visual'
  | 'iconography'
  | 'template'
  | 'context-reference'
  | 'other';

export type DesignColorToken = {
  id: string;
  colorGroupId: string;
  name: string;
  value: string;
  displayFormat: string;
  semanticRole: string;
  usageNote: string | null;
  restrictionNote: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DesignColorGroup = {
  id: string;
  designSystemId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  colors: DesignColorToken[];
  createdAt: string;
  updatedAt: string;
};

export type DesignAsset = {
  id: string;
  designSystemId: string;
  organizationId: string;
  primaryRole: DesignAssetRole;
  secondaryTags: string[];
  title: string | null;
  description: string | null;
  objectKey: string;
  publicUrl: string | null;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export type CompanyDesignSystem = {
  id: string;
  organizationId: string;
  brandEssence: string | null;
  desiredPerception: string | null;
  visualStyle: string | null;
  antiPatterns: string | null;
  conceptualReferences: string | null;
  aiNotes: string | null;
  artifactSyncStatus: DesignArtifactSyncStatus;
  artifactSyncedAt: string | null;
  artifactSyncError: string | null;
  artifactObjectKey: string | null;
  colorGroups: DesignColorGroup[];
  assets: DesignAsset[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateDesignIdentityPayload = Partial<
  Pick<
    CompanyDesignSystem,
    | 'brandEssence'
    | 'desiredPerception'
    | 'visualStyle'
    | 'antiPatterns'
    | 'conceptualReferences'
    | 'aiNotes'
  >
>;

export type UpsertColorGroupPayload = { id?: string; name: string; description?: string; sortOrder?: number };
export type UpsertColorTokenPayload = {
  id?: string;
  colorGroupId: string;
  name: string;
  value: string;
  displayFormat?: string;
  semanticRole?: string;
  usageNote?: string;
  restrictionNote?: string;
  sortOrder?: number;
};
export type CreateDesignAssetPayload = {
  primaryRole: DesignAssetRole;
  secondaryTags?: string[];
  title?: string;
  description?: string;
  objectKey: string;
  publicUrl?: string;
  fileName: string;
  contentType: string;
  size: number;
};
export type UpdateDesignAssetPayload = Partial<Pick<CreateDesignAssetPayload, 'primaryRole' | 'secondaryTags' | 'title' | 'description' | 'publicUrl'>>;

function designSystemKey(orgId: string | null) {
  return ['company-design-system', orgId] as const;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, orgId: string | null) {
  return queryClient.invalidateQueries({ queryKey: designSystemKey(orgId) });
}

export function useCompanyDesignSystem(orgId: string | null) {
  return useQuery<CompanyDesignSystem>({
    queryKey: designSystemKey(orgId),
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyDesignSystem>(`/organizations/${orgId}/design-system`);
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useUpdateDesignIdentity(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateDesignIdentityPayload) => {
      const { data } = await apiClient.patch<CompanyDesignSystem>(`/organizations/${orgId}/design-system/identity`, payload);
      return data;
    },
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Identidade visual salva. A sincronizacao para IA foi enfileirada.');
    },
    onError: () => toast.error('Erro ao salvar identidade visual.'),
  });
}

export function useCreateColorGroup(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertColorGroupPayload) => apiClient.post(`/organizations/${orgId}/design-system/color-groups`, payload),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Grupo de cores criado.');
    },
    onError: () => toast.error('Erro ao criar grupo de cores.'),
  });
}

export function useUpdateColorGroup(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpsertColorGroupPayload & { id: string }) =>
      apiClient.patch(`/organizations/${orgId}/design-system/color-groups/${id}`, payload),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Grupo de cores atualizado.');
    },
    onError: () => toast.error('Erro ao atualizar grupo de cores.'),
  });
}

export function useDeleteColorGroup(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/organizations/${orgId}/design-system/color-groups/${id}`),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Grupo de cores removido.');
    },
    onError: () => toast.error('Erro ao remover grupo de cores.'),
  });
}

export function useCreateColorToken(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertColorTokenPayload) => apiClient.post(`/organizations/${orgId}/design-system/colors`, payload),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Cor adicionada.');
    },
    onError: () => toast.error('Erro ao adicionar cor.'),
  });
}

export function useUpdateColorToken(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpsertColorTokenPayload & { id: string }) =>
      apiClient.patch(`/organizations/${orgId}/design-system/colors/${id}`, payload),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Cor atualizada.');
    },
    onError: () => toast.error('Erro ao atualizar cor.'),
  });
}

export function useDeleteColorToken(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/organizations/${orgId}/design-system/colors/${id}`),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Cor removida.');
    },
    onError: () => toast.error('Erro ao remover cor.'),
  });
}

export function useCreateDesignAsset(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, fileName, metadata }: { file: File; fileName: string; metadata: Omit<CreateDesignAssetPayload, 'objectKey' | 'fileName' | 'contentType' | 'size'> }) => {
      const assetId = crypto.randomUUID();
      const upload = await apiClient.post<{ key: string; url: string }>(`/organizations/${orgId}/design-system/assets/upload-url`, {
        assetId,
        primaryRole: metadata.primaryRole,
        fileName,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });
      await fetch(upload.data.url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      const { data } = await apiClient.post<DesignAsset>(`/organizations/${orgId}/design-system/assets`, {
        ...metadata,
        objectKey: upload.data.key,
        fileName,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });
      return data;
    },
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Asset de design enviado.');
    },
    onError: () => toast.error('Erro ao enviar asset de design.'),
  });
}

export function useUpdateDesignAsset(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateDesignAssetPayload & { id: string }) =>
      apiClient.patch(`/organizations/${orgId}/design-system/assets/${id}`, payload),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Asset de design atualizado.');
    },
    onError: () => toast.error('Erro ao atualizar asset de design.'),
  });
}

export function useDeleteDesignAsset(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/organizations/${orgId}/design-system/assets/${id}`),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Asset de design removido.');
    },
    onError: () => toast.error('Erro ao remover asset de design.'),
  });
}

export function useRegenerateDesignArtifact(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/organizations/${orgId}/design-system/regenerate-artifact`),
    onSuccess: async () => {
      await invalidate(queryClient, orgId);
      toast.success('Regeneracao do contexto visual enfileirada.');
    },
    onError: () => toast.error('Erro ao regenerar contexto visual.'),
  });
}
