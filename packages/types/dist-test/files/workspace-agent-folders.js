"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWorkspaceAgentFolderKey = exports.workspaceAgentFolderSystemKey = exports.WORKSPACE_AGENT_FOLDERS = exports.DEFAULT_WORKSPACE_AGENT_IDS = void 0;
/** Default Blister OS agents that receive a dedicated workspace folder. */
exports.DEFAULT_WORKSPACE_AGENT_IDS = [
    'research',
    'cuts',
    'video_editor',
];
exports.WORKSPACE_AGENT_FOLDERS = [
    { agentId: 'research', name: 'Pesquisa', systemKey: 'agent:research' },
    { agentId: 'cuts', name: 'Cortes', systemKey: 'agent:cuts' },
    {
        agentId: 'video_editor',
        name: 'Editor de Vídeo',
        systemKey: 'agent:video_editor',
    },
];
const workspaceAgentFolderSystemKey = (agentId) => `agent:${agentId}`;
exports.workspaceAgentFolderSystemKey = workspaceAgentFolderSystemKey;
const isWorkspaceAgentFolderKey = (systemKey) => Boolean(systemKey?.startsWith('agent:'));
exports.isWorkspaceAgentFolderKey = isWorkspaceAgentFolderKey;
