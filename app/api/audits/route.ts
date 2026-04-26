import { NextResponse } from 'next/server';
import { listAuditSessions } from '@/lib/services/audits';

export const runtime = 'nodejs';

export async function GET() {
  const sessions = await listAuditSessions();
  return NextResponse.json({ sessions });
}
