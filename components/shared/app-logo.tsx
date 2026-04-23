import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  imageClassName?: string;
  alt?: string;
  priority?: boolean;
}

export function AppLogo({
  className,
  imageClassName,
  alt = 'Zoom Innovation Lab at ASU logo',
  priority = false,
}: AppLogoProps) {
  return (
    <div className={cn('relative', className)}>
      <Image
        src="/zil-asu-logo.png"
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 96px, 128px"
        className={cn('object-contain', imageClassName)}
      />
    </div>
  );
}
