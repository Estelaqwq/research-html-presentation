"use client";

import type { FlowNode, FlowSpec } from "./EvidenceVisualizationTypes";

const roleLabel: Record<FlowNode["role"], string> = { input: "输入", process: "处理", output: "输出", validation: "验证", decision: "判断", evidence: "证据", feedback: "反馈" };
const normalizeFlowCopy = (value?: string) => String(value ?? "").replace(/[\s·：:，,。.;；()（）\-—_]/g, "").toLowerCase();
const meaningfulEdgeLabel = (label: string | undefined, fromNode?: FlowNode, toNode?: FlowNode) => {
  const normalized = normalizeFlowCopy(label);
  if (!normalized) return undefined;
  const adjacent = [fromNode, toNode].filter(Boolean).flatMap((node) => [node!.label, node!.eyebrow, node!.value, roleLabel[node!.role]]).map(normalizeFlowCopy).filter(Boolean);
  return adjacent.includes(normalized) ? undefined : label!.trim();
};
type Box = { x: number; y: number; width: number; height: number };
const sizeOf = (node: FlowNode, presentation: FlowSpec["presentation"] = "standard") => {
  if (presentation === "hero") return node.size === "small" ? { width: 190, height: 108 } : node.size === "large" ? { width: 230, height: 132 } : { width: 210, height: 120 };
  return node.size === "large" ? { width: 230, height: 98 } : node.size === "small" ? { width: 158, height: 70 } : { width: 190, height: 82 };
};

function layoutNodes(spec: FlowSpec, width: number, height: number) {
  const layout = spec.layout ?? "horizontal";
  const presentation = spec.presentation ?? "standard";
  const boxes = new Map<string, Box>();
  if (layout === "radial-mechanism") {
    const center = spec.nodes[0];
    if (center) boxes.set(center.id, { x: width / 2 - 115, y: height / 2 - 49, width: 230, height: 98 });
    const outer = spec.nodes.slice(1);
    outer.forEach((node, index) => { const size = sizeOf(node, presentation); const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(1, outer.length); boxes.set(node.id, { x: width / 2 + Math.cos(angle) * 410 - size.width / 2, y: height / 2 + Math.sin(angle) * 175 - size.height / 2, ...size }); });
    return boxes;
  }
  if (layout === "vertical") {
    spec.nodes.forEach((node, index) => { const size = sizeOf(node, presentation); boxes.set(node.id, { x: width / 2 - size.width / 2, y: 34 + index * ((height - 68 - size.height) / Math.max(1, spec.nodes.length - 1)), ...size }); });
    return boxes;
  }
  if (layout === "swimlane") {
    const lanes = spec.lanes?.length ? spec.lanes : [...new Set(spec.nodes.map((node) => node.group).filter(Boolean))].map((id) => ({ id: String(id), label: String(id) }));
    const laneIds = lanes.length ? lanes.map((lane) => lane.id) : ["main"];
    const laneHeight = (height - 42) / laneIds.length;
    for (const [laneIndex, laneId] of laneIds.entries()) {
      const nodes = spec.nodes.filter((node) => (node.group ?? "main") === laneId);
      nodes.forEach((node, index) => { const size = sizeOf(node, presentation); boxes.set(node.id, { x: 150 + index * ((width - 205 - size.width) / Math.max(1, nodes.length - 1)), y: 28 + laneIndex * laneHeight + laneHeight / 2 - size.height / 2, ...size }); });
    }
    return boxes;
  }
  if (["branch-merge", "feedback-loop", "input-process-output-validation", "main-with-evidence"].includes(layout)) {
    const order = spec.readingOrder?.length ? spec.readingOrder : spec.nodes.map((node) => node.id);
    const ordered = order.map((id) => spec.nodes.find((node) => node.id === id)).filter((node): node is FlowNode => Boolean(node));
    const main = ordered.filter((node) => !node.group || node.group === "main");
    const support = ordered.filter((node) => node.group && node.group !== "main");
    main.forEach((node, index) => { const size = sizeOf(node, presentation); boxes.set(node.id, { x: 34 + index * ((width - 68 - size.width) / Math.max(1, main.length - 1)), y: height * .54 - size.height / 2, ...size }); });
    support.forEach((node, index) => { const size = sizeOf(node, presentation); boxes.set(node.id, { x: 110 + index * ((width - 220 - size.width) / Math.max(1, support.length - 1)), y: index % 2 ? height - size.height - 28 : 30, ...size }); });
    return boxes;
  }
  spec.nodes.forEach((node, index) => { const size = sizeOf(node, presentation); boxes.set(node.id, { x: 34 + index * ((width - 68 - size.width) / Math.max(1, spec.nodes.length - 1)), y: height / 2 - size.height / 2, ...size }); });
  return boxes;
}

