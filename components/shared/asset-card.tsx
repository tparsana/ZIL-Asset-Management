'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { AssetThumbnail } from './asset-thumbnail';
import { cn } from '@/lib/utils';
import type { Asset } from '@/lib/types';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
  className?: string;
}

export function AssetCard({ asset, onClick, selected, compact, className }: AssetCardProps) {
  if (compact) {
    return (
      <Card 
        className={cn(
          'cursor-pointer transition-colors hover:bg-accent/50',
          selected && 'ring-2 ring-primary bg-accent/30',
          className
        )}
        onClick={onClick}
      >
        <CardContent className="flex items-center gap-3 p-3">
          <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-10 w-10" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{asset.name}</p>
            <p className="text-xs text-muted-foreground truncate">{asset.assetId}</p>
          </div>
          <StatusBadge status={asset.status} size="sm" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent/50',
        selected && 'ring-2 ring-primary bg-accent/30',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-12 w-12" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{asset.name}</h3>
                <p className="text-sm text-muted-foreground">{asset.assetId}</p>
              </div>
              <StatusBadge status={asset.status} size="sm" />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{asset.assetType.name}</span>
              <span>{asset.currentLocation.name}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
