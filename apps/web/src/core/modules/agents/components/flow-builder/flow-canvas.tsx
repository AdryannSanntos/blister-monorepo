"use client";

import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  addEdge as rfAddEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo } from "react";
import type { BlockTypeKey } from "./block-types";
import { FlowBlockNode } from "./flow-block-node";

type Props = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  readOnly?: boolean;
};

const nodeTypes: NodeTypes = {
  block: FlowBlockNode,
};

function FlowCanvasInner({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onNodesChange,
  onEdgesChange,
  readOnly,
}: Props) {
  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          onConfigure: () => onSelectNode(node.id),
        },
      })),
    [nodes, selectedNodeId, onSelectNode],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(applyNodeChanges(changes, nodes));
    },
    [nodes, onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(applyEdgeChanges(changes, edges));
    },
    [edges, onEdgesChange],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      onEdgesChange(rfAddEdge(connection, edges));
    },
    [edges, onEdgesChange],
  );

  return (
    <ReactFlow
      nodes={decoratedNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onPaneClick={() => onSelectNode(null)}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      edgesFocusable={!readOnly}
      fitView
      defaultEdgeOptions={{
        style: { stroke: "var(--line-default)", strokeWidth: 1.5 },
      }}
    >
      <Background color="var(--line-subtle)" gap={20} />
      <Controls
        showInteractive={false}
        className="!border !border-[var(--line-default)] !bg-[var(--bg-base)] !shadow-sm"
      />
      <MiniMap
        pannable
        zoomable
        maskColor="color-mix(in oklch, var(--bg-canvas) 70%, transparent)"
        className="!border !border-[var(--line-default)] !bg-[var(--bg-base)]"
      />
    </ReactFlow>
  );
}

export function FlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export type { BlockTypeKey };
