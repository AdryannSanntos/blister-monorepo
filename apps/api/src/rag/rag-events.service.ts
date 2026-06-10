import { Injectable, Logger } from '@nestjs/common';
import { LearningSerializerRegistry } from '@company-os/agent-sdk';
import { tasks } from '@trigger.dev/sdk';
import type { companyRagSync } from '../../trigger/company-rag-sync';
import type { ragIndexDocument } from '../../trigger/rag-index-document';

type CompanyRagSyncTask = typeof companyRagSync;
type RagIndexDocumentTask = typeof ragIndexDocument;

@Injectable()
export class RagEventsService {
  private readonly logger = new Logger(RagEventsService.name);

  async triggerBrandBrainIndex(companyId: string, brandProfileId: string): Promise<string> {
    return this.triggerCompanySync(companyId);
  }

  async triggerCompanySync(
    companyId: string,
    options?: { campaignId?: string },
  ): Promise<string> {
    this.logger.log(`Triggering company RAG sync for ${companyId}`);

    try {
      const handle = await tasks.trigger<CompanyRagSyncTask>('company-rag-sync', {
        companyId,
        campaignId: options?.campaignId,
      });

      this.logger.log(`Company RAG sync job triggered: ${handle.id}`);
      return handle.id;
    } catch (error) {
      this.logger.error('Failed to trigger company RAG sync', error);
      throw error;
    }
  }

  async triggerDocumentIndex(
    companyId: string,
    sourceType: 'BRAND_BRAIN' | 'CAMPAIGN' | 'CAMPAIGN_FILE' | 'AGENT_LEARNING' | 'APPROVED_PIECE',
    sourceId: string,
    content: string,
    options?: {
      title?: string;
      campaignId?: string;
      agentId?: string;
      metadata?: Record<string, unknown>;
      forceReindex?: boolean;
    },
  ): Promise<string> {
    this.logger.log(`Triggering document indexing: ${sourceType}/${sourceId}`);

    try {
      const handle = await tasks.trigger<RagIndexDocumentTask>('rag-index-document', {
        companyId,
        sourceType,
        sourceId,
        content,
        title: options?.title,
        campaignId: options?.campaignId,
        agentId: options?.agentId,
        metadata: options?.metadata,
        forceReindex: options?.forceReindex ?? false,
      });

      this.logger.log(`Document index job triggered: ${handle.id}`);
      return handle.id;
    } catch (error) {
      this.logger.error('Failed to trigger document indexing', error);
      throw error;
    }
  }

  async triggerAgentLearningIndex(
    companyId: string,
    agentRunId: string,
    agentId: string,
    approved: boolean,
    output: Record<string, unknown>,
    feedback?: string,
  ): Promise<string> {
    const content = this.serializeAgentLearning(
      agentId,
      approved,
      output,
      feedback,
      agentRunId,
      companyId,
    );

    return this.triggerDocumentIndex(
      companyId,
      'AGENT_LEARNING',
      agentRunId,
      content,
      {
        title: `Aprendizado: ${agentId}`,
        agentId,
        forceReindex: true,
        metadata: {
          agentRunId,
          agentId,
          approved,
          hasFeedback: !!feedback,
        },
      },
    );
  }

  async triggerCampaignIndex(
    companyId: string,
    campaignId: string,
    name: string,
    objective: string,
    context?: string | null,
  ): Promise<string> {
    const content = this.serializeCampaign(name, objective, context);

    return this.triggerDocumentIndex(
      companyId,
      'CAMPAIGN',
      campaignId,
      content,
      {
        title: `Campanha: ${name}`,
        campaignId,
        forceReindex: true,
      },
    );
  }

  private serializeAgentLearning(
    agentId: string,
    approved: boolean,
    output: Record<string, unknown>,
    feedback?: string,
    agentRunId?: string,
    companyId?: string,
  ): string {
    // Prefer the agent's own learning serializer (registered via .withLearning);
    // fall back to a generic JSON note for agents without one.
    const note = LearningSerializerRegistry.serialize(agentId, {
      agentRunId: agentRunId ?? '',
      companyId: companyId ?? '',
      approved,
      output,
      userFeedback: feedback,
    });
    if (note) return note;

    const status = approved ? 'Aprovado' : 'Rejeitado';
    let content = `# Aprendizado do Agente: ${agentId}\n\nStatus: ${status}`;

    if (feedback) {
      content += `\n\n## Feedback\n${feedback}`;
    }

    content += `\n\n## Output\n${JSON.stringify(output, null, 2)}`;

    return content;
  }

  private serializeCampaign(
    name: string,
    objective: string,
    context?: string | null,
  ): string {
    let content = `# Campanha: ${name}\n\n## Objetivo\n${objective}`;
    if (context) {
      content += `\n\n## Contexto\n${context}`;
    }
    return content;
  }
}
