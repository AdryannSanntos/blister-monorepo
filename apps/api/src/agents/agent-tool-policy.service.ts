import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AgentChatToolName } from './dto/agent-chat-tool.dto';

/**
 * Centralized policy for the conversational tool runtime.
 *
 * Three mandatory validations per the design:
 * 1. agent allowlist — the tool must be enabled on the agent
 * 2. source permission — the user must hold the permissions the tool reads from
 * 3. conversational-mode safety — only read-only tools run in chat (enforced by
 *    the closed `AgentChatToolName` enum; sensitive tools never reach here in phase 1)
 */
@Injectable()
export class AgentToolPolicyService {
  assertToolAllowed(agentAllowedTools: string[], toolName: string): void {
    if (!agentAllowedTools.includes(toolName)) {
      throw new ForbiddenException('Tool is not enabled for this agent');
    }
  }

  /** Permission keys a given tool reads from. Empty means no source gating. */
  getPermissionsForTool(toolName: AgentChatToolName): string[] {
    switch (toolName) {
      case 'rag_search':
        return ['context.read', 'brain.read', 'asset.read'];
      case 'file_search':
        return ['context.read', 'asset.read'];
      case 'web_research':
        return [];
      default:
        return [];
    }
  }

  /**
   * The agent never gains access beyond what the user holds. For tools that read
   * from multiple optional sources (rag_search), we keep the intersection of the
   * user's permissions so retrieval simply narrows its source scope instead of
   * failing the whole turn.
   */
  resolveSourcePermissions(userPermissions: string[], toolName: AgentChatToolName): string[] {
    const required = this.getPermissionsForTool(toolName);
    return required.filter((permission) => userPermissions.includes(permission));
  }
}
