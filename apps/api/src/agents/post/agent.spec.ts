import { postAgent, postAgentDefinition } from './agent';
import { POST_AGENT_SKILL_IDS } from './skills';

describe('post agent', () => {
  it('builds a six-step pipeline with skills and review schema', () => {
    expect(postAgent.definition.agentId).toBe('post');
    expect(postAgentDefinition.agentId).toBe('post');
    expect(postAgentDefinition.steps).toHaveLength(6);
    expect(postAgentDefinition.steps.map((step) => step.key)).toEqual([
      'retrieve_context',
      'collect_brief',
      'plan_design',
      'approve_design_plan',
      'generate_post',
      'validate_output',
    ]);
    expect(postAgentDefinition.skills).toEqual([...POST_AGENT_SKILL_IDS]);
  });
});
