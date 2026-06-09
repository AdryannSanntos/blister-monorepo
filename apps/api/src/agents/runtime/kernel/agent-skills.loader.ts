import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface AgentSkillDefinition {
  id: string;
  name: string;
  description: string;
  license?: string;
  content: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = raw.match(FRONTMATTER_PATTERN);
  if (!match) {
    return { meta: {}, body: raw.trim() };
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) meta[key] = value;
  }

  return { meta, body: match[2].trim() };
}

function resolveSkillDirectory(agentId: string, skillId: string): string | null {
  const relative = join('agents', agentId, 'skills', skillId);
  const candidates = [
    join(__dirname, '..', '..', agentId, 'skills', skillId),
    join(process.cwd(), 'src', relative),
    join(process.cwd(), 'apps/api/src', relative),
    join(process.cwd(), 'dist/src', relative),
  ];

  for (const candidate of candidates) {
    const skillFile = join(candidate, 'SKILL.md');
    if (existsSync(skillFile)) return candidate;
  }

  return null;
}

/**
 * Loads a skill folder (`SKILL.md` + optional `LICENSE.txt`) for an agent.
 * Paths are resolved for local dev, Nest `dist/`, and Trigger workers.
 */
export function loadAgentSkill(
  agentId: string,
  skillId: string,
): AgentSkillDefinition | null {
  const directory = resolveSkillDirectory(agentId, skillId);
  if (!directory) return null;

  const skillPath = join(directory, 'SKILL.md');
  const licensePath = join(directory, 'LICENSE.txt');
  const raw = readFileSync(skillPath, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);

  const license = existsSync(licensePath)
    ? readFileSync(licensePath, 'utf-8').trim()
    : meta.license?.trim();

  return {
    id: skillId,
    name: meta.name?.trim() || skillId,
    description: meta.description?.trim() || '',
    license,
    content: body,
  };
}

export function loadAgentSkills(
  agentId: string,
  skillIds: string[],
): AgentSkillDefinition[] {
  return skillIds
    .map((skillId) => loadAgentSkill(agentId, skillId))
    .filter((skill): skill is AgentSkillDefinition => skill !== null);
}

export function formatSkillsForPrompt(skills: AgentSkillDefinition[]): string {
  if (skills.length === 0) return '';

  return skills
    .map((skill) => {
      const header = [`## Skill: ${skill.name}`, skill.description]
        .filter(Boolean)
        .join('\n');
      const licenseBlock = skill.license
        ? `\n\n_License: ${skill.license.split('\n')[0]}_`
        : '';

      return `${header}\n\n${skill.content}${licenseBlock}`;
    })
    .join('\n\n---\n\n');
}
