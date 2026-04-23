import { NextRequest, NextResponse } from 'next/server';
import { listEvents } from '@/lib/services/events';
import { listEventsSchema } from '@/lib/validators/assets';

export const runtime = 'nodejs';

/**
 * GET /api/events
 * Retrieve asset transaction history
 * Query params: assetId, actionType, fromDate, toDate, page, limit
 */
export async function GET(request: NextRequest) {
  const parsed = listEventsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const events = await listEvents(parsed.data);
  return NextResponse.json({ events });
}

/**
 * POST /api/events
 * Create a transaction event manually
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Manual event creation is disabled. Use asset actions so state and history stay consistent.' },
    { status: 405 },
  );
}
