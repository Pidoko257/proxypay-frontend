import {
  filterCriticalNodes,
  filterCriticalEdges,
  findCriticalPaths,
  highlightCriticalPaths,
} from '../utils/dependencyFiltering';
import type { Node, Edge } from '../components/DependencyGraph';

describe('Dependency Filtering', () => {
  const mockNodes: Node[] = [
    { id: 'a', label: 'Node A', critical: true },
    { id: 'b', label: 'Node B', critical: false },
    { id: 'c', label: 'Node C', critical: true },
    { id: 'd', label: 'Node D', critical: false },
    { id: 'e', label: 'Node E', critical: false },
  ];

  const mockEdges: Edge[] = [
    { from: 'a', to: 'b', critical: true },
    { from: 'b', to: 'c', critical: false },
    { from: 'c', to: 'd', critical: true },
    { from: 'd', to: 'e', critical: false },
    { from: 'a', to: 'e', critical: true },
  ];

  describe('filterCriticalNodes', () => {
    it('should include explicitly critical nodes', () => {
      const result = filterCriticalNodes(mockNodes, mockEdges);
      expect(result.some(n => n.id === 'a')).toBe(true);
      expect(result.some(n => n.id === 'c')).toBe(true);
    });

    it('should include nodes connected by critical edges', () => {
      const result = filterCriticalNodes(mockNodes, mockEdges);
      expect(result.some(n => n.id === 'b')).toBe(true); // connected via a->b (critical)
      expect(result.some(n => n.id === 'd')).toBe(true); // connected via c->d (critical)
      expect(result.some(n => n.id === 'e')).toBe(true); // connected via a->e (critical)
    });

    it('should exclude non-critical nodes with no critical connections', () => {
      const nodes: Node[] = [
        { id: 'x', label: 'X', critical: false },
        { id: 'y', label: 'Y', critical: true },
      ];
      const edges: Edge[] = [{ from: 'y', to: 'x', critical: false }];
      const result = filterCriticalNodes(nodes, edges);
      expect(result.map(n => n.id)).not.toContain('x');
    });

    it('should return empty array when no critical nodes or edges', () => {
      const nodes: Node[] = [{ id: 'a', label: 'A', critical: false }];
      const edges: Edge[] = [{ from: 'a', to: 'a', critical: false }];
      const result = filterCriticalNodes(nodes, edges);
      expect(result).toEqual([]);
    });
  });

  describe('filterCriticalEdges', () => {
    it('should return only critical edges', () => {
      const result = filterCriticalEdges(mockEdges);
      expect(result.length).toBe(3);
      expect(result.every(e => e.critical)).toBe(true);
    });

    it('should return empty array when no critical edges exist', () => {
      const edges: Edge[] = [
        { from: 'a', to: 'b', critical: false },
        { from: 'b', to: 'c', critical: false },
      ];
      const result = filterCriticalEdges(edges);
      expect(result).toEqual([]);
    });
  });

  describe('findCriticalPaths', () => {
    it('should find all critical paths in the graph', () => {
      const paths = findCriticalPaths(mockNodes, mockEdges);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should return empty array when no critical edges', () => {
      const edges: Edge[] = [
        { from: 'a', to: 'b', critical: false },
        { from: 'b', to: 'c', critical: false },
      ];
      const paths = findCriticalPaths(mockNodes, edges);
      expect(paths).toEqual([]);
    });

    it('should correctly identify linear paths', () => {
      const nodes: Node[] = [
        { id: 'a', label: 'A', critical: true },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C', critical: true },
      ];
      const edges: Edge[] = [
        { from: 'a', to: 'b', critical: true },
        { from: 'b', to: 'c', critical: true },
      ];
      const paths = findCriticalPaths(nodes, edges);
      expect(paths.some(p => p[0] === 'a' && p[p.length - 1] === 'c')).toBe(true);
    });
  });

  describe('highlightCriticalPaths', () => {
    it('should mark edges that are part of critical paths', () => {
      const paths = [['a', 'b', 'c']];
      const result = highlightCriticalPaths(mockEdges, paths);
      const edgeAB = result.find(e => e.from === 'a' && e.to === 'b');
      expect(edgeAB?.highlighted).toBe(true);
    });

    it('should not highlight edges not in critical paths', () => {
      const paths = [['a', 'b']];
      const result = highlightCriticalPaths(mockEdges, paths);
      const edgeBD = result.find(e => e.from === 'b' && e.to === 'c');
      expect(edgeBD?.highlighted).not.toBe(true);
    });

    it('should handle multiple paths', () => {
      const paths = [
        ['a', 'b', 'c'],
        ['x', 'y'],
      ];
      const result = highlightCriticalPaths(mockEdges, paths);
      expect(result.length).toBe(mockEdges.length);
    });

    it('should return original edges when no paths provided', () => {
      const result = highlightCriticalPaths(mockEdges, []);
      expect(result.length).toBe(mockEdges.length);
    });
  });

  describe('Integration tests', () => {
    it('should correctly filter and highlight critical dependencies', () => {
      const criticalNodes = filterCriticalNodes(mockNodes, mockEdges);
      const criticalEdges = filterCriticalEdges(mockEdges);
      const paths = findCriticalPaths(criticalNodes, criticalEdges);
      const highlighted = highlightCriticalPaths(criticalEdges, paths);

      expect(criticalNodes.length).toBeGreaterThan(0);
      expect(criticalEdges.length).toBeGreaterThan(0);
      expect(highlighted.every(e => e.critical)).toBe(true);
    });
  });
});
