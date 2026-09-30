/**
 * Tests for the Redoc singleton loader (issue #355).
 * Verifies deduplication of CDN loads and that init only proceeds once the
 * bundle is actually available.
 */

import {
  loadRedoc,
  isRedocLoadStarted,
  REDOC_SCRIPT_ID,
  __resetRedocLoaderForTests,
} from '../redocLoader';

interface FakeScript {
  id: string;
  src: string;
  async: boolean;
  dataset: Record<string, string>;
  _handlers: Record<string, Array<() => void>>;
  addEventListener: (type: string, cb: () => void) => void;
  parentNode: unknown;
}

function makeScript(): FakeScript {
  const handlers: Record<string, Array<() => void>> = {};
  return {
    id: '',
    src: '',
    async: false,
    dataset: {},
    _handlers: handlers,
    addEventListener(type: string, cb: () => void) {
      (handlers[type] ||= []).push(cb);
    },
    parentNode: null,
  };
}

function fire(script: FakeScript, type: string) {
  (script._handlers[type] || []).forEach((cb) => cb());
}

describe('redocLoader (#355)', () => {
  let appended: FakeScript[];
  let byId: Record<string, FakeScript>;

  beforeEach(() => {
    __resetRedocLoaderForTests();
    appended = [];
    byId = {};

    const doc = {
      getElementById: (id: string) => byId[id] || null,
      createElement: (_tag: string) => makeScript(),
      head: {
        appendChild: (node: FakeScript) => {
          appended.push(node);
          if (node.id) byId[node.id] = node;
          node.parentNode = doc.head;
          return node;
        },
        removeChild: (node: FakeScript) => {
          if (node.id) delete byId[node.id];
          node.parentNode = null;
          return node;
        },
      },
    };

    (globalThis as any).document = doc;
    (globalThis as any).window = { document: doc };
  });

  afterEach(() => {
    delete (globalThis as any).document;
    delete (globalThis as any).window;
    __resetRedocLoaderForTests();
  });

  it('injects only one script tag for concurrent callers (deduplication)', async () => {
    const p1 = loadRedoc();
    const p2 = loadRedoc();
    const p3 = loadRedoc();

    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
    expect(appended).toHaveLength(1);
    expect(appended[0].id).toBe(REDOC_SCRIPT_ID);
  });

  it('resolves all callers only after the bundle has loaded', async () => {
    const p1 = loadRedoc();
    const p2 = loadRedoc();

    // Bundle finished downloading and attached itself to window.
    (globalThis as any).window.Redoc = { init: () => undefined };
    fire(appended[0], 'load');

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(r2);
    expect(typeof r1.init).toBe('function');
  });

  it('rejects and clears state when the CDN script errors', async () => {
    const p = loadRedoc();
    fire(appended[0], 'error');

    await expect(p).rejects.toThrow(/Failed to load Redoc/);
    // A later attempt is allowed to retry rather than reuse the failed promise.
    expect(isRedocLoadStarted()).toBe(false);
  });

  it('resolves immediately when window.Redoc already exists', async () => {
    (globalThis as any).window.Redoc = { init: () => undefined };
    const redoc = await loadRedoc();
    expect(typeof redoc.init).toBe('function');
    expect(appended).toHaveLength(0);
  });

  it('reuses a still-pending script tag from a previous mount', async () => {
    const p1 = loadRedoc();
    expect(appended).toHaveLength(1);

    // Simulate the module state being lost (e.g. HMR) while the tag persists.
    __resetRedocLoaderForTests();
    const p2 = loadRedoc();

    // No second script tag was created.
    expect(appended).toHaveLength(1);

    (globalThis as any).window.Redoc = { init: () => undefined };
    fire(appended[0], 'load');
    await expect(p1).resolves.toBeDefined();
    await expect(p2).resolves.toBeDefined();
  });
});
