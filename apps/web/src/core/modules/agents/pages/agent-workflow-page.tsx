"use client";

import type { Edge, Node } from "@xyflow/react";
import { Plus, Save, Send, ToggleRight } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BLOCK_TYPES,
  type BlockTypeKey,
} from "src/core/modules/agents/components/flow-builder/block-types";
import { FlowCanvas } from "src/core/modules/agents/components/flow-builder/flow-canvas";
import { NodeConfigPanel } from "src/core/modules/agents/components/flow-builder/node-config-panel";
import {
  useActivateVersion,
  useCompanyAgent,
  usePublishVersion,
  useSaveDraftVersion,
} from "src/core/modules/agents/hooks/use-agents";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";

type FlowNodeData = {
  blockType: BlockTypeKey;
  label?: string;
  prompt?: string;
};

function draftVersionRef(
  agentData: { versions?: Array<{ status: string }> } | undefined,
) {
  return agentData?.versions?.find((v) => v.status === "draft") as
    | { flowDefinition?: unknown }
    | undefined;
}

const DEFAULT_NODES: Node<FlowNodeData>[] = [
  {
    id: "input",
    type: "block",
    position: { x: 200, y: 40 },
    data: { blockType: "input", label: "Entrada" },
  },
  {
    id: "output",
    type: "block",
    position: { x: 200, y: 300 },
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

  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<Edge[]>(DEFAULT_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hidrata o canvas a partir da versão ativa (ou rascunho mais recente).
  useEffect(() => {
    if (hydrated) return;
    const version = activeVersion ?? draftVersionRef(agent.data);
    const flow = version?.flowDefinition as
      | {
          nodes?: Array<{
            id: string;
            type: BlockTypeKey;
            config?: {
              label?: string;
              prompt?: string;
              position?: { x: number; y: number };
              successors?: string[];
            };
          }>;
        }
      | undefined;
    if (!flow?.nodes || flow.nodes.length === 0) return;
    setNodes(
      flow.nodes.map((n, i) => ({
        id: n.id,
        type: "block",
        position: n.config?.position ?? { x: 200, y: 40 + i * 120 },
        data: {
          blockType: n.type,
          label: n.config?.label,
          prompt: n.config?.prompt,
        },
      })),
    );
    const restoredEdges: Edge[] = [];
    for (const n of flow.nodes) {
      for (const target of n.config?.successors ?? []) {
        restoredEdges.push({
          id: `${n.id}-${target}`,
          source: n.id,
          target,
        });
      }
    }
    if (restoredEdges.length > 0) setEdges(restoredEdges);
    setHydrated(true);
  }, [activeVersion, agent.data, hydrated]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  function addBlock(blockType: BlockTypeKey) {
    const id = `${blockType}-${Date.now()}`;
    const lastY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const newNode: Node<FlowNodeData> = {
      id,
      type: "block",
      position: { x: 200, y: lastY + 120 },
      data: { blockType, label: BLOCK_TYPES[blockType].label },
    };
    setNodes([...nodes, newNode]);
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

  async function handleSaveDraft() {
    // Backend strict schema só aceita { nodes: [{ id, type, config }] }.
    // Persistimos posição e arestas dentro de `config` (campo open) para não
    // perder layout/conexões entre saves.
    const flowNodes = nodes.map((n) => {
      const successors = edges
        .filter((e) => e.source === n.id)
        .map((e) => e.target);
      return {
        id: n.id,
        type: n.data.blockType,
        config: {
          label: n.data.label,
          prompt: n.data.prompt ?? "",
          position: n.position,
          successors,
        },
      };
    });
    await saveDraft.mutateAsync({
      flowDefinition: { nodes: flowNodes },
      inputSchema: {},
      outputSchema: {},
    });
  }

  const canEdit = !cannot("update", "Agent");
  const draftVersion = agent.data?.versions?.find((v) => v.status === "draft");

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line-subtle)] bg-[var(--bg-base)] px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-medium text-[var(--fg-primary)]">
            Workflow
          </h2>
          {activeVersion && (
            <Badge variant="success">v{activeVersion.version} · ativa</Badge>
          )}
          {draftVersion && (
            <Badge variant="secondary">
              v{draftVersion.version} · rascunho
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate permission="agent.update">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!canEdit}>
                  <Plus className="size-3.5" />
                  Adicionar bloco
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Tipos de bloco</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.values(BLOCK_TYPES).map((bt) => {
                  if (bt.key === "input" || bt.key === "output") return null;
                  const Icon = bt.icon;
                  return (
                    <DropdownMenuItem
                      key={bt.key}
                      onClick={() => addBlock(bt.key)}
                    >
                      <Icon className={`size-3.5 ${bt.tone}`} />
                      <div className="flex min-w-0 flex-col">
                        <span className="text-[13px]">{bt.label}</span>
                        <span className="truncate text-[11px] text-[var(--fg-tertiary)]">
                          {bt.description}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
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
              onClick={() => draftVersion && publish.mutate(draftVersion.id)}
              disabled={!draftVersion || publish.isPending}
            >
              <Send className="size-3.5" />
              Publicar versão
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const target = agent.data?.versions?.find(
                  (v) => v.status === "published",
                );
                if (target) activate.mutate(target.id);
              }}
              disabled={activate.isPending}
            >
              <ToggleRight className="size-3.5" />
              Ativar versão
            </Button>
          </PermissionGate>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 bg-[var(--bg-sunken)]">
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onNodesChange={(next) => setNodes(next as Node<FlowNodeData>[])}
            onEdgesChange={setEdges}
            readOnly={!canEdit}
          />
        </div>
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onChange={patchNode}
          onDelete={deleteNode}
        />
      </div>
    </div>
  );
}
