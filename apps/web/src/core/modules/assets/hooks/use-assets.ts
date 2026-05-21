import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from 'src/core/shared/utils/api-client';

export type AssetSourceKind = 'file' | 'url';
export type AssetRoleFilter = 'all' | 'context' | 'operational';
export type ContextAssetStatus = 'uploaded' | 'processed' | 'suggested' | 'approved' | 'discarded';
export type OperationalAssetStatus = 'active' | 'archived' | 'obsolete';
export type AssetRelationKind = 'campaign' | 'channel' | 'product' | 'page' | 'output';

export type WorkspaceAssetRelation = {
  id: string;
  kind: AssetRelationKind;
  value: string;
};

export type WorkspaceAsset = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  sourceKind: AssetSourceKind;
  sourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  visibleType: string | null;
  visibleCategory: string | null;
  tags: string[];
  contextRole: boolean;
  operationalRole: boolean;
  contextStatus: ContextAssetStatus | null;
  operationalStatus: OperationalAssetStatus | null;
  relations: WorkspaceAssetRelation[];
  createdAt: string;
  updatedAt: string;
};

export type AssetFilters = {
  role: AssetRoleFilter;
  search?: string;
  contextStatus?: ContextAssetStatus;
  operationalStatus?: OperationalAssetStatus;
};

export type CreateAssetPayload = {
  title: string;
  description?: string;
  sourceKind: AssetSourceKind;
  sourceUrl?: string;
  fileName?: string;
  mimeType?: string;
  visibleType?: string;
  visibleCategory?: string;
  tags: string[];
  contextRole: boolean;
  operationalRole: boolean;
  relations: Array<{ kind: AssetRelationKind; value: string }>;
};

export type UpdateAssetPayload = Partial<
  Pick<
    CreateAssetPayload,
    | 'title'
    | 'description'
    | 'visibleType'
    | 'visibleCategory'
    | 'tags'
    | 'contextRole'
    | 'operationalRole'
    | 'relations'
  >
> & {
  contextStatus?: ContextAssetStatus;
  operationalStatus?: OperationalAssetStatus;
};

export type BulkUpdateAssetsPayload = {
  assetIds: string[];
  action:
    | 'archive'
    | 'mark_obsolete'
    | 'approve_context'
    | 'discard_context'
    | 'promote_to_context'
    | 'replace_relations';
  relations?: Array<{ kind: AssetRelationKind; value: string }>;
};

function invalidateAssets(queryClient: ReturnType<typeof useQueryClient>, orgId: string | null) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['assets', orgId] }),
    queryClient.invalidateQueries({ queryKey: ['asset', orgId] }),
  ]);
}

export function useAssets(orgId: string | null, filters: AssetFilters) {
  return useQuery<WorkspaceAsset[]>({
    queryKey: ['assets', orgId, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<WorkspaceAsset[]>(`/organizations/${orgId}/assets`, {
        params: filters,
      });
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useAsset(orgId: string | null, assetId: string | null) {
  return useQuery<WorkspaceAsset>({
    queryKey: ['asset', orgId, assetId],
    queryFn: async () => {
      const { data } = await apiClient.get<WorkspaceAsset>(
        `/organizations/${orgId}/assets/${assetId}`,
      );
      return data;
    },
    enabled: Boolean(orgId && assetId),
  });
}

export function useCreateAsset(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAssetPayload) => {
      const { data } = await apiClient.post<WorkspaceAsset>(
        `/organizations/${orgId}/assets`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await invalidateAssets(queryClient, orgId);
      toast.success('Asset criado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao criar asset. Tente novamente.');
    },
  });
}

export function useUpdateAsset(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, ...payload }: { assetId: string } & UpdateAssetPayload) => {
      const { data } = await apiClient.patch<WorkspaceAsset>(
        `/organizations/${orgId}/assets/${assetId}`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await invalidateAssets(queryClient, orgId);
      toast.success('Asset atualizado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao atualizar asset. Tente novamente.');
    },
  });
}

export function useBulkUpdateAssets(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkUpdateAssetsPayload) => {
      const { data } = await apiClient.post<{ count: number }>(
        `/organizations/${orgId}/assets/bulk`,
        payload,
      );
      return data;
    },
    onSuccess: async (_, variables) => {
      await invalidateAssets(queryClient, orgId);
      const messages: Record<BulkUpdateAssetsPayload['action'], string> = {
        archive: 'Assets arquivados com sucesso.',
        mark_obsolete: 'Assets marcados como obsoletos.',
        approve_context: 'Assets aprovados para contexto.',
        discard_context: 'Assets descartados do contexto.',
        promote_to_context: 'Assets promovidos para contexto.',
        replace_relations: 'Relações atualizadas com sucesso.',
      };
      toast.success(messages[variables.action]);
    },
    onError: () => {
      toast.error('Erro ao atualizar assets. Tente novamente.');
    },
  });
}
