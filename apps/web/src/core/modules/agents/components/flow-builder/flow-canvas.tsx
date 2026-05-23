"use client";

import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  getBezierPath,
  type Node,
  type NodeChange,
  type NodeTypes,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  addEdge as rfAddEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Minus, Plus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { Button } from "src/core/shared/components/ui/button";
import { cn } from "src/core/shared/utils";
import { BLOCK_CATEGORIES, BLOCK_TYPES, type BlockTypeKey } from "./block-types";
import { FlowBlockNode } from "./flow-block-node";
import { WORKFLOW_BLOCK_DRAG_TYPE } from "./workflow-sidebar";

type Props = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  openMenuNodeId: string | null;
  onOpenMenuNodeChange: (nodeId: string | null) => void;
  onSelectNode: (nodeId: string | null) => void;
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onAddBlock?: (
    blockType: BlockTypeKey,
    position: { x: number; y: number },
  ) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  readOnly?: boolean;
};

function FlowDeleteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [snap, setSnap] = useState<{ x: number; y: number } | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const hovered = snap !== null;

  function projectOntoPath(clientX: number, clientY: number) {
    const visiblePath = pathRef.current;
    if (!visiblePath) return null;
    const svg = visiblePath.ownerSVGElement;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const local = pt.matrixTransform(ctm.inverse());

    const total = visiblePath.getTotalLength();
    if (total === 0) return null;

    const samples = 80;
    let best = visiblePath.getPointAtLength(0);
    let bestT = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= samples; i++) {
      const t = (total * i) / samples;
      const p = visiblePath.getPointAtLength(t);
      const d = (p.x - local.x) ** 2 + (p.y - local.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = p;
        bestT = t;
      }
    }
    const step = total / samples;
    let lo = Math.max(0, bestT - step);
    let hi = Math.min(total, bestT + step);
    for (let iter = 0; iter < 12; iter++) {
      const mid1 = lo + (hi - lo) / 3;
      const mid2 = hi - (hi - lo) / 3;
      const p1 = visiblePath.getPointAtLength(mid1);
      const p2 = visiblePath.getPointAtLength(mid2);
      const d1 = (p1.x - local.x) ** 2 + (p1.y - local.y) ** 2;
      const d2 = (p2.x - local.x) ** 2 + (p2.y - local.y) ** 2;
      if (d1 < d2) {
        hi = mid2;
        if (d1 < bestDist) {
          bestDist = d1;
          best = p1;
        }
      } else {
        lo = mid1;
        if (d2 < bestDist) {
          bestDist = d2;
          best = p2;
        }
      }
    }
    return { x: best.x, y: best.y };
  }

  return (
    <g
      onMouseLeave={() => setSnap(null)}
      onMouseMove={(event) => {
        const projected = projectOntoPath(event.clientX, event.clientY);
        if (projected) setSnap(projected);
      }}
    >
      <path
        ref={pathRef}
        d={path}
        style={style}
        markerEnd={markerEnd}
        fill="none"
      />
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={36}
        style={{ cursor: "pointer" }}
      />
      {snap && (
        <foreignObject
          x={snap.x - 9}
          y={snap.y - 9}
          width={18}
          height={18}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <button
            type="button"
            className="pointer-events-auto flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--bg-raised)] text-[var(--fg-secondary)] shadow-[var(--shadow-md)] transition-colors duration-150 ease-out hover:border-[var(--danger)] hover:bg-[color-mix(in_oklch,var(--danger)_18%,var(--bg-raised))] hover:text-[var(--danger)]"
            onClick={(event) => {
              event.stopPropagation();
              (data as { onDeleteEdge?: (id: string) => void })?.onDeleteEdge?.(
                id,
              );
            }}
            aria-label="Excluir conexão"
          >
            <X className="size-2.5" strokeWidth={2.5} />
          </button>
        </foreignObject>
      )}
    </g>
  );
}

const nodeTypes: NodeTypes = {
  block: FlowBlockNode,
};

const edgeTypes = {
  deletable: FlowDeleteEdge,
};

function FlowZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="bottom-left" className="!m-3">
      <div className="flex flex-col gap-1 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-1 shadow-[var(--shadow-md)] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Aumentar zoom"
          onClick={() => zoomIn({ duration: 200 })}
          className="transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Diminuir zoom"
          onClick={() => zoomOut({ duration: 200 })}
          className="transition-transform hover:scale-105 active:scale-95"
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Ajustar à tela"
          onClick={() => fitView({ duration: 250, padding: 0.2 })}
          className="transition-transform hover:scale-105 active:scale-95"
        >
          <Maximize2 className="size-3.5" />
        </Button>
      </div>
    </Panel>
  );
}

