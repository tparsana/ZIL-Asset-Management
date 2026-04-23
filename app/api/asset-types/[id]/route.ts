import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CatalogError, deleteAssetType, updateAssetType } from '@/lib/services/catalog';

export const runtime = 'nodejs';

const assetTypeSchema = z.object({
  name: z.string().trim().min(1),
  prefix: z.string().trim().min(2).max(6),
  description: z.string().trim().optional(),
});

function handleError(error: unknown, fallback: string) {
  if (error instanceof CatalogError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Asset type name or prefix already exists' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Asset type not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ error: fallback }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = assetTypeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const assetType = await updateAssetType(id, parsed.data);
    return NextResponse.json({ assetType });
  } catch (error) {
    return handleError(error, 'Failed to update asset type');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const assetType = await deleteAssetType(id);
    return NextResponse.json({ assetType });
  } catch (error) {
    return handleError(error, 'Failed to delete asset type');
  }
}
