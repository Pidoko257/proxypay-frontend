import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { apiReferenceUrlFor, nodeTooltip } from './dependencyGraph.utils';

// ── Types ──────────────────────────────────────────────────────────
interface GraphNode {
  id: string;
  label: string;
  method: string;
  group: string;
  x: number;
  y: number;
  critical: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
  critical: boolean;
}

interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Mock Data ──────────────────────────────────────────────────────
const DEPENDENCY_GRAPH: DependencyGraph = {
  nodes: [
    // Layer 0 - Entry points
    { id: 'create-payment', label: 'POST /payments', method: 'POST', group: 'Payments', x: 400, y: 40, critical: true },
    { id: 'create-bulk', label: 'POST /payments/bulk', method: 'POST', group: 'Payments', x: 750, y: 40, critical: false },

    // Layer 1
    { id: 'validate-phone', label: 'POST /momo/validate', method: 'POST', group: 'Mobile Money', x: 200, y: 150, critical: true },
    { id: 'lookup-wallet', label: 'GET /wallets/{id}', method: 'GET', group: 'Wallets', x: 400, y: 150, critical: true },
    { id: 'check-balance', label: 'GET /wallets/{id}/balances', method: 'GET', group: 'Wallets', x: 580, y: 150, critical: false },
    { id: 'auth-verify', label: 'POST /auth/verify', method: 'POST', group: 'Authentication', x: 750, y: 150, critical: true },

    // Layer 2
    { id: 'momo-disburse', label: 'POST /momo/disburse', method: 'POST', group: 'Mobile Money', x: 100, y: 260, critical: true },
    { id: 'momo-lookup', label: 'GET /momo/lookup', method: 'GET', group: 'Mobile Money', x: 280, y: 260, critical: false },
    { id: 'convert-currency', label: 'POST /wallets/{id}/convert', method: 'POST', group: 'Wallets', x: 480, y: 260, critical: false },
    { id: 'bridge-v2', label: 'POST /bridge/v2', method: 'POST', group: 'Bridge', x: 680, y: 260, critical: true },

    // Layer 3
    { id: 'reconcile-daily', label: 'GET /reconciliation/daily', method: 'GET', group: 'Reconciliation', x: 250, y: 370, critical: false },
    { id: 'reconcile-summary', label: 'GET /reconciliation/summary', method: 'GET', group: 'Reconciliation', x: 500, y: 370, critical: false },
    { id: 'webhook-send', label: 'POST /webhooks', method: 'POST', group: 'Webhooks', x: 700, y: 370, critical: false },

    // Layer 4
    { id: 'payments-stream', label: 'GET /payments/stream', method: 'GET', group: 'Payments', x: 400, y: 470, critical: false },
  ],
  edges: [
    { from: 'create-payment', to: 'validate-phone', label: 'validates', critical: true },
    { from: 'create-payment', to: 'lookup-wallet', label: 'resolves', critical: true },
    { from: 'create-payment', to: 'check-balance', label: 'checks', critical: false },
    { from: 'create-payment', to: 'auth-verify', label: 'authenticates', critical: true },
    { from: 'create-bulk', to: 'validate-phone', label: 'validates × N', critical: false },
    { from: 'create-bulk', to: 'lookup-wallet', label: 'resolves × N', critical: false },

    { from: 'validate-phone', to: 'momo-lookup', label: 'queries', critical: false },
    { from: 'validate-phone', to: 'momo-disburse', label: 'triggers', critical: true },
    { from: 'lookup-wallet', to: 'convert-currency', label: 'converts', critical: false },
    { from: 'lookup-wallet', to: 'bridge-v2', label: 'settles', critical: true },
    { from: 'check-balance', to: 'convert-currency', label: 'roundtrips', critical: false },

    { from: 'momo-disburse', to: 'reconcile-daily', label: 'reports', critical: false },
    { from: 'momo-lookup', to: 'reconcile-daily', label: 'logs', critical: false },
    { from: 'bridge-v2', to: 'reconcile-summary', label: 'settles', critical: true },
    { from: 'convert-currency', to: 'reconcile-summary', label: 'tallies', critical: false },

    { from: 'reconcile-summary', to: 'webhook-send', label: 'notifies', critical: false },
    { from: 'reconcile-daily', to: 'webhook-send', label: 'notifies', critical: false },
    { from: 'webhook-send', to: 'payments-stream', label: 'streams', critical: false },
  ],
};

