import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAssetType, listAssetTypes } from '@/lib/services/catalog';

export const runtime = 'nodejs';

export async function GET() {
  const assetTypes = await listAssetTypes();
  return NextResponse.json({ assetTypes });
}

export async function POST(request: NextRequest) {
  const parsed = z.object({
    name: z.string().trim().min(1),
    prefix: z.string().trim().min(2).max(6),
    description: z.string().trim().optional(),
  }).safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assetType = await createAssetType(parsed.data);
  return NextResponse.json({ assetType }, { status: 201 });
}
