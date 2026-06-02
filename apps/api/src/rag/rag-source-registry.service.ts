import type { RagSourceType } from '@company-os/types';
import { Injectable } from '@nestjs/common';

export interface RagSourceDescriptor {
  sourceType: RagSourceType;
  label: string;
  /** Permission required to read this source; `null` means any authenticated member. */
  requiredPermission: string | null;
  /** Default retrieval weight applied to this source's similarity score. */
  defaultWeight: number;
}

/**
 * Single registry of indexable source types for the shared RAG platform. Centralizes
 * the permission gate, display label and retrieval weight of every source so policy,
 * retrieval ranking and prompt assembly all agree on one definition.
 *
 * Registry of all source families that can contribute retrievable company context.
 */
@Injectable()
export class RagSourceRegistry {
  private readonly descriptors: Record<RagSourceType, RagSourceDescriptor> = {
    brain_entry: {
      sourceType: 'brain_entry',
      label: 'Brain',
      requiredPermission: 'brain.read',
      defaultWeight: 1.2,
    },
    context_source: {
      sourceType: 'context_source',
      label: 'Fonte de contexto',
      requiredPermission: 'context.read',
      defaultWeight: 1.1,
    },
    agent_context_file: {
      sourceType: 'agent_context_file',
      label: 'Arquivo de contexto',
      requiredPermission: 'context.read',
      defaultWeight: 1.1,
    },
    agent_context_reference: {
      sourceType: 'agent_context_reference',
      label: 'Referência de contexto',
      requiredPermission: 'context.read',
      defaultWeight: 1.0,
    },
    asset: {
      sourceType: 'asset',
      label: 'Asset',
      requiredPermission: 'asset.read',
      defaultWeight: 1.0,
    },
    design_system: {
      sourceType: 'design_system',
      label: 'Design system',
      requiredPermission: 'design-system.read',
      defaultWeight: 1.1,
    },
    design_asset: {
      sourceType: 'design_asset',
      label: 'Asset de design',
      requiredPermission: 'design-system.read',
      defaultWeight: 1.05,
    },
    web_research: {
      sourceType: 'web_research',
      label: 'Pesquisa externa',
      requiredPermission: null,
      defaultWeight: 0.8,
    },
    manual: {
      sourceType: 'manual',
      label: 'Documento',
      requiredPermission: null,
      defaultWeight: 1.0,
    },
  };

  list(): RagSourceDescriptor[] {
    return Object.values(this.descriptors);
  }

  get(sourceType: string): RagSourceDescriptor | undefined {
    return this.descriptors[sourceType as RagSourceType];
  }

  label(sourceType: string): string {
    return this.get(sourceType)?.label ?? sourceType;
  }

  /** Source types the given permission set may read (null-permission sources always pass). */
  allowedSourceTypes(permissions: string[]): RagSourceType[] {
    const held = new Set(permissions);
    return this.list()
      .filter((d) => d.requiredPermission === null || held.has(d.requiredPermission))
      .map((d) => d.sourceType);
  }

  /** Default per-source weights for retrieval ranking. */
  defaultWeights(): Record<string, number> {
    return Object.fromEntries(this.list().map((d) => [d.sourceType, d.defaultWeight]));
  }
}
