/**
 * ComparisonView — Issue #450
 *
 * Generic side-by-side comparison component with:
 *  - Diff highlighting (added / removed / changed lines)
 *  - Synchronized scrolling between the two panels
 *  - Optional plain-content mode for arbitrary React children
 *  - Accessible keyboard navigation and ARIA roles
 */

import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react';
import styles from './ComparisonView.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiffLineKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffLine {
  /** Line number in the left (original) panel; undefined for added lines */
  lineLeft?: number;
  /** Line number in the right (modified) panel; undefined for removed lines */
  lineRight?: number;
  kind: DiffLineKind;
  textLeft: string;
  textRight: string;
}

export interface ComparisonViewProps {
  /** Label shown in the toolbar */
  title?: string;
  /** Label for the left panel column header */
  labelLeft?: string;
  /** Label for the right panel column header */
  labelRight?: string;
  /**
   * When provided the component renders a text-diff view from this list.
   * Build it with `computeDiff()` or supply your own.
   */
  diffLines?: DiffLine[];
  /**
   * Alternative to diffLines: supply arbitrary React nodes for each panel.
   * Useful for comparing rendered components, metric cards, etc.
   */
  contentLeft?: React.ReactNode;
  contentRight?: React.ReactNode;
  /** Max panel height before scrolling kicks in (CSS value, default 520px) */
  maxHeight?: string | number;
  /** Whether sync-scroll is enabled by default (default true) */
  syncScroll?: boolean;
  /** Show the diff legend (default true) */
  showLegend?: boolean;
  /** Extra CSS class for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Compute a line-level diff between two multi-line strings.
 * Uses the Longest Common Subsequence (LCS) algorithm so the result is
 * minimal and accurate.
 */
export function computeDiff(original: string, modified: string): DiffLine[] {
  const leftLines  = original.split('\n');
  const rightLines = modified.split('\n');
  const m = leftLines.length;
  const n = rightLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        leftLines[i - 1] === rightLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Back-track to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  let leftNum  = m;
  let rightNum = n;

  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      stack.push({
        lineLeft:  i,
        lineRight: j,
        kind:      'unchanged',
        textLeft:  leftLines[i - 1],
        textRight: rightLines[j - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({
        lineLeft:  undefined,
        lineRight: j,
        kind:      'added',
        textLeft:  '',
        textRight: rightLines[j - 1],
      });
      j--;
    } else {
      stack.push({
        lineLeft:  i,
        lineRight: undefined,
        kind:      'removed',
        textLeft:  leftLines[i - 1],
        textRight: '',
      });
      i--;
    }
  }

  void leftNum;
  void rightNum;

  return stack.reverse();
}

/** Count the number of lines that are not 'unchanged' */
function countDiffs(lines: DiffLine[]): number {
  return lines.filter(l => l.kind !== 'unchanged').length;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DiffPanelProps {
  lines: DiffLine[];
  side: 'left' | 'right';
  panelRef: React.RefObject<HTMLDivElement>;
  onScroll: (scrollTop: number) => void;
  maxHeight: string;
}

const DiffPanel: React.FC<DiffPanelProps> = ({
  lines,
  side,
  panelRef,
  onScroll,
  maxHeight,
}) => {
  const handleScroll = useCallback(() => {
    if (panelRef.current) {
      onScroll(panelRef.current.scrollTop);
    }
  }, [panelRef, onScroll]);

  return (
    <div
      ref={panelRef}
      className={styles.panel}
      style={{ '--comparison-max-height': maxHeight } as React.CSSProperties}
      onScroll={handleScroll}
      role="region"
      aria-label={side === 'left' ? 'Original content' : 'Modified content'}
      tabIndex={0}
    >
      <div className={styles.panelContent} aria-live="polite">
        {lines.map((line, idx) => {
          const lineNum  = side === 'left' ? line.lineLeft  : line.lineRight;
          const text     = side === 'left' ? line.textLeft  : line.textRight;
          const isGhost  = lineNum === undefined; // placeholder row

          // Map kind → CSS class
          let kindClass = styles.lineUnchanged;
          if (!isGhost) {
            if (line.kind === 'added')   kindClass = styles.lineAdded;
            if (line.kind === 'removed') kindClass = styles.lineRemoved;
            if (line.kind === 'changed') kindClass = styles.lineChanged;
          } else {
            // Ghost row: a line that exists only on the other side
            kindClass =
              side === 'left' ? styles.lineAdded : styles.lineRemoved;
          }

          return (
            <div
              key={idx}
              className={`${styles.diffLine} ${kindClass}`}
              aria-label={
                isGhost
                  ? `Line ${idx + 1}: absent in this version`
                  : `Line ${lineNum}: ${line.kind}`
              }
            >
              <span className={styles.lineNum} aria-hidden="true">
                {lineNum ?? ' '}
              </span>
              <span className={styles.lineText}>{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  title       = 'Comparison',
  labelLeft   = 'Original',
  labelRight  = 'Modified',
  diffLines,
  contentLeft,
  contentRight,
  maxHeight   = 520,
  syncScroll  = true,
  showLegend  = true,
  className,
}) => {
  const [syncEnabled, setSyncEnabled] = useState(syncScroll);
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);

  const leftPanelRef  = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncing     = useRef(false); // prevent scroll-event ping-pong

  // Normalise maxHeight to a CSS string
  const maxHeightStr =
    typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

  // Filtered lines for diff view
  const visibleLines = useMemo<DiffLine[]>(() => {
    if (!diffLines) return [];
    if (showOnlyDiffs) return diffLines.filter(l => l.kind !== 'unchanged');
    return diffLines;
  }, [diffLines, showOnlyDiffs]);

  const diffCount = useMemo(
    () => (diffLines ? countDiffs(diffLines) : 0),
    [diffLines],
  );

  // ── Sync scroll handler ───────────────────────────────────────────────────
  const handleScroll = useCallback(
    (scrollTop: number, source: 'left' | 'right') => {
      if (!syncEnabled || isSyncing.current) return;
      isSyncing.current = true;

      const target =
        source === 'left' ? rightPanelRef.current : leftPanelRef.current;
      if (target) {
        target.scrollTop = scrollTop;
      }

      // Release lock on next frame to allow the browser to fire the mirror
      // scroll event (which we then suppress) before lifting the flag.
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    },
    [syncEnabled],
  );

  const handleLeftScroll  = useCallback((t: number) => handleScroll(t, 'left'),  [handleScroll]);
  const handleRightScroll = useCallback((t: number) => handleScroll(t, 'right'), [handleScroll]);

  // Keep syncEnabled in sync with the prop when it changes externally
  useEffect(() => {
    setSyncEnabled(syncScroll);
  }, [syncScroll]);

  // ── Render ────────────────────────────────────────────────────────────────
  const isDiffMode = Boolean(diffLines);

  return (
    <div
      className={`${styles.wrapper}${className ? ` ${className}` : ''}`}
      data-testid="comparison-view"
    >
      {/* Toolbar */}
      <div className={styles.toolbar} role="toolbar" aria-label="Comparison controls">
        <div className={styles.toolbarLeft}>
          <h3 className={styles.title}>{title}</h3>
          {isDiffMode && diffCount > 0 && (
            <span className={styles.diffBadge} aria-label={`${diffCount} differences`}>
              ⚡ {diffCount} diff{diffCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className={styles.toolbarRight}>
          {isDiffMode && (
            <button
              className={`${styles.toolbarBtn}${showOnlyDiffs ? ` ${styles.active}` : ''}`}
              onClick={() => setShowOnlyDiffs(v => !v)}
              aria-pressed={showOnlyDiffs}
              title={showOnlyDiffs ? 'Show all lines' : 'Show only differences'}
            >
              {showOnlyDiffs ? '≡ All lines' : '⚡ Diffs only'}
            </button>
          )}

          <button
            className={`${styles.toolbarBtn}${syncEnabled ? ` ${styles.active}` : ''}`}
            onClick={() => setSyncEnabled(v => !v)}
            aria-pressed={syncEnabled}
            title={syncEnabled ? 'Disable sync scroll' : 'Enable sync scroll'}
            data-testid="sync-scroll-toggle"
          >
            {syncEnabled ? '🔗 Sync on' : '🔗 Sync off'}
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className={styles.columnHeaders} aria-hidden="true">
        <div className={styles.columnHeader} title={labelLeft}>{labelLeft}</div>
        <div className={styles.columnHeader} title={labelRight}>{labelRight}</div>
      </div>

      {/* Panels */}
      <div className={styles.panels}>
        {isDiffMode ? (
          visibleLines.length === 0 ? (
            <div className={styles.emptyState} role="status">
              <span className={styles.emptyIcon}>✓</span>
              <p className={styles.emptyText}>No differences found</p>
            </div>
          ) : (
            <>
              <DiffPanel
                lines={visibleLines}
                side="left"
                panelRef={leftPanelRef}
                onScroll={handleLeftScroll}
                maxHeight={maxHeightStr}
              />
              <DiffPanel
                lines={visibleLines}
                side="right"
                panelRef={rightPanelRef}
                onScroll={handleRightScroll}
                maxHeight={maxHeightStr}
              />
            </>
          )
        ) : (
          <>
            <div
              ref={leftPanelRef}
              className={styles.panel}
              style={{ '--comparison-max-height': maxHeightStr } as React.CSSProperties}
              onScroll={() => handleLeftScroll(leftPanelRef.current?.scrollTop ?? 0)}
              role="region"
              aria-label="Left panel"
              tabIndex={0}
            >
              <div className={`${styles.panelContent} ${styles.contentView}`}>
                {contentLeft ?? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📄</span>
                    <p className={styles.emptyText}>No content</p>
                  </div>
                )}
              </div>
            </div>

            <div
              ref={rightPanelRef}
              className={styles.panel}
              style={{ '--comparison-max-height': maxHeightStr } as React.CSSProperties}
              onScroll={() => handleRightScroll(rightPanelRef.current?.scrollTop ?? 0)}
              role="region"
              aria-label="Right panel"
              tabIndex={0}
            >
              <div className={`${styles.panelContent} ${styles.contentView}`}>
                {contentRight ?? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📄</span>
                    <p className={styles.emptyText}>No content</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      {showLegend && isDiffMode && (
        <div className={styles.legend} aria-label="Diff legend">
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendAdded}`} />
            Added
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendRemoved}`} />
            Removed
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendChanged}`} />
            Changed
          </span>
          {syncEnabled && (
            <span className={styles.syncIndicator} aria-live="polite">
              🔗 Scroll synced
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ComparisonView;
