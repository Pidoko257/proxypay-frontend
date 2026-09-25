/**
 * ResponsiveImage — Issue #453
 *
 * Renders images efficiently with:
 *  - <picture> + <source> elements for art-direction (different crops/images
 *    per breakpoint) via the `sources` prop
 *  - `srcSet` + `sizes` on <img> for resolution-switching (same image at
 *    different densities / widths)
 *  - Loading shimmer placeholder while the image downloads
 *  - Graceful error state if the image fails to load
 *  - Lazy loading by default (`loading="lazy"`)
 *  - ARIA-friendly: alt text is required; decorative images get alt=""
 */

import React, { useState, useCallback, useId } from 'react';
import styles from './ResponsiveImage.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One <source> element inside the <picture> — for art direction. */
export interface PictureSource {
  /**
   * Media query that selects this source, e.g. "(max-width: 640px)".
   * Omit to create a type-only source (e.g. next-gen format fallback).
   */
  media?: string;
  /**
   * MIME type, e.g. "image/webp" or "image/avif".
   * Used for format-based fallback selection.
   */
  type?: string;
  /**
   * The srcset for this source, e.g.
   * "img-sm.webp 640w, img-md.webp 1280w"
   */
  srcSet: string;
  /** Sizes attribute for this source. */
  sizes?: string;
}

export interface ResponsiveImageProps {
  /** Default image URL (the <img> src). Required. */
  src: string;
  /**
   * Alt text.  Pass an empty string `""` for decorative images
   * (the component will also set `role="presentation"`).
   */
  alt: string;
  /**
   * srcset string for the default <img>, e.g.
   * "image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
   */
  srcSet?: string;
  /**
   * sizes string matching the srcset, e.g.
   * "(max-width: 600px) 100vw, 50vw"
   */
  sizes?: string;
  /**
   * <source> entries for art-direction inside a <picture> wrapper.
   * Rendered in array order (the browser picks the first matching source).
   */
  sources?: PictureSource[];
  /** Intrinsic width. Helps the browser reserve space before load. */
  width?: number | string;
  /** Intrinsic height. Helps the browser reserve space before load. */
  height?: number | string;
  /** @default "lazy" */
  loading?: 'lazy' | 'eager';
  /** @default "auto" */
  decoding?: 'async' | 'sync' | 'auto';
  /**
   * fetchpriority hint — set to "high" for above-the-fold hero images.
   * @default "auto"
   */
  fetchPriority?: 'high' | 'low' | 'auto';
  /** Caption rendered in a <figcaption> below the image. */
  caption?: string;
  /** Make the wrapper block-level (100% width). @default false */
  block?: boolean;
  /** Extra CSS class for the outermost element. */
  className?: string;
  /** Called when the image finishes loading. */
  onLoad?: () => void;
  /** Called when the image fails to load. */
  onError?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  srcSet,
  sizes,
  sources,
  width,
  height,
  loading       = 'lazy',
  decoding      = 'async',
  fetchPriority = 'auto',
  caption,
  block         = false,
  className,
  onLoad,
  onError,
}) => {
  const [loadState, setLoadState] = useState<'pending' | 'loaded' | 'error'>('pending');
  const captionId = useId();

  const isDecorative = alt === '';
  const hasSources   = sources && sources.length > 0;
  const wrapInFigure = Boolean(caption);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLoad = useCallback(() => {
    setLoadState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setLoadState('error');
    onError?.();
  }, [onError]);

  // ── Error state ───────────────────────────────────────────────────────────

  if (loadState === 'error') {
    return (
      <div
        className={`${styles.errorState}${className ? ` ${className}` : ''}`}
        role="img"
        aria-label={isDecorative ? undefined : `${alt} (failed to load)`}
        data-testid="responsive-image-error"
        style={{ width, height }}
      >
        <span className={styles.errorIcon} aria-hidden="true">🖼️</span>
        {!isDecorative && (
          <span>{alt || 'Image failed to load'}</span>
        )}
      </div>
    );
  }

  // ── Build <img> element ────────────────────────────────────────────────────

  const imgElement = (
    <img
      src={src}
      alt={alt}
      srcSet={srcSet}
      sizes={sizes}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      // fetchpriority is a valid HTML attribute but TypeScript's JSX types
      // don't always include it; cast to any to avoid build errors.
      {...({ fetchpriority: fetchPriority } as React.ImgHTMLAttributes<HTMLImageElement>)}
      className={`${styles.image} ${
        loadState === 'loaded' ? styles.imageLoaded : styles.imagePending
      }`}
      onLoad={handleLoad}
      onError={handleError}
      role={isDecorative ? 'presentation' : undefined}
      aria-describedby={caption ? captionId : undefined}
      data-testid="responsive-image"
    />
  );

  // ── Build <picture> (with art-direction sources) ───────────────────────────

  const pictureOrImg = hasSources ? (
    <picture className={styles.picture}>
      {sources!.map((source, idx) => (
        <source
          key={idx}
          media={source.media}
          type={source.type}
          srcSet={source.srcSet}
          sizes={source.sizes}
        />
      ))}
      {imgElement}
    </picture>
  ) : imgElement;

  // ── Shimmer placeholder ────────────────────────────────────────────────────

  const placeholder = (
    <div
      className={`${styles.placeholder} ${styles.placeholderShimmer} ${
        loadState === 'loaded' ? styles.placeholderHidden : ''
      }`}
      aria-hidden="true"
      data-testid="responsive-image-placeholder"
    >
      {loadState === 'pending' && (
        <span className={styles.placeholderIcon}>🖼️</span>
      )}
    </div>
  );

  // ── Assemble wrapper ──────────────────────────────────────────────────────

  const wrapperClass = [
    block ? styles.wrapperBlock : styles.wrapper,
    className,
  ].filter(Boolean).join(' ');

  const innerContent = (
    <div
      className={wrapperClass}
      style={{ width, height: loadState === 'loaded' ? undefined : height }}
      data-testid="responsive-image-wrapper"
    >
      {pictureOrImg}
      {loadState !== 'loaded' && placeholder}
    </div>
  );

  if (wrapInFigure) {
    return (
      <figure style={{ margin: 0, display: block ? 'block' : 'inline-block' }}>
        {innerContent}
        <figcaption id={captionId} className={styles.caption}>
          {caption}
        </figcaption>
      </figure>
    );
  }

  return innerContent;
};

export default ResponsiveImage;
