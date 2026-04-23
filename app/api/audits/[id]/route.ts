import { NextRequest, NextResponse } from 'next/server';
import { completeAudit, getAuditSummary, scanAuditAsset } from '@/lib/services/audits';
import { scanAuditSchema } from '@/lib/validators/assets';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const summary = await getAuditSummary(id);
  if (!summary) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

  return NextResponse.json({ summary });
}

/**
 * POST /api/audits/[id]/scan
 * Record a scan during an audit session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = scanAuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await scanAuditAsset(id, parsed.data.assetId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record audit scan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * POST /api/audits/[id]/complete
 * Complete an audit session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await completeAudit(id, body.handledBy);
  return NextResponse.json(result);
}
