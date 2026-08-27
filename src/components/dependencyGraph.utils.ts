/**
 * Pure helpers for making DependencyGraph nodes interactive.
 * JSX-free so they can be unit-tested in isolation.
 */

export interface EndpointNodeLike {
  id: string;
  label: string; // e.g. "POST /payments/{id}"
  method: string;
  group: string;
}

/** Base path of the Redoc-powered API reference page. */
export const API_REFERENCE_BASE = '/api';

/**
 * Turn an endpoint label into a Redoc operation anchor slug, matching the
 * `#operation/<method>-<path>` style anchors Redoc generates.
 */
export function operationSlug(node: EndpointNodeLike): string {
  const path = node.label.replace(/^[A-Z]+\s+/, '');
  const cleanedPath = path
    .replace(/[{}]/g, '')
    .replace(/[^a-zA-Z0-9/]+/g, '-')
    .replace(/\/+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${node.method.toLowerCase()}-${cleanedPath}`.replace(/-+/g, '-').toLowerCase();
}

/** Slug for a Redoc tag anchor (`#tag/<group>`). */
export function tagSlug(group: string): string {
  return group
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

/**
 * Build the API-reference URL a node should navigate to. Prefers a specific
 * operation anchor, falling back to the tag/group section.
 */
export function apiReferenceUrlFor(
  node: EndpointNodeLike,
  base: string = API_REFERENCE_BASE,
): string {
  const slug = operationSlug(node);
  if (slug && /[a-z]/.test(slug)) {
    return `${base}#operation/${slug}`;
  }
  return `${base}#tag/${tagSlug(node.group)}`;
}

/** Human-readable summary used for the hover tooltip / details panel. */
export function nodeTooltip(
  node: EndpointNodeLike & { critical?: boolean },
  relationshipCount: number,
): string {
  const critical = node.critical ? ' · ⚡ critical path' : '';
  const rels = `${relationshipCount} ${relationshipCount === 1 ? 'dependency' : 'dependencies'}`;
  return `${node.label} — ${node.group}${critical} · ${rels} · click to open API reference`;
}
