import React, { useState, useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import styles from './DependencyGraph.module.css';

export interface Node {
  id: string;
  label: string;
  critical?: boolean;
  group?: string;
}

export interface Edge {
  from: string;
  to: string;
  critical?: boolean;
  label?: string;
  highlighted?: boolean;
}

export interface DependencyGraphProps {
  nodes: Node[];
  edges: Edge[];
  onlyShowCritical?: boolean;
  highlightCritical?: boolean;
}

export default function DependencyGraph({
  nodes,
  edges,
  onlyShowCritical = false,
  highlightCritical = true,
}: DependencyGraphProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [showCriticalOnly, setShowCriticalOnly] = useState(onlyShowCritical);

  useEffect(() => {
    if (!containerRef.current) return;

    // Filter nodes and edges based on critical flag
    const filteredNodes = showCriticalOnly
      ? nodes.filter(n => n.critical || edges.some(e => (e.from === n.id || e.to === n.id) && e.critical))
      : nodes;

    const filteredEdges = showCriticalOnly
      ? edges.filter(e => e.critical)
      : edges;

    // Create vis-network datasets
    const nodeData = filteredNodes.map(node => ({
      id: node.id,
      label: node.label,
      color: highlightCritical && node.critical ? '#ff6b6b' : '#4c72b0',
      font: { size: 14, color: '#fff' },
      shape: 'box',
      padding: 10,
    }));

    const edgeData = filteredEdges.map(edge => ({
      from: edge.from,
      to: edge.to,
      label: edge.label || '',
      color: highlightCritical && edge.critical ? '#ff6b6b' : '#888',
      width: edge.critical ? 3 : 1,
      font: { size: 12 },
      arrows: 'to',
    }));

    const data = { 
      nodes: nodeData as any, 
      edges: edgeData as any 
    };

    const options = {
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -26000,
          centralGravity: 0.005,
          springLength: 200,
          springConstant: 0.18,
        },
      },
      interaction: {
        navigationButtons: true,
        keyboard: true,
      },
    };

    // Create or update network
    if (networkRef.current) {
      networkRef.current.destroy();
    }

    networkRef.current = new Network(containerRef.current, data, options);
  }, [nodes, edges, showCriticalOnly, highlightCritical]);

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <label>
          <input
            type="checkbox"
            checked={showCriticalOnly}
            onChange={e => setShowCriticalOnly(e.target.checked)}
          />
          Show only critical dependencies
        </label>
      </div>
      <div ref={containerRef} className={styles.graph} />
    </div>
  );
}
