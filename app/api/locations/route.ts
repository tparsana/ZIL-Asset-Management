import { NextRequest, NextResponse } from 'next/server';
import { createLocation } from '@/lib/services/catalog';
import { getLocationDetails, listLocationsWithCounts } from '@/lib/services/locations';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * GET /api/locations
 * Retrieve all locations (rooms and storage)
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    const details = await getLocationDetails(id);
    if (!details) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    return NextResponse.json(details);
  }

  const locations = await listLocationsWithCounts();
  return NextResponse.json({ locations });
}

/**
 * POST /api/locations
 * Create a new location
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = z.object({
    name: z.string().trim().min(1),
    kind: z.enum(['room', 'storage']),
    description: z.string().trim().optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const location = await createLocation(parsed.data);
  return NextResponse.json({ location }, { status: 201 });
}