// ── Styles ─────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '2rem 1.5rem 4rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--ifm-color-primary-darkest, #1a5c32)',
    margin: 0,
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    marginBottom: '1rem',
    alignItems: 'center',
  },
  searchInput: {
    flex: '1 1 240px',
    padding: '0.6rem 1rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    fontSize: '0.95rem',
    outline: 'none',
  },
  filterSelect: {
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    fontSize: '0.9rem',
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
  },
  actionBtn: {
    padding: '0.45rem 1rem',
    borderRadius: 8,
    border: '1px solid #d0d5dd',
    background: '#fff',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#475569',
    transition: 'background 0.15s, border-color 0.15s',
  },
  graphWrapper: {
    position: 'relative' as const,
    background: '#fff',
    border: '1px solid #e8ecf0',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    cursor: 'grab',
    touchAction: 'none' as const,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '1.5rem',
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    background: '#f8fafc',
    borderRadius: 10,
    border: '1px solid #e8ecf0',
    fontSize: '0.8rem',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  tooltip: {
    position: 'absolute' as const,
    background: '#1e293b',
    color: '#fff',
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    fontSize: '0.8rem',
    pointerEvents: 'none' as const,
    zIndex: 10,
    whiteSpace: 'nowrap' as const,
    transition: 'opacity 0.15s',
  },
  detailsPanel: {
    marginTop: '1rem',
    padding: '1.25rem',
    background: '#fff',
    border: '1px solid #e8ecf0',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '2rem',
  },
};

