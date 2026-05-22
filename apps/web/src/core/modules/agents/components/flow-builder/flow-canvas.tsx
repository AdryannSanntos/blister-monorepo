"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type NodeChange,
  type EdgeChange,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import type {
  AgentFlowDefinition,
  AgentFlowEdge,
  AgentFlowNode,
} from "../../schemas/agent-flow-schema";
import { BLOCK_REGISTRY, type BlockType, getBlockMeta } from "./block-types";
import { FlowBlockNode, type FlowBlockData } from "./flow-block-node";
import { NodeConfigPanel } from "./node-config-panel";

const nodeTypes = { flowBlock: FlowBlockNode };

function flowToReactFlow(flow: AgentFlowDefinition): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = flow.nodes.map((node, index) => ({
    id: node.id,
    type: "flowBlock",
    position: {
      x: (node.config._x as number) ?? 250,
      y: (node.config._y as number) ?? 80 + index * 160,
    },
    data: {
      blockType: node.type,
      label: (node.config._label as string) ?? "",
      config: node.config,
    } satisfies FlowBlockData,
  }));

  const edges: Edge[] = flow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: true,
    style: { stroke: "var(--fg-quaternary)", strokeWidth: 2 },
  }));

  return { nodes, edges };
}

function reactFlowToSchema(
  nodes: Node[],
  edges: Edge[],
): AgentFlowDefinition {
  const schemaNodes: AgentFlowNode[] = nodes.map((node) => {
    const data = node.data as FlowBlockData;
    return {
      id: node.id,
      type: data.blockType,
      config: {
        ...data.config,
        _x: node.position.x,
        _y: node.position.y,
        _label: data.label || undefined,
      },
    };
  });

  const schemaEdges: AgentFlowEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));

  return { nodes: schemaNodes, edges: schemaEdges };
}

type FlowCanvasProps = {
  initialFlow: AgentFlowDefinition;
  onChange: (flow: AgentFlowDefinition) => void;
  readOnly?: boolean;
};

function FlowCanvasInner({ initialFlow, onChange, readOnly }: FlowCanvasProps) {
  const initial = useMemo(() => flowToReactFlow(initialFlow), [initialFlow]);
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedData = selectedNode?.data as FlowBlockData | undefined;

  function emitChange(nextNodes: Node[], nextEdges: Edge[]) {
    onChange(reactFlowToSchema(nextNodes, nextEdges));
  }

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => {
        const next = applyNodeChanges(changes, prev);
        emitChange(next, edges);
        return next;
      });
    },
    [edges],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((prev) => {
        const next = applyEdgeChanges(changes, prev);
        emitChange(nodes, next);
        return next;
      });
    },
    [nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((prev) => {
        const next = addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "var(--fg-quaternary)", strokeWidth: 2 },
          },
          prev,
        );
        emitChange(nodes, next);
        return next;
      });
    },
    [nodes],
  );

  function addBlock(blockType: BlockType) {
    const meta = getBlockMeta(blockType);
    if (meta.maxInstances) {
      const count = nodes.filter(
        (n) => (n.data as FlowBlockData).blockType === blockType,
      ).length;
      if (count >= meta.maxInstances) return;
    }

    const id = `${blockType}_${crypto.randomUUID().slice(0, 8)}`;
    const newNode: Node = {
      id,
      type: "flowBlock",
      position: { x: 250, y: 80 + nodes.length * 160 },
      data: {
        blockType,
        label: "",
        config: {},
      } satisfies FlowBlockData,
    };

    setNodes((prev) => {
      const next = [...prev, newNode];
      emitChange(next, edges);
      return next;
    });
    setSelectedNodeId(id);
  }

  function updateNodeLabel(nodeId: string, label: string) {
    setNodes((prev) => {
      const next = prev.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, label } as FlowBlockData }
          : n,
      );
      emitChange(next, edges);
      return next;
    });
  }

  function updateNodeConfig(
    nodeId: string,
    config: Record<string, unknown>,
  ) {
    setNodes((prev) => {
      const next = prev.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config } as FlowBlockData }
          : n,
      );
      emitChange(next, edges);
      return next;
    });
  }

  function deleteNode(nodeId: string) {
    setNodes((prev) => {
      const next = prev.filter((n) => n.id !== nodeId);
      const nextEdges = edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      );
      setEdges(nextEdges);
      emitChange(next, nextEdges);
      return next;
    });
    setSelectedNodeId(null);
  }

  const availableBlocks = BLOCK_REGISTRY.filter((block) => {
    if (!block.maxInstances) return true;
    const count = nodes.filter(
      (n) => (n.data as FlowBlockData).blockType === block.type,
    ).length;
    return count < block.maxInstances;
  });

  return (
    <div className="flex h-full">
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={readOnly ? null : "Backspace"}
          proOptions={{ hideAttribution: true }}
          className="bg-[var(--bg-canvas)]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--fg-quaternary)"
            style={{ opacity: 0.3 }}
          />
          <Controls
            showInteractive={false}
            className="!rounded-[var(--r-md)] !border-[var(--line-default)] !bg-[var(--bg-raised)] !shadow-sm [&>button]:!border-[var(--line-subtle)] [&>button]:!bg-[var(--bg-raised)] [&>button]:!fill-[var(--fg-secondary)] hover:[&>button]:!bg-[var(--bg-hover)]"
          />
          <MiniMap
            className="!rounded-[var(--r-md)] !border-[var(--line-default)] !bg-[var(--bg-sunken)]"
            nodeColor="var(--fg-quaternary)"
            maskColor="var(--bg-canvas)"
          />
        </ReactFlow>

        {!readOnly && (
          <div className="absolute left-4 top-4 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" />
                  Adicionar bloco
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {availableBlocks.map((block) => {
                  const Icon = block.icon;
                  return (
                    <DropdownMenuItem
                      key={block.type}
                      onClick={() => addBlock(block.type)}
                    >
                      <Icon
                        className="size-4"
                        style={{ color: block.color }}
                      />
                      <span>{block.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {selectedNodeId && selectedData && !readOnly && (
        <div className="w-[320px] shrink-0">
          <NodeConfigPanel
            nodeId={selectedNodeId}
            blockType={selectedData.blockType}
            label={selectedData.label}
            config={selectedData.config}
            onUpdateLabel={(label) => updateNodeLabel(selectedNodeId, label)}
            onUpdateConfig={(config) =>
              updateNodeConfig(selectedNodeId, config)
            }
            onDelete={() => deleteNode(selectedNodeId)}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      )}
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