const port = (box: Box, target: Box) => {
  const horizontal = Math.abs((target.x + target.width / 2) - (box.x + box.width / 2)) >= Math.abs((target.y + target.height / 2) - (box.y + box.height / 2));
  if (horizontal) return { x: target.x >= box.x ? box.x + box.width : box.x, y: box.y + box.height / 2 };
  return { x: box.x + box.width / 2, y: target.y >= box.y ? box.y + box.height : box.y };
};

export function FlowDiagram({ spec, className = "", ariaLabel }: { spec: FlowSpec; className?: string; ariaLabel?: string }) {
  const presentation = spec.presentation ?? "standard";
  const width = presentation === "hero" && (spec.layout ?? "horizontal") === "horizontal" ? Math.max(1200, spec.nodes.length * 250 + 100) : 1200;
  const height = spec.layout === "vertical" ? Math.max(520, 96 + spec.nodes.length * 112) : presentation === "hero" ? Math.max(360, (spec.lanes?.length ?? 0) * 150 + 56) : Math.max(430, (spec.lanes?.length ?? 0) * 150 + 56);
  const boxes = layoutNodes(spec, width, height);
  const marker = `flow-arrow-${spec.id}`;
  const feedbackMarker = `flow-feedback-arrow-${spec.id}`;
  return <div className={`flow-diagram presentation-${presentation} layout-${spec.layout ?? "horizontal"} ${className}`} data-flow-id={spec.id} data-flow-layout={spec.layout ?? "horizontal"} data-flow-presentation={presentation} data-flow-valid="true" data-substantive-region="true">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel ?? "科研流程图"} preserveAspectRatio="xMidYMid meet">
      <defs><marker id={marker} markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" /></marker><marker id={feedbackMarker} markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path className="flow-feedback-marker" d="M0,0 L8,4 L0,8 z" /></marker></defs>
      {spec.layout === "swimlane" ? (spec.lanes ?? []).map((lane, index) => <g className="flow-lane" key={lane.id}><rect x="10" y={18 + index * ((height - 36) / spec.lanes!.length)} width={width - 20} height={(height - 36) / spec.lanes!.length - 4} /><text x="24" y={48 + index * ((height - 36) / spec.lanes!.length)}>{lane.label}</text></g>) : null}
      {spec.edges.map((edge, index) => {
        const fromBox = boxes.get(edge.from); const toBox = boxes.get(edge.to); if (!fromBox || !toBox) return null;
        const fromNode = spec.nodes.find((node) => node.id === edge.from); const toNode = spec.nodes.find((node) => node.id === edge.to); const edgeLabel = meaningfulEdgeLabel(edge.label, fromNode, toNode);
        const from = port(fromBox, toBox); const to = port(toBox, fromBox); const midX = (from.x + to.x) / 2; const midY = (from.y + to.y) / 2;
        const d = edge.kind === "feedback" ? `M ${from.x} ${from.y} C ${from.x + 72} ${from.y + 118}, ${to.x - 72} ${to.y + 118}, ${to.x} ${to.y}` : Math.abs(from.x - to.x) > Math.abs(from.y - to.y) ? `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}` : `M ${from.x} ${from.y} V ${midY} H ${to.x} V ${to.y}`;
        return <g key={`${edge.from}-${edge.to}-${index}`} className={`flow-edge is-${edge.kind}`} data-flow-from={edge.from} data-flow-to={edge.to}><path data-flow-edge-path="true" d={d} markerEnd={edge.directed ? `url(#${edge.kind === "feedback" ? feedbackMarker : marker})` : undefined} />{edgeLabel ? <text data-flow-edge-label="true" x={midX} y={midY - 8} textAnchor="middle" style={{ paintOrder: "stroke", stroke: "var(--surface-0, #fff)", strokeWidth: 8, strokeLinejoin: "round" }}>{edgeLabel}</text> : null}</g>;
      })}
      {spec.nodes.map((node) => { const box = boxes.get(node.id); if (!box) return null; const role = node.eyebrow ?? roleLabel[node.role]; return <g key={node.id} className={`flow-node role-${node.role} emphasis-${node.emphasis ?? "normal"} size-${node.size ?? "medium"}`} data-flow-node={node.id} data-flow-role={node.role} data-evidence-ref={node.evidenceRef}><rect x={box.x} y={box.y} width={box.width} height={box.height} rx="4" /><text className="flow-role" x={box.x + 13} y={box.y + 23}>{role}</text><text className="flow-label" x={box.x + 13} y={box.y + (presentation === "hero" ? 58 : box.height * .65)}>{node.label}</text>{node.detail ? <text className="flow-detail" x={box.x + 13} y={box.y + 84}>{node.detail}</text> : null}{node.value ? <text className="flow-value" x={box.x + 13} y={box.y + box.height - 13}>{node.value}</text> : null}</g>; })}
    </svg>
  </div>;
}
