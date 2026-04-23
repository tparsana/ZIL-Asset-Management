import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/services/dashboard';

export const runtime = 'nodejs';

export async function GET() {
  const dashboard = await getDashboardSummary();
  return NextResponse.json(dashboard);
}
