import React from 'react';
import DependencyGraph from './DependencyGraph';
import type { Node, Edge } from './DependencyGraph';

/**
 * Example integration of DependencyGraph component
 * Shows how to use the component with sample API dependencies
 */
export default function DependenciesDemo(): React.JSX.Element {
  // Example API dependency data
  // In a real implementation, this would come from the OpenAPI spec or a backend API
  const sampleNodes: Node[] = [
    { id: 'auth', label: 'Authentication', critical: true },
    { id: 'users', label: 'Users API', critical: true },
    { id: 'payments', label: 'Payments API', critical: true },
    { id: 'transfers', label: 'Transfers API', critical: true },
    { id: 'stellar', label: 'Stellar Bridge', critical: true },
    { id: 'notifications', label: 'Notifications', critical: false },
    { id: 'logging', label: 'Logging', critical: false },
    { id: 'cache', label: 'Cache', critical: false },
  ];

  const sampleEdges: Edge[] = [
    // Critical paths for payment flows
    { from: 'auth', to: 'users', critical: true, label: 'Authenticate' },
    { from: 'users', to: 'payments', critical: true, label: 'Create' },
    { from: 'payments', to: 'transfers', critical: true, label: 'Transfer' },
    { from: 'transfers', to: 'stellar', critical: true, label: 'Bridge' },
    
    // Non-critical paths for supporting services
    { from: 'payments', to: 'notifications', critical: false, label: 'Notify' },
    { from: 'transfers', to: 'notifications', critical: false, label: 'Notify' },
    { from: 'users', to: 'logging', critical: false, label: 'Log' },
    { from: 'payments', to: 'logging', critical: false, label: 'Log' },
    { from: 'transfers', to: 'cache', critical: false, label: 'Cache' },
  ];

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <DependencyGraph
        nodes={sampleNodes}
        edges={sampleEdges}
        onlyShowCritical={false}
        highlightCritical={true}
      />
    </div>
  );
}
