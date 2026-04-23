import { NextRequest, NextResponse } from 'next/server';
import { applyAssetAction } from '@/lib/services/assets';
import { assetActionSchema } from '@/lib/validators/assets';

export const runtime = 'nodejs';

/**
 * POST /api/assets/[id]/scan
 * Record a scan event for an asset
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = assetActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const asset = await applyAssetAction(id, parsed.data);
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update asset';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