function FlowCanvasInner({
  nodes,
  edges,
  selectedNodeId,
  openMenuNodeId,
  onOpenMenuNodeChange,
  onSelectNode,
  onNodesChange,
  onEdgesChange,
  onAddBlock,
  onDeleteNode,
  onDeleteEdge,
  readOnly,
}: Props) {
  const { screenToFlowPosition } = useReactFlow();
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<
    | {
        screen: { x: number; y: number };
        flow: { x: number; y: number };
      }
    | null
  >(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [contextMenu]);
  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          onConfigure: () => onSelectNode(node.id),
          onDelete: () => onDeleteNode?.(node.id),
          menuOpen: openMenuNodeId === node.id,
          onMenuOpenChange: (open: boolean) =>
            onOpenMenuNodeChange(open ? node.id : null),
        },
      })),
    [
      nodes,
      selectedNodeId,
      onSelectNode,
      onDeleteNode,
      openMenuNodeId,
      onOpenMenuNodeChange,
    ],
  );

  const decoratedEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        type: "deletable",
        data: { ...e.data, onDeleteEdge },
      })),
    [edges, onDeleteEdge],
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

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (readOnly || !onAddBlock) return;
      if (!event.dataTransfer.types.includes(WORKFLOW_BLOCK_DRAG_TYPE)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [onAddBlock, readOnly],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (readOnly || !onAddBlock) return;
      event.preventDefault();
      const blockType = event.dataTransfer.getData(
        WORKFLOW_BLOCK_DRAG_TYPE,
      ) as BlockTypeKey;
      if (!blockType) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onAddBlock(blockType, position);
    },
    [onAddBlock, readOnly, screenToFlowPosition],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[var(--bg-sunken)]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={(event) => {
        if (readOnly || !onAddBlock) return;
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        setContextMenu({
          screen: {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
          flow: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        });
      }}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });
      }}
      onMouseLeave={() => setPointer(null)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
        style={{
          background: pointer
            ? `radial-gradient(280px circle at ${pointer.x}px ${pointer.y}px, color-mix(in oklch, var(--accent) 14%, transparent), transparent 65%)`
            : "transparent",
        }}
      />
      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => {
          onSelectNode(null);
          onOpenMenuNodeChange(null);
        }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesFocusable={!readOnly}
        fitView
        className="relative z-0"
        defaultEdgeOptions={{
          style: { stroke: "var(--accent)", strokeWidth: 1.5, opacity: 0.7 },
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          color="color-mix(in oklch, var(--fg-primary) 28%, transparent)"
          gap={24}
          lineWidth={1}
        />
        <Background
          variant={BackgroundVariant.Lines}
          color="color-mix(in oklch, var(--fg-primary) 50%, transparent)"
          gap={120}
          lineWidth={1.4}
          id="grid-major"
        />
        <FlowZoomControls />
      </ReactFlow>
      {contextMenu ? (
        <RadialBlockPicker
          screen={contextMenu.screen}
          onPick={(blockType) => {
            onAddBlock?.(blockType, contextMenu.flow);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}

function RadialBlockPicker({
  screen,
  onPick,
  onClose,
}: {
  screen: { x: number; y: number };
  onPick: (blockType: BlockTypeKey) => void;
  onClose: () => void;
}) {
  const blocks = useMemo(() => Object.values(BLOCK_TYPES), []);
  const radius = 88;
  const itemSize = 56;
  const [hovered, setHovered] = useState<BlockTypeKey | null>(null);
  const hoveredBlock = hovered ? BLOCK_TYPES[hovered] : null;
  const hoveredCategory = hoveredBlock
    ? BLOCK_CATEGORIES[hoveredBlock.category]
    : null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu de blocos"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
        className="absolute inset-0 z-30 cursor-default bg-[color-mix(in_oklch,var(--bg-canvas)_55%,transparent)] backdrop-blur-[2px] animate-in fade-in-0 duration-150"
      />
      <div
        role="menu"
        className="pointer-events-none absolute z-40"
        style={{
          left: screen.x,
          top: screen.y,
          width: 0,
          height: 0,
        }}
      >
        <div className="pointer-events-auto relative -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 zoom-in-50 duration-200 ease-out">
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line-strong)] bg-[var(--bg-base)] shadow-[var(--shadow-xl)]"
            style={{
              width: radius * 2 + itemSize + 16,
              height: radius * 2 + itemSize + 16,
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--bg-base) 92%, transparent), color-mix(in oklch, var(--bg-base) 70%, transparent))",
            }}
          />
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line-default)] bg-[var(--bg-raised)] shadow-[var(--shadow-md)]"
            style={{
              width: 88,
              height: 88,
            }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--fg-quaternary)]">
                {hoveredCategory?.label ?? "Adicionar"}
              </p>
              <p className="mt-1 line-clamp-2 text-[10.5px] leading-[1.3] text-[var(--fg-secondary)]">
                {hoveredBlock?.label ?? "Solte sobre um bloco"}
              </p>
            </div>
          </div>
          {blocks.map((block, idx) => {
            const angle = (idx / blocks.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const Icon = block.icon;
            const isHovered = hovered === block.key;
            return (
              <button
                key={block.key}
                type="button"
                onClick={() => onPick(block.key)}
                onMouseEnter={() => setHovered(block.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  left: x,
                  top: y,
                  width: itemSize,
                  height: itemSize,
                  animationDelay: `${idx * 35}ms`,
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[var(--bg-raised)] text-[var(--fg-secondary)] shadow-[var(--shadow-md)] transition-all duration-200 ease-out",
                  "flex items-center justify-center",
                  "animate-in fade-in-0 zoom-in-50 fill-mode-both",
                  isHovered
                    ? "scale-110 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_8px_24px_color-mix(in_oklch,var(--accent)_35%,transparent)]"
                    : "border-[var(--line-strong)] hover:border-[var(--accent)]/60",
                )}
                aria-label={block.label}
              >
                <Icon className={cn("size-5", isHovered ? "" : block.tone)} />
              </button>
            );
          })}
        </div>
      </div>
    </>
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
