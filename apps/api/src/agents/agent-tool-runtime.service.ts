import { Inject, Injectable } from '@nestjs/common';
import { RagContextAssemblyService } from '../rag/rag-context-assembly.service';
import { AgentContextService } from './agent-context.service';
import { AgentToolPolicyService } from './agent-tool-policy.service';
import type { AgentChatToolName, AgentToolResult } from './dto/agent-chat-tool.dto';
import { runFileSearchTool } from './tools/file-search.tool';
import { runRagSearchTool } from './tools/rag-search.tool';
import {
  WEB_RESEARCH_GATEWAY,
  type WebResearchGateway,
  runWebResearchTool,
} from './tools/web-research.tool';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 10;

export type AgentToolRunInput = {
  organizationId: string;
  agentId: string;
  userId: string;
  allowedTools: string[];
  userPermissions: string[];
  toolName: AgentChatToolName;
  query: string;
  limit?: number;
};

/**
 * Shared execution layer for the conversational tool runtime. Concentrates
 * policy enforcement, execution and result normalization so the orchestrator
 * only ever sees the unified `AgentToolResult` contract. Designed to be reused
 * by the workflow runtime in a later phase.
 */
@Injectable()
export class AgentToolRuntimeService {
  constructor(
    private readonly policy: AgentToolPolicyService,
    private readonly ragContextAssemblyService: RagContextAssemblyService,
    private readonly agentContextService: AgentContextService,
    @Inject(WEB_RESEARCH_GATEWAY) private readonly webResearchGateway: WebResearchGateway,
  ) {}

  async run(input: AgentToolRunInput): Promise<AgentToolResult> {
    // 1. agent allowlist
    this.policy.assertToolAllowed(input.allowedTools, input.toolName);

    const limit = this.clampLimit(input.limit);
    // 2. source permission — narrow source scope to what the user holds
    const permissions = this.policy.resolveSourcePermissions(input.userPermissions, input.toolName);

    switch (input.toolName) {
      case 'rag_search':
        return runRagSearchTool(this.ragContextAssemblyService, {
          organizationId: input.organizationId,
          query: input.query,
          limit,
          permissions,
        });
      case 'file_search':
        return runFileSearchTool(
          {
            agentContextService: this.agentContextService,
            ragContextAssemblyService: this.ragContextAssemblyService,
          },
          {
            organizationId: input.organizationId,
            agentId: input.agentId,
            query: input.query,
            limit,
            permissions,
          },
        );
      case 'web_research':
        return runWebResearchTool(this.webResearchGateway, { query: input.query, limit });
    }
  }

  private clampLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit)) return DEFAULT_LIMIT;
    return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
  }
}
