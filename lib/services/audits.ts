import {
  AssetEventType,
  AssetStatus as DbAssetStatus,
  AuditResultType as DbAuditResultType,
  AuditStatus as DbAuditStatus,
} from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { AuditReport } from '@/lib/types';
import {
  assetInclude,
  auditScanInclude,
  eventInclude,
  toAsset,
  toAuditScan,
  toEvent,
  toLocation,
} from '@/lib/services/mappers';
import { parseQrPayload } from '@/lib/qr';

export async function startAudit(input: { locationId: string; startedBy?: string; notes?: string }) {
  const session = await prisma.$transaction(async (tx) => {
    const session = await tx.auditSession.create({
      data: {
        locationId: input.locationId,
        startedBy: input.startedBy,
        notes: input.notes,
      },
      include: {
        location: true,
      },
    });

    await tx.assetEvent.create({
      data: {
        eventType: AssetEventType.AUDIT_STARTED,
        toLocationId: input.locationId,
        handledBy: input.startedBy,
        remarks: input.notes,
        metadata: { auditSessionId: session.id },
      },
    });

    return {
      id: session.id,
      locationId: session.locationId,
      location: toLocation(session.location),
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      startedBy: session.startedBy,
      status: 'in-progress' as const,
      notes: session.notes,
    };
  });

  return {
    session,
    summary: await getAuditSummary(session.id),
  };
}

export async function getAuditSummary(sessionId: string, expectedOverride?: ReturnType<typeof toAsset>[]) {
  const session = await prisma.auditSession.findUnique({
    where: { id: sessionId },
    include: { location: true },
  });
  if (!session) return null;

  const [expectedAssets, scans] = await Promise.all([
    expectedOverride
      ? Promise.resolve(expectedOverride)
      : prisma.asset
          .findMany({
            where: {
              homeLocationId: session.locationId,
              status: { not: 'RETIRED' },
            },
            include: assetInclude,
            orderBy: { assetId: 'asc' },
          })
          .then((assets) => assets.map(toAsset)),
    prisma.auditScan.findMany({
      where: { auditSessionId: sessionId },
      include: auditScanInclude,
      orderBy: { scannedAt: 'asc' },
    }),
  ]);

  const mappedScans = scans.map(toAuditScan);
  const foundExpectedIds = new Set(
    mappedScans
      .filter((scan) => scan.resultType === 'expected-found' || scan.resultType === 'duplicate-scan')
      .map((scan) => scan.assetId),
  );
  const assetById = new Map(expectedAssets.map((asset) => [asset.id, asset]));

  return {
    expectedAssets,
    scans: mappedScans,
    expectedFound: expectedAssets.filter((asset) => foundExpectedIds.has(asset.id)),
    unexpectedFound: mappedScans
      .filter((scan) => scan.resultType === 'unexpected-found')
      .map((scan) => scan.asset)
      .filter(Boolean),
    missing: expectedAssets.filter((asset) => !foundExpectedIds.has(asset.id)),
    duplicateScans: mappedScans.filter((scan) => scan.resultType === 'duplicate-scan'),
    assetById,
  };
}

export async function getAuditReport(
  sessionId: string,
  summaryOverride?: Awaited<ReturnType<typeof getAuditSummary>> | null,
): Promise<AuditReport | null> {
  const session = await prisma.auditSession.findUnique({
    where: { id: sessionId },
    include: { location: true },
  });
  if (!session) return null;

  const summary = summaryOverride ?? await getAuditSummary(sessionId);
  if (!summary) return null;

  const missingIds = summary.missing.map((asset) => asset.id);
  const eventRecords = missingIds.length > 0
    ? await prisma.assetEvent.findMany({
        where: { assetId: { in: missingIds } },
        include: eventInclude,
        orderBy: [{ createdAt: 'desc' }],
      })
    : [];

  const eventsByAssetId = new Map<string, ReturnType<typeof toEvent>[]>();
  for (const event of eventRecords) {
    if (!event.assetId) continue;
    const mappedEvent = toEvent(event);
    const current = eventsByAssetId.get(event.assetId) ?? [];
    current.push(mappedEvent);
    eventsByAssetId.set(event.assetId, current);
  }

  return {
    generatedAt: new Date().toISOString(),
    session: {
      id: session.id,
      locationId: session.locationId,
      location: toLocation(session.location),
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      startedBy: session.startedBy,
      status: session.status === DbAuditStatus.IN_PROGRESS
        ? 'in-progress'
        : session.status === DbAuditStatus.COMPLETED
          ? 'completed'
          : 'cancelled',
      notes: session.notes,
    },
    location: toLocation(session.location),
    totals: {
      expectedAssets: summary.expectedAssets.length,
      scans: summary.scans.length,
      expectedFound: summary.expectedFound.length,
      missing: summary.missing.length,
      unexpectedFound: summary.unexpectedFound.length,
      duplicateScans: summary.duplicateScans.length,
    },
    missingItems: summary.missing.map((asset) => ({
      asset,
      eventHistory: eventsByAssetId.get(asset.id) ?? [],
    })),
    duplicateScans: summary.duplicateScans,
  };
}

