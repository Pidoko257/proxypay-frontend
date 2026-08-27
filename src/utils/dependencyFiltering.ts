import type { Node, Edge } from '../components/DependencyGraph';

/**
 * Filter nodes to show only critical ones and their connected nodes
 */
export function filterCriticalNodes(nodes: Node[], edges: Edge[]): Node[] {
  const criticalNodeIds = new Set<string>();

  // Add explicitly critical nodes
  nodes.forEach(node => {
    if (node.critical) {
      criticalNodeIds.add(node.id);
    }
  });

  // Add nodes connected to critical edges
  edges.forEach(edge => {
    if (edge.critical) {
      criticalNodeIds.add(edge.from);
      criticalNodeIds.add(edge.to);
    }
  });

  return nodes.filter(node => criticalNodeIds.has(node.id));
}

/**
 * Filter edges to show only critical ones
 */
export function filterCriticalEdges(edges: Edge[]): Edge[] {
  return edges.filter(edge => edge.critical);
}

/**
 * Find all critical paths in the dependency graph
 * A critical path is a sequence of critical edges
 */
export function findCriticalPaths(
  nodes: Node[],
  edges: Edge[]
): Array<Array<string>> {
  const criticalEdges = edges.filter(e => e.critical);
  if (criticalEdges.length === 0) return [];

  const paths: Array<Array<string>> = [];
  const visited = new Set<string>();

  function dfs(nodeId: string, currentPath: string[]) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    currentPath.push(nodeId);

    const outgoing = criticalEdges.filter(e => e.from === nodeId);

    if (outgoing.length === 0) {
      // Leaf node, save the path
      paths.push([...currentPath]);
    } else {
      for (const edge of outgoing) {
        dfs(edge.to, currentPath);
      }
    }

    currentPath.pop();
    visited.delete(nodeId);
  }

  // Find all starting nodes (nodes with no incoming critical edges)
  const incomingNodes = new Set(criticalEdges.map(e => e.to));
  const startNodes = nodes.filter(
    n => criticalEdges.some(e => e.from === n.id) && !incomingNodes.has(n.id)
  );

  for (const startNode of startNodes) {
    dfs(startNode.id, []);
  }

  return paths;
}

/**
 * Highlight critical paths in the graph
 */
export function highlightCriticalPaths(
  edges: Edge[],
  criticalPaths: Array<Array<string>>
): Edge[] {
  const criticalPathEdges = new Set<string>();

  for (const path of criticalPaths) {
    for (let i = 0; i < path.length - 1; i++) {
      const edgeKey = `${path[i]}->${path[i + 1]}`;
      criticalPathEdges.add(edgeKey);
    }
  }

  return edges.map(edge => ({
    ...edge,
    highlighted: criticalPathEdges.has(`${edge.from}->${edge.to}`),
  }));
}
