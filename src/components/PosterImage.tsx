import { useState, useEffect } from 'react';

interface PosterImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export default function PosterImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'NO POSTER',
}: PosterImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-[#121214] border border-[#262629] p-1 text-center select-none ${className}`}
      >
        <span className="font-mono text-[8px] text-[#8A8882] uppercase tracking-wider">
          [{fallbackLabel}]
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
