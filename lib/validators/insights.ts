import { z } from 'zod';
import { DEFAULT_INSIGHTS_GRANULARITY } from '@/lib/insights/config';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const insightsQuerySchema = z.object({
  fromDate: optionalString,
  toDate: optionalString,
  locationId: optionalString,
  assetTypeId: optionalString,
  granularity: z.enum(['day', 'week', 'month']).optional().default(DEFAULT_INSIGHTS_GRANULARITY),
});
