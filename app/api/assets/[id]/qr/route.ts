import { NextRequest, NextResponse } from 'next/server';
import { regenerateAssetQrCode } from '@/lib/services/assets';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const asset = await regenerateAssetQrCode(id, typeof body.handledBy === 'string' ? body.handledBy : undefined);
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to regenerate QR code';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
