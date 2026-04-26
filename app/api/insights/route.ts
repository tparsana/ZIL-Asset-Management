import { NextRequest, NextResponse } from 'next/server';
import { getInsightsDashboard } from '@/lib/services/insights';
import { insightsQuerySchema } from '@/lib/validators/insights';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsed = insightsQuerySchema.safeParse({
    fromDate: searchParams.get('fromDate') ?? undefined,
    toDate: searchParams.get('toDate') ?? undefined,
    locationId: searchParams.get('locationId') ?? undefined,
    assetTypeId: searchParams.get('assetTypeId') ?? undefined,
    granularity: searchParams.get('granularity') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const insights = await getInsightsDashboard(parsed.data);
    return NextResponse.json(insights);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load insights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