export async function scanAuditAsset(sessionId: string, assetCode: string) {
  const scan = await prisma.$transaction(async (tx) => {
    const session = await tx.auditSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== DbAuditStatus.IN_PROGRESS) {
      throw new Error('Audit session is not active');
    }

    const parsedCode = parseQrPayload(assetCode);
    const asset = await tx.asset.findFirst({
      where: parsedCode.type === 'token'
        ? { qrCodeToken: parsedCode.value }
        : { OR: [{ id: parsedCode.value }, { assetId: parsedCode.value.toUpperCase() }] },
      include: assetInclude,
    });
    if (!asset) throw new Error('Asset not found');

    const priorScan = await tx.auditScan.findFirst({
      where: {
        auditSessionId: sessionId,
        assetId: asset.id,
      },
    });

    const resultType = priorScan
      ? DbAuditResultType.DUPLICATE_SCAN
      : asset.homeLocationId === session.locationId
        ? DbAuditResultType.EXPECTED_FOUND
        : DbAuditResultType.UNEXPECTED_FOUND;

    const scan = await tx.auditScan.create({
      data: {
        auditSessionId: sessionId,
        assetId: asset.id,
        resultType,
      },
      include: auditScanInclude,
    });

    await tx.assetEvent.create({
      data: {
        assetId: asset.id,
        eventType: AssetEventType.AUDIT_SCANNED,
        toLocationId: session.locationId,
        metadata: { auditSessionId: sessionId, resultType },
      },
    });

    return toAuditScan(scan);
  });

  return {
    scan,
    summary: await getAuditSummary(sessionId),
  };
}

export async function completeAudit(sessionId: string, handledBy?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const existingSession = await tx.auditSession.findUnique({
      where: { id: sessionId },
      include: { location: true },
    });
    if (!existingSession) {
      throw new Error('Audit session not found');
    }
    if (existingSession.status !== DbAuditStatus.IN_PROGRESS) {
      throw new Error('Audit session is not active');
    }

    const expectedAssets = await tx.asset.findMany({
      where: {
        homeLocationId: existingSession.locationId,
        status: { not: DbAssetStatus.RETIRED },
      },
      include: assetInclude,
      orderBy: { assetId: 'asc' },
    });

    const scans = await tx.auditScan.findMany({
      where: { auditSessionId: sessionId },
      include: auditScanInclude,
      orderBy: { scannedAt: 'asc' },
    });

    const foundExpectedIds = new Set(
      scans
        .filter((scan) => scan.resultType === DbAuditResultType.EXPECTED_FOUND || scan.resultType === DbAuditResultType.DUPLICATE_SCAN)
        .map((scan) => scan.assetId),
    );

    const missingAssets = expectedAssets.filter((asset) => !foundExpectedIds.has(asset.id));
    const auditHandler = handledBy ?? existingSession.startedBy ?? undefined;

    for (const asset of missingAssets) {
      if (asset.status === DbAssetStatus.MISSING) continue;

      await tx.asset.update({
        where: { id: asset.id },
        data: { status: DbAssetStatus.MISSING },
      });

      await tx.assetEvent.create({
        data: {
          assetId: asset.id,
          eventType: AssetEventType.MARKED_MISSING,
          fromLocationId: asset.currentLocationId,
          toLocationId: asset.currentLocationId,
          previousStatus: asset.status,
          newStatus: DbAssetStatus.MISSING,
          handledBy: auditHandler,
          remarks: `Marked missing during audit for ${existingSession.location.name}`,
          metadata: { auditSessionId: existingSession.id },
        },
      });
    }

    const session = await tx.auditSession.update({
      where: { id: sessionId },
      data: {
        status: DbAuditStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: { location: true },
    });

    await tx.assetEvent.create({
      data: {
        eventType: AssetEventType.AUDIT_COMPLETED,
        toLocationId: session.locationId,
        handledBy: auditHandler,
        remarks: missingAssets.length > 0
          ? `${missingAssets.length} missing asset${missingAssets.length === 1 ? '' : 's'} marked missing during audit completion`
          : 'Audit completed with no missing assets',
        metadata: { auditSessionId: session.id, missingAssetCount: missingAssets.length },
      },
    });

    return {
      session: {
        id: session.id,
        locationId: session.locationId,
        location: toLocation(session.location),
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
        startedBy: session.startedBy,
        status: 'completed' as const,
        notes: session.notes,
      },
    };
  });

  const summary = await getAuditSummary(sessionId);
  const report = await getAuditReport(sessionId, summary);

  return {
    session: result.session,
    summary,
    report,
  };
}
