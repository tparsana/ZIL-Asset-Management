import { NextRequest, NextResponse } from 'next/server';
import { applyBatchAction } from '@/lib/services/assets';
import { batchActionSchema } from '@/lib/validators/assets';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const parsed = batchActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const assets = await applyBatchAction(parsed.data);
    return NextResponse.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process batch';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
