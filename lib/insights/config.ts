export const DEFAULT_INSIGHTS_RANGE_DAYS = 30;
export const DEFAULT_INSIGHTS_GRANULARITY = 'week' as const;

export const OVERDUE_CHECKOUT_HOURS = 72;
export const RETURN_COMPLIANCE_TARGET_HOURS = 48;

export const LOW_STOCK_THRESHOLDS: Record<string, number> = {
  Camera: 1,
  Battery: 4,
  'SD Card': 3,
  Cable: 2,
  Accessory: 2,
  Microphone: 1,
  Tripod: 1,
  Light: 1,
  default: 1,
};

export const KEY_USAGE_CATEGORIES = ['SD Card', 'Battery', 'Cable', 'Accessory'] as const;
