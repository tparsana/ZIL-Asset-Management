import { AssetEventType, AuditResultType as DbAuditResultType, AuditStatus as DbAuditStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { assetInclude, auditScanInclude, toAsset, toAuditScan, toLocation } from '@/lib/services/mappers';
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
  const session = await prisma.$transaction(async (tx) => {
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
        handledBy,
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
      status: 'completed' as const,
      notes: session.notes,
    };
  });

  return {
    session,
    summary: await getAuditSummary(session.id),
  };
}
