/**
 * Tests for sticky sidebar positioning (issue #357).
 *
 * The sidebar navigation is styled with CSS Modules, so this suite asserts on
 * the compiled stylesheet: the tag-group headers and the per-tag search bar
 * must use `position: sticky` so they remain visible while the endpoint list
 * scrolls.
 */

import * as fs from 'fs';
import * as path from 'path';

const CSS_PATH = path.join(
  __dirname,
  '..',
  'APISidebarNav.module.css',
);

/** Extract the body of a `.selector { ... }` rule. */
function ruleBody(css: string, selector: string): string {
  const idx = css.indexOf(selector + ' {');
  if (idx === -1) throw new Error(`selector ${selector} not found`);
  const start = css.indexOf('{', idx);
  const end = css.indexOf('}', start);
  return css.slice(start + 1, end);
}

describe('APISidebarNav sticky layout (#357)', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf8');

  it('pins tag group headers with position: sticky', () => {
    const body = ruleBody(css, '.tagHeader');
    expect(body).toMatch(/position:\s*sticky/);
    expect(body).toMatch(/top:\s*0/);
  });

  it('keeps the per-tag search bar sticky below its header', () => {
    const body = ruleBody(css, '.tagFilterBar');
    expect(body).toMatch(/position:\s*sticky/);
    expect(body).toMatch(/top:\s*[^;]+/);
  });

  it('layers the header above the search bar', () => {
    const header = ruleBody(css, '.tagHeader');
    const filter = ruleBody(css, '.tagFilterBar');
    const z = (b: string) => Number((b.match(/z-index:\s*(\d+)/) || [])[1]);
    expect(z(header)).toBeGreaterThan(z(filter));
  });

  it('has a scroll container for the sticky elements', () => {
    const body = ruleBody(css, '.tagGroups');
    expect(body).toMatch(/overflow-y:\s*auto/);
  });
});
