const QR_PREFIX = 'ZIL-ASSET';

export function createQrPayload(token: string) {
  return `${QR_PREFIX}:${token}`;
}

export function parseQrPayload(rawValue: string) {
  const value = rawValue.trim();
  if (value.startsWith(`${QR_PREFIX}:`)) {
    return {
      type: 'token' as const,
      value: value.slice(QR_PREFIX.length + 1),
    };
  }

  return {
    type: 'asset-id' as const,
    value,
  };
}
