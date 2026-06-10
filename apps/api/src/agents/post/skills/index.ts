import {
  type AgentSkillDefinition,
  formatSkillsForPrompt,
  loadAgentSkills,
} from '../../runtime/kernel/agent-skills.loader';

/** Skill ids enabled for the post agent. One folder per skill under `post/skills/`. */
export const POST_AGENT_SKILL_IDS = ['blister-social-post-uiux'] as const;

export type PostAgentSkillId = (typeof POST_AGENT_SKILL_IDS)[number];

export function getPostAgentSkills(): AgentSkillDefinition[] {
  return loadAgentSkills('post', [...POST_AGENT_SKILL_IDS]);
}

export function formatPostAgentSkillsForPrompt(): string {
  return formatSkillsForPrompt(getPostAgentSkills());
}
