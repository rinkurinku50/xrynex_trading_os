import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

function validImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET() {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const screenshot = await prisma.economicCalendarScreenshot.findUnique({ where: { ownerId: user.id } });
  return NextResponse.json({ image_url: screenshot?.imageUrl ?? '', overlay_opacity: screenshot?.overlayOpacity ?? 15, updated_at: screenshot?.updatedAt?.toISOString() ?? null });
}

export async function PUT(request) {
  const user = await requireAuthenticatedApi();
  if (user instanceof Response) return user;
  const body = await request.json();
  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : '';
  const requestedOpacity = Number(body.overlay_opacity);
  const overlayOpacity = Number.isFinite(requestedOpacity)
    ? Math.max(0, Math.min(60, Math.round(requestedOpacity)))
    : 15;

  if (imageUrl && !validImageUrl(imageUrl)) {
    return NextResponse.json({ error: 'Enter a valid http or https image or Google Drive URL.' }, { status: 400 });
  }

  const screenshot = await prisma.economicCalendarScreenshot.upsert({
    where: { ownerId: user.id },
    create: { ownerId: user.id, imageUrl: imageUrl || null, overlayOpacity },
    update: { imageUrl: imageUrl || null, overlayOpacity },
  });

  return NextResponse.json({ image_url: screenshot.imageUrl ?? '', overlay_opacity: screenshot.overlayOpacity });
}
