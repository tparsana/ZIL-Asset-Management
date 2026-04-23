import { NextRequest, NextResponse } from 'next/server';
import { createAsset, listAssets } from '@/lib/services/assets';
import { createAssetSchema, listAssetsSchema } from '@/lib/validators/assets';

export const runtime = 'nodejs';

/**
 * GET /api/assets
 * Retrieve all assets with optional filters
 * Query params: status, type, location, search
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listAssetsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assets = await listAssets(parsed.data);
  return NextResponse.json({ assets });
}

/**
 * POST /api/assets
 * Create a new asset
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const asset = await createAsset(parsed.data);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create asset';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
