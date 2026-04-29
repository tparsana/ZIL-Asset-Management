import type { AssetEvent } from '@/lib/types';

type DeletedAssetSnapshot = {
  id?: string;
  assetId?: string;
  name?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getDeletedAssetSnapshot(metadata: unknown): DeletedAssetSnapshot | null {
  if (!isRecord(metadata)) return null;
  const snapshot = metadata.deletedAssetSnapshot;
  if (!isRecord(snapshot)) return null;

  return {
    id: typeof snapshot.id === 'string' ? snapshot.id : undefined,
    assetId: typeof snapshot.assetId === 'string' ? snapshot.assetId : undefined,
    name: typeof snapshot.name === 'string' ? snapshot.name : undefined,
  };
}

export function isDeletedAssetEvent(metadata: unknown) {
  if (!isRecord(metadata)) return false;
  return metadata.assetDeleted === true;
}

export function getEventAssetName(event: Pick<AssetEvent, 'asset' | 'metadata'>) {
  if (event.asset?.name) return event.asset.name;
  return getDeletedAssetSnapshot(event.metadata)?.name ?? 'System Event';
}

export function getEventAssetLabel(event: Pick<AssetEvent, 'asset' | 'metadata'>) {
  if (event.asset?.name && event.asset.assetId) {
    return `${event.asset.name} (${event.asset.assetId})`;
  }

  const snapshot = getDeletedAssetSnapshot(event.metadata);
  if (snapshot?.name && snapshot.assetId) {
    return `${snapshot.name} (${snapshot.assetId})`;
  }

  if (snapshot?.name) return snapshot.name;
  return 'System event';
}
