# API Dependency Graph Integration Guide

## Overview

The `DependencyGraph` component visualizes API dependencies with support for filtering to show only critical paths. This is useful for understanding complex API flows and identifying bottlenecks or single points of failure.

## Features

- **Interactive visualization** using vis-network library
- **Filter critical dependencies** to focus on important flows
- **Highlight critical paths** for easy identification
- **Toggle between full and filtered views** with a simple checkbox

## Usage

### Basic Implementation

```tsx
import React from 'react';
import DependencyGraph from '../components/DependencyGraph';
import type { Node, Edge } from '../components/DependencyGraph';

export default function ApiDependencies(): React.JSX.Element {
  const nodes: Node[] = [
    { id: 'auth', label: 'Auth Service', critical: true },
    { id: 'api', label: 'API Gateway', critical: true },
    { id: 'db', label: 'Database', critical: true },
    { id: 'cache', label: 'Cache', critical: false },
  ];

  const edges: Edge[] = [
    { from: 'auth', to: 'api', critical: true },
    { from: 'api', to: 'db', critical: true },
    { from: 'api', to: 'cache', critical: false },
  ];

  return (
    <DependencyGraph
      nodes={nodes}
      edges={edges}
      onlyShowCritical={false}
      highlightCritical={true}
    />
  );
}
```

## Node Properties

```typescript
interface Node {
  id: string;           // Unique identifier
  label: string;        // Display name
  critical?: boolean;   // Is this a critical component?
  group?: string;       // Optional grouping
}
```

## Edge Properties

```typescript
interface Edge {
  from: string;         // Source node ID
  to: string;           // Target node ID
  critical?: boolean;   // Is this a critical path?
  label?: string;       // Edge label
  highlighted?: boolean; // Auto-set by highlight function
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `Node[]` | required | Array of dependency nodes |
| `edges` | `Edge[]` | required | Array of dependency edges |
| `onlyShowCritical` | `boolean` | `false` | Show only critical paths |
| `highlightCritical` | `boolean` | `true` | Highlight critical nodes/edges in red |

## Integration with API Reference Page

To integrate into the API reference page (`src/pages/api.tsx`):

```tsx
import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import DependenciesDemo from '../components/DependenciesDemo';

export default function ApiPage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API reference">
      <div style={{ padding: '2rem' }}>
        <h2>API Dependencies</h2>
        <BrowserOnly fallback={<p>Loading...</p>}>
          {() => <DependenciesDemo />}
        </BrowserOnly>
      </div>
      
      {/* Your existing API reference content */}
    </Layout>
  );
}
```

## Generating Dependency Data

### From OpenAPI Spec

You can extract dependencies from your OpenAPI spec by:
1. Analyzing endpoint parameters and responses
2. Identifying service-to-service calls
3. Marking critical paths based on core functionality

### Example Helper Function

```typescript
export function extractDependenciesFromOpenAPI(spec: OpenAPISpec): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Analyze spec.tags to create nodes
  spec.tags?.forEach(tag => {
    nodes.push({
      id: tag.name,
      label: tag.name,
      critical: isCriticalService(tag.name),
    });
  });

  // Analyze paths to find dependencies
  Object.entries(spec.paths || {}).forEach(([path, item]) => {
    // Extract service dependencies from operation details
  });

  return { nodes, edges };
}
```

## Testing

Run tests with:

```bash
npm test
```

Tests verify:
- Critical node filtering
- Critical edge filtering
- Path identification
- Highlighting logic
- Integration scenarios

## Styling

The component uses CSS modules. Customize styling in `src/components/DependencyGraph.module.css`:

- `.container` - Main wrapper
- `.controls` - Filter controls area
- `.graph` - Graph visualization container

## Performance Considerations

- The vis-network library handles large graphs efficiently
- Physics simulation can be disabled for static layouts
- Consider pagination for >100 nodes

## Future Enhancements

- [ ] Export graph as image/SVG
- [ ] Filter by service type or layer
- [ ] Real-time dependency updates
- [ ] Latency/timeout highlighting
- [ ] Custom node shapes for different service types
