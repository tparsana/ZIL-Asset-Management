import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser, listUsers } from '@/lib/services/catalog';

export const runtime = 'nodejs';

export async function GET() {
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const parsed = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email().optional(),
  }).safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await createUser(parsed.data);
  return NextResponse.json({ user }, { status: 201 });
}
