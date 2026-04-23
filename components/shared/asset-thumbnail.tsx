import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';

interface AssetThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function AssetThumbnail({ src, alt, className }: AssetThumbnailProps) {
  return (
    <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Package className="h-6 w-6 text-muted-foreground" />
      )}
    </div>
  );
}
