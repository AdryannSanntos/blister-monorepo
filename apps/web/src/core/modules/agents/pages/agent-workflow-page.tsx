"use client";

import type { Edge, Node } from "@xyflow/react";
import { Network, Play, Rocket, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { BlockTypeKey } from "src/core/modules/agents/components/flow-builder/block-types";
import { FlowCanvas } from "src/core/modules/agents/components/flow-builder/flow-canvas";
import {
  type WorkflowConfig,
  WorkflowSidebar,
} from "src/core/modules/agents/components/flow-builder/workflow-sidebar";
import {
  useActivateVersion,
  useCompanyAgent,
  usePublishVersion,
  useSaveDraftVersion,
} from "src/core/modules/agents/hooks/use-agents";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { AgentContentLayout } from "src/core/shared/components/ui/agent-content-layout";
import { Button } from "src/core/shared/components/ui/button";
import { cn } from "src/core/shared/utils";

type FlowNodeData = {
  blockType: BlockTypeKey;
  label?: string;
  prompt?: string;
  providerId?: string;
  modelId?: string;
};

const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  name: "",
  objective: "",
  instructions: "",
  fallbackMessage: "",
};

function draftVersionRef(
  agentData:
    | {
        versions?: Array<{
          id: string;
          status: string;
          updatedAt?: string;
          flowDefinition?: unknown;
        }>;
      }
    | undefined,
) {
  return agentData?.versions?.find((v) => v.status === "draft");
}

const DEFAULT_NODES: Node<FlowNodeData>[] = [
  {
    id: "input",
    type: "block",
    position: { x: 80, y: 180 },
    data: { blockType: "input", label: "Entrada" },
  },
  {
    id: "output",
    type: "block",
    position: { x: 440, y: 180 },
    data: { blockType: "output", label: "Saída" },
  },
];

const DEFAULT_EDGES: Edge[] = [
  { id: "e-input-output", source: "input", target: "output" },
];

