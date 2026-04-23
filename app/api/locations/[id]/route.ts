import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CatalogError, deleteLocation, updateLocation } from '@/lib/services/catalog';

export const runtime = 'nodejs';

const locationSchema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(['room', 'storage']),
  description: z.string().trim().optional(),
});

function handleError(error: unknown, fallback: string) {
  if (error instanceof CatalogError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Location name already exists' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ error: fallback }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = locationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const location = await updateLocation({ id, ...parsed.data });
    return NextResponse.json({ location });
  } catch (error) {
    return handleError(error, 'Failed to update location');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const location = await deleteLocation(id);
    return NextResponse.json({ location });
  } catch (error) {
    return handleError(error, 'Failed to delete location');
  }
}
