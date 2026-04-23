import { z } from 'zod';

export const statusSchema = z.enum(['available', 'in-use', 'missing', 'in-repair', 'retired']);
export const eventTypeSchema = z.enum([
  'asset-created',
  'asset-updated',
  'moved',
  'checked-out',
  'returned',
  'marked-missing',
  'marked-in-repair',
  'restored-to-available',
  'retired',
  'audit-started',
  'audit-scanned',
  'audit-completed',
]);

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalDateString = optionalString.refine((value) => !value || !Number.isNaN(Date.parse(value)), {
  message: 'Purchase date must be a valid date',
});

const optionalCost = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === '') return undefined;
    return Number(value);
  })
  .refine((value) => value === undefined || Number.isFinite(value), {
    message: 'Cost must be numeric',
  });

export const createAssetSchema = z.object({
  assetId: optionalString,
  name: z.string().trim().min(1, 'Asset name is required'),
  assetTypeId: z.string().trim().min(1, 'Asset type is required'),
  serialNumber: optionalString,
  purchaseDate: optionalDateString,
  cost: optionalCost,
  consumable: z.boolean().default(false),
  homeLocationId: z.string().trim().min(1, 'Home location is required'),
  currentLocationId: z.string().trim().min(1, 'Current location is required'),
  status: statusSchema.default('available'),
  notes: optionalString,
  referenceImageUrl: optionalString,
  handledBy: optionalString,
});

export const updateAssetSchema = createAssetSchema.partial().extend({
  status: statusSchema.optional(),
});

export const assetActionSchema = z.object({
  action: z.enum(['checkout', 'return', 'move', 'missing', 'in-repair', 'available', 'retire']),
  toLocationId: optionalString,
  handledBy: optionalString,
  remarks: optionalString,
});

export const listAssetsSchema = z.object({
  assetTypeId: optionalString,
  status: statusSchema.optional(),
  currentLocationId: optionalString,
  homeLocationId: optionalString,
  consumable: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  search: optionalString,
});

export const listEventsSchema = z.object({
  assetId: optionalString,
  eventType: eventTypeSchema.optional(),
  fromDate: optionalString,
  toDate: optionalString,
  locationId: optionalString,
  handledBy: optionalString,
});

export const startAuditSchema = z.object({
  locationId: z.string().trim().min(1, 'Location is required'),
  startedBy: optionalString,
  notes: optionalString,
});

export const scanAuditSchema = z.object({
  assetId: z.string().trim().min(1, 'Asset ID is required'),
});

export const batchActionSchema = z.object({
  assetIds: z.array(z.string().trim().min(1)).min(1, 'Select at least one asset'),
  action: z.enum(['checkout', 'return', 'move']),
  toLocationId: optionalString,
  handledBy: optionalString,
  remarks: optionalString,
});
