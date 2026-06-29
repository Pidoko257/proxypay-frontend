import React from 'react';

interface OptimizedImageProps {
  src: string;
  webpSrc?: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  className?: string;
  style?: React.CSSProperties;
}

export default function OptimizedImage({
  src,
  webpSrc,
  alt,
  width,
  height,
  loading = 'lazy',
  className,
  style,
}: OptimizedImageProps): React.JSX.Element {
  const derivedWebpSrc = webpSrc ?? src.replace(/\.(png|jpg|jpeg)$/i, '.webp');

  return (
    <picture>
      <source srcSet={derivedWebpSrc} type="image/webp" />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className={className}
        style={{ maxWidth: '100%', height: 'auto', ...style }}
      />
    </picture>
  );
}
