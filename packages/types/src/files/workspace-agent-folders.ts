/** Default Blister OS agents that receive a dedicated workspace folder. */
export const DEFAULT_WORKSPACE_AGENT_IDS = [
  'research',
  'cuts',
  'video_editor',
] as const;

export type DefaultWorkspaceAgentId =
  (typeof DEFAULT_WORKSPACE_AGENT_IDS)[number];

export type WorkspaceAgentFolderDefinition = {
  agentId: DefaultWorkspaceAgentId;
  /** User-facing folder label (PT-BR in product copy). */
  name: string;
  systemKey: string;
};

export const WORKSPACE_AGENT_FOLDERS: WorkspaceAgentFolderDefinition[] = [
  { agentId: 'research', name: 'Pesquisa', systemKey: 'agent:research' },
  { agentId: 'cuts', name: 'Cortes', systemKey: 'agent:cuts' },
  {
    agentId: 'video_editor',
    name: 'Editor de Vídeo',
    systemKey: 'agent:video_editor',
  },
];

export const workspaceAgentFolderSystemKey = (agentId: string) =>
  `agent:${agentId}`;

export const isWorkspaceAgentFolderKey = (systemKey: string | null | undefined) =>
  Boolean(systemKey?.startsWith('agent:'));
