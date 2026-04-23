import { NextRequest, NextResponse } from 'next/server';
import { startAudit } from '@/lib/services/audits';
import { startAuditSchema } from '@/lib/validators/assets';

export const runtime = 'nodejs';

/**
 * POST /api/audits/start
 * Begin an audit session for a location
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = startAuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const audit = await startAudit(parsed.data);
  return NextResponse.json(audit, { status: 201 });
}
