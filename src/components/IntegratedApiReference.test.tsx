import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntegratedApiReference from './IntegratedApiReference';
import { setMobileViewport } from '../test/setup';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Read the stylesheet directly: vitest stubs CSS module imports (css: false),
// so the raw file is the reliable way to verify the responsive rules.
const apiReferenceCss = readFileSync(
  path.join(process.cwd(), 'src/components/ApiReference.module.css'),
  'utf8',
);

// RedocViewer loads Redoc from a CDN — stub it out so tests run headless.
vi.mock('./RedocViewer', () => ({
  default: () => <div data-testid="redoc-viewer" />,
}));

// @docusaurus/* modules are only resolvable inside a Docusaurus build.
vi.mock('@docusaurus/Link', () => ({
  default: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
}));

const spec = {
  openapi: '3.0.0',
  info: { title: 'ProxyPay API', version: '1.0.0' },
  paths: {
    '/ping': {
      get: { summary: 'Ping the API', tags: ['Health'] },
    },
  },
};

describe('IntegratedApiReference mobile layout', () => {
  beforeEach(() => {
    // Default to a desktop viewport between tests.
    setMobileViewport(false);
  });

  it('stacks the sidebar below the main content in the mobile stylesheet', () => {
    const mediaStart = apiReferenceCss.indexOf('@media (max-width: 1024px)');
    expect(mediaStart).toBeGreaterThan(-1);

    // Grab everything up to the next media query so we only inspect the
    // <= 1024px block.
    const nextMedia = apiReferenceCss.indexOf('@media', mediaStart + 1);
    const mobileBlock = apiReferenceCss.slice(
      mediaStart,
      nextMedia === -1 ? undefined : nextMedia,
    );

    // The layout becomes a single column on mobile…
    expect(mobileBlock).toContain('flex-direction: column');

    // …with the main content first and the sidebar stacked below it.
    const mainIndex = mobileBlock.indexOf('.main');
    const sidebarIndex = mobileBlock.indexOf('.sidebar');
    expect(mainIndex).toBeGreaterThan(-1);
    expect(sidebarIndex).toBeGreaterThan(mainIndex);

    // The sidebar is collapsed by default on mobile and only shown when the
    // toggle adds the open class.
    expect(mobileBlock).toMatch(/\.sidebar\s*\{[^}]*display:\s*none/s);
    expect(mobileBlock).toMatch(/\.sidebar\.sidebarOpen\s*\{[^}]*display:\s*flex/s);

    // The toggle button is visible on mobile…
    expect(mobileBlock).toMatch(/\.toggleButton\s*\{[^}]*display:\s*inline-flex/s);
  });

  it('hides the toggle button on desktop where the sidebar is always visible', () => {
    const baseStyles = apiReferenceCss.slice(0, apiReferenceCss.indexOf('@media'));
    expect(baseStyles).toMatch(/\.toggleButton\s*\{[^}]*display:\s*none/s);
  });

  it('collapses the sidebar on mobile and expands it via the toggle button', async () => {
    setMobileViewport(true);
    const user = userEvent.setup();
    render(<IntegratedApiReference spec={spec} />);

    // Sidebar starts collapsed on mobile.
    const toggle = screen.getByRole('button', { name: 'Show endpoints' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const sidebar = document.getElementById('api-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar!.className).not.toContain('sidebarOpen');

    // Clicking the toggle reveals the sidebar.
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide endpoints' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(sidebar!.className).toContain('sidebarOpen');

    // Clicking again collapses it.
    await user.click(screen.getByRole('button', { name: 'Hide endpoints' }));
    expect(screen.getByRole('button', { name: 'Show endpoints' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(sidebar!.className).not.toContain('sidebarOpen');
  });

  it('keeps the sidebar visible by default on desktop', () => {
    setMobileViewport(false);
    render(<IntegratedApiReference spec={spec} />);

    const sidebar = document.getElementById('api-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar!.className).toContain('sidebarOpen');

    const toggle = screen.getByRole('button', { name: 'Hide endpoints' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders the main content (Redoc viewer) as a sibling of the sidebar', () => {
    setMobileViewport(true);
    render(<IntegratedApiReference spec={spec} />);

    const main = screen.getByTestId('redoc-viewer');
    const sidebar = document.getElementById('api-sidebar');

    // Both live inside the same flex layout, so CSS order can stack the
    // sidebar below the main content on mobile.
    expect(main.closest('main')).not.toBeNull();
    expect(sidebar!.parentElement).toBe(main.closest('main')!.parentElement);
  });
});
