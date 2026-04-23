import { NextRequest, NextResponse } from 'next/server';
import { getAssetById, getAssetByQrToken } from '@/lib/services/assets';
import { parseQrPayload } from '@/lib/qr';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const value = typeof body.value === 'string' ? body.value : '';
  if (!value.trim()) {
    return NextResponse.json({ error: 'Lookup value is required' }, { status: 400 });
  }

  const parsed = parseQrPayload(value);
  const asset = parsed.type === 'token'
    ? await getAssetByQrToken(parsed.value)
    : await getAssetById(parsed.value);

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  return NextResponse.json({ asset, lookupType: parsed.type });
}
