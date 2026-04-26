import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { InsightRecommendation } from '@/lib/insights/types';

interface RecommendationCardProps {
  recommendation: InsightRecommendation;
}

const toneMap = {
  info: 'border-status-in-use/20 bg-status-in-use/5',
  success: 'border-status-available/20 bg-status-available/5',
  warning: 'border-status-warning/20 bg-status-warning/5',
  danger: 'border-status-missing/20 bg-status-missing/5',
};

const labelToneMap = {
  info: 'text-status-in-use',
  success: 'text-status-available',
  warning: 'text-status-warning',
  danger: 'text-status-missing',
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <Card className={cn('overflow-hidden', toneMap[recommendation.severity])}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">{recommendation.title}</p>
          <span className={cn('text-xs font-semibold uppercase tracking-[0.12em]', labelToneMap[recommendation.severity])}>
            {recommendation.severity}
          </span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{recommendation.description}</p>
      </CardContent>
    </Card>
  );
}
