import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const EXTENSIONS_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
  }

  if (!EXTENSIONS_BY_TYPE[file.type]) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are supported' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Image must be 5 MB or smaller' }, { status: 400 });
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads', 'assets');
  await mkdir(uploadsDir, { recursive: true });

  const extension = EXTENSIONS_BY_TYPE[file.type];
  const filename = `${randomUUID()}.${extension}`;
  const filepath = join(uploadsDir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(filepath, bytes);

  return NextResponse.json({
    url: `/uploads/assets/${filename}`,
  });
}