// ── Main Component ─────────────────────────────────────────────────
export default function DependencyGraphViewer(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [depthFilter, setDepthFilter] = useState(5);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Compute visible nodes (BFS from all nodes filtered by depth)
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const searchLower = search.toLowerCase();

    // Find matching nodes
    let seedIds = DEPENDENCY_GRAPH.nodes
      .filter((n) => {
        if (!searchLower) return true;
        return (
          n.label.toLowerCase().includes(searchLower) ||
          n.group.toLowerCase().includes(searchLower)
        );
      })
      .map((n) => n.id);

    // BFS from seeds
    const visited = new Set<string>();
    const frontier: { id: string; depth: number }[] = seedIds.map((id) => ({ id, depth: 0 }));
    while (frontier.length > 0) {
      const { id, depth } = frontier.shift()!;
      if (visited.has(id) || depth > depthFilter) continue;
      visited.add(id);
      DEPENDENCY_GRAPH.edges.forEach((e) => {
        if (e.from === id && !visited.has(e.to))
          frontier.push({ id: e.to, depth: depth + 1 });
        if (e.to === id && !visited.has(e.from))
          frontier.push({ id: e.from, depth: depth + 1 });
      });
    }

    const nodes = DEPENDENCY_GRAPH.nodes.filter((n) => visited.has(n.id));
    const nodeIds = new Set(nodes.map((n) => n.id));
    let edges = DEPENDENCY_GRAPH.edges.filter(
      (e) => nodeIds.has(e.from) && nodeIds.has(e.to)
    );

    if (showCriticalOnly) {
      edges = edges.filter((e) => e.critical);
      const criticalNodes = new Set<string>();
      edges.forEach((e) => { criticalNodes.add(e.from); criticalNodes.add(e.to); });
      return {
        visibleNodes: nodes.filter((n) => criticalNodes.has(n.id)),
        visibleEdges: edges,
      };
    }

    return { visibleNodes: nodes, visibleEdges: edges };
  }, [search, depthFilter, showCriticalOnly]);

  const highlightedNodes = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const s = new Set<string>([selectedNode]);
    DEPENDENCY_GRAPH.edges.forEach((e) => {
      if (e.from === selectedNode) s.add(e.to);
      if (e.to === selectedNode) s.add(e.from);
    });
    return s;
  }, [selectedNode]);

  const selectedNodeData = selectedNode
    ? DEPENDENCY_GRAPH.nodes.find((n) => n.id === selectedNode) || null
    : null;

  const relatedEdges = selectedNode
    ? DEPENDENCY_GRAPH.edges.filter(
        (e) => e.from === selectedNode || e.to === selectedNode
      )
    : [];

  // Zoom/Pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.3, Math.min(3, prev.scale * delta)),
    }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'rect' || (e.target as SVGElement).closest('[data-node]')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: t.clientX - transform.x, y: t.clientY - transform.y });
    }
  }, [transform]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPanning || e.touches.length !== 1) return;
      const t = e.touches[0];
      setTransform((prev) => ({
        ...prev,
        x: t.clientX - panStart.x,
        y: t.clientY - panStart.y,
      }));
    },
    [isPanning, panStart]
  );

  const handleTouchEnd = useCallback(() => setIsPanning(false), []);

  // Export as image
  const handleExport = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = svgRef.current!.getBoundingClientRect().width * 2;
      canvas.height = svgRef.current!.getBoundingClientRect().height * 2;
      ctx!.scale(2, 2);
      ctx!.fillStyle = '#ffffff';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'proxypay-dependency-graph.png';
      a.click();
    };
    img.src = url;
  }, []);

  const openApiReference = useCallback((node: GraphNode) => {
    const url = apiReferenceUrlFor(node);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const degreeOf = useCallback(
    (id: string) =>
      DEPENDENCY_GRAPH.edges.filter((e) => e.from === id || e.to === id).length,
    []
  );

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    DEPENDENCY_GRAPH.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, []);

  const groupColors: Record<string, string> = {
    Payments: '#3b82f6',
    'Mobile Money': '#8b5cf6',
    Wallets: '#22c55e',
    Authentication: '#f59e0b',
    Bridge: '#ef4444',
    Reconciliation: '#06b6d4',
    Webhooks: '#ec4899',
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔗 Endpoint Dependency Graph</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={styles.actionBtn} onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}>
            🔄 Reset View
          </button>
          <button style={styles.actionBtn} onClick={handleExport}>
            📸 Export PNG
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
        Interactive directed graph showing how endpoints depend on each other.{' '}
        <strong>Click a node</strong> to see its relationships;{' '}
        <strong>double-click</strong> (or use the link in the details panel) to open its
        API reference. <strong>Scroll</strong> to zoom; <strong>drag</strong> to pan.
      </p>

      {/* Controls */}
      <div style={styles.controls}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="🔍 Search by endpoint or group…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.filterSelect}
          value={depthFilter}
          onChange={(e) => setDepthFilter(Number(e.target.value))}
        >
          <option value={1}>Depth: 1</option>
          <option value={2}>Depth: 2</option>
          <option value={3}>Depth: 3</option>
          <option value={4}>Depth: 4</option>
          <option value={5}>Depth: 5 (All)</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showCriticalOnly}
            onChange={(e) => setShowCriticalOnly(e.target.checked)}
          />
          Critical paths only
        </label>
      </div>

      {/* Graph */}
      <div
        ref={wrapperRef}
        style={{ ...styles.graphWrapper, height: 550 }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {tooltip && (
          <div
            style={{
              ...styles.tooltip,
              left: tooltip.x + 10,
              top: tooltip.y - 10,
            }}
          >
            {tooltip.text}
          </div>
        )}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        >
          <defs>
            <marker
              id="arrowhead"
              viewBox="0 0 10 7"
              refX={10}
              refY={3.5}
              markerWidth={8}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
            <marker
              id="arrowhead-critical"
              viewBox="0 0 10 7"
              refX={10}
              refY={3.5}
              markerWidth={8}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
          </defs>

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            {/* Edges */}
            {visibleEdges.map((edge) => {
              const from = nodeById.get(edge.from);
              const to = nodeById.get(edge.to);
              if (!from || !to) return null;
              const isHighlighted =
                !selectedNode || edge.from === selectedNode || edge.to === selectedNode;
              const isCritical = edge.critical;
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  {/* Visible hit area */}
                  <line
                    x1={from.x}
                    y1={from.y + 20}
                    x2={to.x}
                    y2={to.y - 20}
                    stroke="transparent"
                    strokeWidth={12}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) =>
                      setTooltip({
                        x: e.nativeEvent.offsetX,
                        y: e.nativeEvent.offsetY,
                        text: `${edge.label}: ${edge.from} → ${edge.to}`,
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                  <line
                    x1={from.x}
                    y1={from.y + 20}
                    x2={to.x}
                    y2={to.y - 20}
                    stroke={
                      !isHighlighted
                        ? '#e2e8f0'
                        : isCritical
                        ? '#ef4444'
                        : '#94a3b8'
                    }
                    strokeWidth={isCritical ? 2.5 : 1.5}
                    strokeDasharray={edge.critical ? undefined : '5,3'}
                    markerEnd={
                      isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'
                    }
                    opacity={isHighlighted ? 1 : 0.25}
                  />
                  {/* Edge label */}
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fill={isHighlighted ? '#64748b' : '#cbd5e1'}
                    fontWeight={500}
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {visibleNodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const isHighlighted = highlightedNodes.has(node.id);
              const color = groupColors[node.group] || '#94a3b8';
              const opacity = selectedNode ? (isHighlighted ? 1 : 0.35) : 1;

              return (
                <g
                  key={node.id}
                  data-node={node.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setSelectedNode((prev) => (prev === node.id ? null : node.id))
                  }
                  onDoubleClick={() => openApiReference(node)}
                  onMouseEnter={(e) => {
                    if (!selectedNode)
                      setTooltip({
                        x: e.nativeEvent.offsetX,
                        y: e.nativeEvent.offsetY,
                        text: nodeTooltip(node, degreeOf(node.id)),
                      });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  opacity={opacity}
                >
                  {/* Node shadow */}
                  <rect
                    x={node.x - 80}
                    y={node.y - 18}
                    width={160}
                    height={36}
                    rx={10}
                    ry={10}
                    fill={color}
                    opacity={0.15}
                    transform="translate(2, 2)"
                  />
                  {/* Node body */}
                  <rect
                    x={node.x - 80}
                    y={node.y - 18}
                    width={160}
                    height={36}
                    rx={10}
                    ry={10}
                    fill={isSelected ? color : '#fff'}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : node.critical ? 2 : 1.5}
                    transition="all 0.2s"
                  />
                  {/* Method badge */}
                  <rect
                    x={node.x - 76}
                    y={node.y - 12}
                    width={28}
                    height={18}
                    rx={4}
                    fill={color}
                    opacity={0.15}
                  />
                  <text
                    x={node.x - 62}
                    y={node.y + 2}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill={color}
                  >
                    {node.method}
                  </text>
                  {/* Label */}
                  <text
                    x={node.x - 42}
                    y={node.y + 3}
                    textAnchor="start"
                    fontSize={11}
                    fontWeight={600}
                    fill={isSelected ? '#fff' : '#1e293b'}
                  >
                    {node.label.length > 20 ? node.label.slice(0, 19) + '…' : node.label}
                  </text>
                  {/* Critical badge */}
                  {node.critical && (
                    <text x={node.x + 68} y={node.y + 3} fontSize={11} fill="#ef4444">
                      ⚡
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(groupColors).map(([group, color]) => (
          <div key={group} style={styles.legendItem}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: color,
              }}
            />
            <span>{group}</span>
          </div>
        ))}
        <div style={styles.legendItem}>
          <div style={{ width: 20, height: 2, background: '#ef4444' }} />
          <span>Critical path</span>
        </div>
        <div style={styles.legendItem}>
          <div
            style={{ width: 20, height: 2, background: '#94a3b8', border: '1px dashed #94a3b8' }}
          />
          <span>Non-critical</span>
        </div>
      </div>

      {/* Details Panel */}
      {selectedNodeData && (
        <div style={styles.detailsPanel}>
          <div>
            <h3
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#1e293b',
              }}
            >
              {selectedNodeData.label}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              <strong>Method:</strong> {selectedNodeData.method} ·{' '}
              <strong>Group:</strong> {selectedNodeData.group} ·{' '}
              <strong>Critical:</strong>{' '}
              <span style={{ color: selectedNodeData.critical ? '#ef4444' : '#22c55e' }}>
                {selectedNodeData.critical ? 'Yes ⚡' : 'No'}
              </span>
            </p>
            <a
              href={apiReferenceUrlFor(selectedNodeData)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '0.6rem',
                padding: '0.4rem 0.9rem',
                borderRadius: 8,
                background: 'var(--ifm-color-primary, #1a5c32)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Open in API Reference ↗
            </a>
          </div>
          <div>
            <h4
              style={{
                margin: '0 0 0.35rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              Relationships ({relatedEdges.length})
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#64748b' }}>
              {relatedEdges.map((e) => {
                const isOutgoing = e.from === selectedNode;
                const otherNode = isOutgoing
                  ? DEPENDENCY_GRAPH.nodes.find((n) => n.id === e.to)
                  : DEPENDENCY_GRAPH.nodes.find((n) => n.id === e.from);
                return (
                  <li key={`${e.from}-${e.to}`}>
                    {isOutgoing ? '→' : '←'}{' '}
                    <code style={{ background: '#f1f5f9', padding: '0.05rem 0.35rem', borderRadius: 3 }}>
                      {otherNode?.label ?? (isOutgoing ? e.to : e.from)}
                    </code>{' '}
                    — <em>{e.label}</em>
                    {e.critical && (
                      <span style={{ color: '#ef4444', marginLeft: 4 }}>⚡ critical</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