export function AgentWorkflowPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const agent = useCompanyAgent(orgId, agentId);
  const { cannot } = useAbility();

  const saveDraft = useSaveDraftVersion(orgId, agentId);
  const publish = usePublishVersion(orgId, agentId);
  const activate = useActivateVersion(orgId, agentId);

  const activeVersion = useMemo(
    () =>
      agent.data?.versions?.find((v) => v.id === agent.data?.activeVersionId),
    [agent.data],
  );
  const draftVersion = useMemo(() => draftVersionRef(agent.data), [agent.data]);
  const displayedVersion = draftVersion ?? activeVersion;

  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<Edge[]>(DEFAULT_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [openMenuNodeId, setOpenMenuNodeId] = useState<string | null>(null);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>(
    DEFAULT_WORKFLOW_CONFIG,
  );
  const [showEntrance, setShowEntrance] = useState(true);

  useEffect(() => {
    setShowEntrance(true);
  }, []);

  useEffect(() => {
    if (agent.isLoading) return;
    const timeoutId = window.setTimeout(() => setShowEntrance(false), 950);
    return () => window.clearTimeout(timeoutId);
  }, [agent.isLoading]);

  // Sempre prioriza o rascunho quando ele existe para que o builder reflita a
  // última versão editável, não apenas a versão atualmente ativa.
  useEffect(() => {
    if (!displayedVersion?.flowDefinition) {
      setWorkflowConfig(DEFAULT_WORKFLOW_CONFIG);
      setNodes(DEFAULT_NODES);
      setEdges(DEFAULT_EDGES);
      setSelectedNodeId(null);
      setOpenMenuNodeId(null);
      return;
    }
    const flow = displayedVersion.flowDefinition as {
      config?: Partial<WorkflowConfig>;
      nodes?: Array<{
        id: string;
        type: BlockTypeKey;
        config?: {
          label?: string;
          prompt?: string;
          providerId?: string;
          modelId?: string;
          position?: { x: number; y: number };
          successors?: string[];
        };
      }>;
      edges?: Array<{
        sourceNodeId: string;
        sourcePortKey: string;
        targetNodeId: string;
        targetPortKey: string;
      }>;
    };
    setWorkflowConfig({
      ...DEFAULT_WORKFLOW_CONFIG,
      ...(flow.config ?? {}),
    });
    if (!flow.nodes || flow.nodes.length === 0) {
      setNodes(DEFAULT_NODES);
      setEdges(DEFAULT_EDGES);
      setSelectedNodeId(null);
      setOpenMenuNodeId(null);
      return;
    }
    setNodes(
      flow.nodes.map((n, i) => ({
        id: n.id,
        type: "block",
        position: n.config?.position ?? { x: 200, y: 40 + i * 120 },
        data: {
          blockType: n.type,
          label: n.config?.label,
          prompt: n.config?.prompt,
          providerId: n.config?.providerId,
          modelId: n.config?.modelId,
        },
      })),
    );
    // Prefer V2 edges array; fall back to legacy successors in node config
    let restoredEdges: Edge[] = [];
    if (flow.edges && flow.edges.length > 0) {
      restoredEdges = flow.edges.map((e) => ({
        id: `${e.sourceNodeId}-${e.sourcePortKey}-${e.targetNodeId}-${e.targetPortKey}`,
        source: e.sourceNodeId,
        sourceHandle: e.sourcePortKey,
        target: e.targetNodeId,
        targetHandle: e.targetPortKey,
      }));
    } else {
      for (const n of flow.nodes) {
        for (const target of n.config?.successors ?? []) {
          restoredEdges.push({
            id: `${n.id}-${target}`,
            source: n.id,
            sourceHandle: "default",
            target,
            targetHandle: "default",
          });
        }
      }
    }
    setEdges(restoredEdges.length > 0 ? restoredEdges : DEFAULT_EDGES);
    setSelectedNodeId(null);
    setOpenMenuNodeId(null);
  }, [displayedVersion]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  function addBlock(
    blockType: BlockTypeKey,
    position?: { x: number; y: number },
  ) {
    const id = `${blockType}-${Date.now()}`;
    const lastX = nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
    const newNode: Node<FlowNodeData> = {
      id,
      type: "block",
      position: position ?? { x: lastX + 300, y: 180 },
      data: { blockType },
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(id);
  }

  function patchNode(nodeId: string, patch: Partial<FlowNodeData>) {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    );
  }

  function deleteNode(nodeId: string) {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) =>
      prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
    );
    setSelectedNodeId(null);
  }

  function deleteEdge(edgeId: string) {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }

  function patchWorkflowConfig(patch: Partial<WorkflowConfig>) {
    setWorkflowConfig((prev) => ({ ...prev, ...patch }));
  }

  function handleSelectNode(nodeId: string | null) {
    setSelectedNodeId(nodeId);
  }

  async function handleSaveDraft() {
    const flowNodes = nodes.map((n) => ({
      id: n.id,
      type: n.data.blockType,
      config: {
        label: n.data.label,
        prompt: n.data.prompt ?? "",
        ...(n.data.providerId ? { providerId: n.data.providerId } : {}),
        ...(n.data.modelId ? { modelId: n.data.modelId } : {}),
        position: n.position,
      },
    }));

    const flowEdges = edges.map((e) => ({
      sourceNodeId: e.source,
      sourcePortKey: (e.sourceHandle as string | null | undefined) ?? "default",
      targetNodeId: e.target,
      targetPortKey: (e.targetHandle as string | null | undefined) ?? "default",
    }));

    return saveDraft.mutateAsync({
      flowDefinition: {
        config: workflowConfig,
        nodes: flowNodes,
        edges: flowEdges,
      },
      inputSchema: {},
      outputSchema: {},
    });
  }

  const canEdit = !cannot("update", "Agent");
  const publishedNotActiveVersion = agent.data?.versions?.find(
    (v) => v.status === "published",
  );
  const isAgentActive = agent.data?.status === "active";

  async function handlePublishAndActivate() {
    const saved = await handleSaveDraft();
    let versionId: string | undefined;
    if (saved?.id) {
      const published = await publish.mutateAsync(saved.id);
      versionId = published.id;
    } else if (publishedNotActiveVersion) {
      versionId = publishedNotActiveVersion.id;
    }
    if (versionId) {
      await activate.mutateAsync(versionId);
    }
  }

  const publishLabel = isAgentActive
    ? "Republicar"
    : publishedNotActiveVersion
      ? "Ativar versão"
      : "Publicar agente";
  const publishDisabled =
    publish.isPending ||
    activate.isPending ||
    saveDraft.isPending ||
    (!draftVersion && !publishedNotActiveVersion && !isAgentActive);

  return (
    <AgentContentLayout
      icon={Network}
      title="Workflow"
      subtitle="Monte o fluxo, publique versões e ative a configuração do agente."
      actions={
        <div
          className={cn(
            "flex items-center gap-2",
            showEntrance &&
              "animate-in fade-in-0 slide-in-from-top-2 duration-500",
          )}
        >
          <PermissionGate permission="agent.update">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!canEdit || saveDraft.isPending}
            >
              <Save className="size-3.5" />
              Salvar rascunho
            </Button>
          </PermissionGate>
          <PermissionGate permission="agent.publish">
            <Button
              variant="outline"
              size="sm"
              disabled={!isAgentActive}
              title={
                isAgentActive
                  ? "Executar teste do fluxo"
                  : "Publique o agente para liberar o teste"
              }
            >
              <Play className="size-3.5" />
              Executar teste
            </Button>
            <Button
              size="sm"
              onClick={handlePublishAndActivate}
              disabled={publishDisabled}
            >
              <Rocket className="size-3.5" />
              {publishLabel}
            </Button>
          </PermissionGate>
        </div>
      }
      contentClassName="flex min-h-0 flex-1"
    >
      <div className="relative flex min-h-0 w-full flex-1">
        <div
          className={cn(
            "min-h-0 w-full flex-1 bg-[var(--bg-sunken)]",
            showEntrance && "animate-in fade-in-0 zoom-in-95 duration-500",
          )}
        >
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            openMenuNodeId={openMenuNodeId}
            onOpenMenuNodeChange={setOpenMenuNodeId}
            onSelectNode={handleSelectNode}
            onNodesChange={(next) => setNodes(next as Node<FlowNodeData>[])}
            onEdgesChange={setEdges}
            onAddBlock={canEdit ? addBlock : undefined}
            onDeleteNode={canEdit ? deleteNode : undefined}
            onDeleteEdge={canEdit ? deleteEdge : undefined}
            readOnly={!canEdit}
          />
        </div>
        <div
          className={cn(
            showEntrance &&
              "animate-in fade-in-0 slide-in-from-right-6 duration-500 delay-150",
          )}
        >
          <WorkflowSidebar
            orgId={orgId}
            node={selectedNode}
            workflowConfig={workflowConfig}
            onWorkflowConfigChange={patchWorkflowConfig}
            onAddBlock={addBlock}
            onChange={patchNode}
            onDelete={deleteNode}
            onClearSelection={() => setSelectedNodeId(null)}
          />
        </div>

      </div>
    </AgentContentLayout>
  );
}
