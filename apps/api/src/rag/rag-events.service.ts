import { Injectable, Logger } from '@nestjs/common';
import { tasks } from '@trigger.dev/sdk';
import type { brandBrainIndex } from '../../trigger/brand-brain-index';
import type { ragIndexDocument } from '../../trigger/rag-index-document';

type BrandBrainIndexTask = typeof brandBrainIndex;
type RagIndexDocumentTask = typeof ragIndexDocument;

@Injectable()
export class RagEventsService {
  private readonly logger = new Logger(RagEventsService.name);

  async triggerBrandBrainIndex(companyId: string, brandProfileId: string): Promise<string> {
    this.logger.log(`Triggering Brand Brain indexing for company ${companyId}`);

    try {
      const handle = await tasks.trigger<BrandBrainIndexTask>('brand-brain-index', {
        companyId,
        brandProfileId,
      });

      this.logger.log(`Brand Brain index job triggered: ${handle.id}`);
      return handle.id;
    } catch (error) {
      this.logger.error('Failed to trigger Brand Brain indexing', error);
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
    const content = this.serializeAgentLearning(agentId, approved, output, feedback);

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
  ): string {
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
