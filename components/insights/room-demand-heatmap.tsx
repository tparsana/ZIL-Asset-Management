import type { InsightRoomTypeDemandCell } from '@/lib/insights/types';
import { cn } from '@/lib/utils';

interface RoomDemandHeatmapProps {
  roomNames: string[];
  assetTypeNames: string[];
  cells: InsightRoomTypeDemandCell[];
}

function getIntensityClass(count: number, maxCount: number) {
  if (count <= 0 || maxCount <= 0) {
    return 'border-border/70 bg-muted/30 text-muted-foreground';
  }

  const ratio = count / maxCount;
  if (ratio >= 0.85) return 'border-primary/35 bg-primary/25 text-primary';
  if (ratio >= 0.6) return 'border-primary/25 bg-primary/18 text-primary';
  if (ratio >= 0.35) return 'border-primary/20 bg-primary/12 text-primary';
  return 'border-primary/15 bg-primary/8 text-foreground';
}

export function RoomDemandHeatmap({
  roomNames,
  assetTypeNames,
  cells,
}: RoomDemandHeatmapProps) {
  const cellCounts = new Map(
    cells.map((cell) => [`${cell.roomName}:${cell.assetTypeName}`, cell.checkoutCount]),
  );
  const maxCount = Math.max(0, ...cells.map((cell) => cell.checkoutCount));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Darker cells indicate heavier checkout demand for that room/type combination.
      </p>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[42rem] gap-2"
          style={{ gridTemplateColumns: `minmax(8rem, 10rem) repeat(${assetTypeNames.length}, minmax(5.5rem, 1fr))` }}
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Room
          </div>
          {assetTypeNames.map((assetTypeName) => (
            <div
              key={assetTypeName}
              className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              {assetTypeName}
            </div>
          ))}

          {roomNames.map((roomName) => (
            <div key={roomName} className="contents">
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm font-medium">
                {roomName}
              </div>
              {assetTypeNames.map((assetTypeName) => {
                const count = cellCounts.get(`${roomName}:${assetTypeName}`) ?? 0;
                return (
                  <div
                    key={`${roomName}:${assetTypeName}`}
                    className={cn(
                      'rounded-xl border px-2 py-3 text-center text-sm font-semibold tabular-nums transition-colors',
                      getIntensityClass(count, maxCount),
                    )}
                  >
                    {count}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
