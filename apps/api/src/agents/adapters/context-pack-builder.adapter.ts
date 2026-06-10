import type { ContextPackBuilder } from '@company-os/agent-sdk';
import type { RagContextPack } from '@company-os/types';
import type { ContextPackService } from '../../rag/context-pack.service';
import type { ContextPack } from '@company-os/agent-sdk';

const mapContextPack = (pack: RagContextPack): ContextPack => ({
  chunks: pack.chunks.map((chunk) => ({
    id: chunk.id,
    content: chunk.content,
    sourceType: chunk.sourceType,
    score: chunk.score,
    metadata: chunk.metadata,
  })),
  totalFound: pack.totalFound,
});

export const adaptContextPackService = (service: ContextPackService): ContextPackBuilder => ({
  buildPack: async (params) => {
    const pack = await service.buildPack(params);
    return mapContextPack(pack);
  },
});
