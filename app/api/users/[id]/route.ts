import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CatalogError, deleteUser, updateUser } from '@/lib/services/catalog';

export const runtime = 'nodejs';

const userSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal('')),
});

function handleError(error: unknown, fallback: string) {
  if (error instanceof CatalogError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'User email already exists' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ error: fallback }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = userSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await updateUser(id, {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
    });
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error, 'Failed to update user');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await deleteUser(id);
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error, 'Failed to delete user');
  }
}
