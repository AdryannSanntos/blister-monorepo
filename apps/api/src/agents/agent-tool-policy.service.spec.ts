import { ForbiddenException } from '@nestjs/common';
import { AgentToolPolicyService } from './agent-tool-policy.service';

describe('AgentToolPolicyService', () => {
  let service: AgentToolPolicyService;

  beforeEach(() => {
    service = new AgentToolPolicyService();
  });

  it('rejects a tool that is not enabled for the agent', () => {
    expect(() => service.assertToolAllowed(['rag_search'], 'web_research')).toThrow(
      ForbiddenException,
    );
  });

  it('allows a tool that is enabled for the agent', () => {
    expect(() =>
      service.assertToolAllowed(['rag_search', 'web_research'], 'web_research'),
    ).not.toThrow();
  });

  it('returns read-only permissions for file_search', () => {
    expect(service.getPermissionsForTool('file_search')).toEqual(['context.read', 'asset.read']);
  });

  it('web_research has no source permission gating', () => {
    expect(service.getPermissionsForTool('web_research')).toEqual([]);
  });

  it('narrows source permissions to what the user holds', () => {
    expect(service.resolveSourcePermissions(['context.read'], 'rag_search')).toEqual([
      'context.read',
    ]);
  });

  it('returns no source scope when the user holds none of the required permissions', () => {
    expect(service.resolveSourcePermissions(['member.read'], 'rag_search')).toEqual([]);
  });
});
