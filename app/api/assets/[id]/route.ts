import { NextRequest, NextResponse } from 'next/server';
import { deleteAsset, getAssetById, updateAsset } from '@/lib/services/assets';
import { listEventsForAsset } from '@/lib/services/events';
import { updateAssetSchema } from '@/lib/validators/assets';

export const runtime = 'nodejs';

/**
 * GET /api/assets/[id]
 * Retrieve a single asset by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const asset = await getAssetById(id);
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  const events = await listEventsForAsset(asset.id);
  return NextResponse.json({ asset, events });
}

/**
 * PATCH /api/assets/[id]
 * Update an asset
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const asset = await updateAsset(id, parsed.data);
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update asset';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/assets/[id]
 * Delete an asset
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    let handledBy: string | undefined;
    try {
      const body = await request.json();
      handledBy =
        body && typeof body.handledBy === 'string' && body.handledBy.trim()
          ? body.handledBy.trim()
          : undefined;
    } catch {
      handledBy = undefined;
    }

    const asset = await deleteAsset(id, handledBy);
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete asset';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
