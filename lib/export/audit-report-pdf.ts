import type { AuditReport, AssetEvent } from '@/lib/types';
import { formatDateTime, formatEventType } from '@/lib/format';

type PdfLibModule = typeof import('pdf-lib');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PRIMARY = { r: 0.44, g: 0.12, b: 0.14 };
const MUTED = { r: 0.42, g: 0.42, b: 0.45 };
const LIGHT_BORDER = { r: 0.87, g: 0.85, b: 0.82 };
const LIGHT_FILL = { r: 0.98, g: 0.97, b: 0.95 };
const SUCCESS = { r: 0.36, g: 0.62, b: 0.41 };
const DANGER = { r: 0.78, g: 0.24, b: 0.24 };

function splitText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const nextLine = `${currentLine} ${words[index]}`;
    if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = words[index];
    }
  }

  lines.push(currentLine);
  return lines;
}

function normalizeAssetUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
}

async function blobToPngBytes(blob: Blob) {
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.crossOrigin = 'anonymous';
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Failed to load image'));
      nextImage.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to render image');

    context.drawImage(image, 0, 0);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Failed to convert image'));
      }, 'image/png');
    });

    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function fetchImageBytes(url?: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(normalizeAssetUrl(url));
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToPngBytes(blob);
  } catch {
    return null;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function locationLine(event: AssetEvent) {
  if (event.fromLocation && event.toLocation) {
    return `${event.fromLocation.name} -> ${event.toLocation.name}`;
  }

  if (event.toLocation) return event.toLocation.name;
  if (event.fromLocation) return event.fromLocation.name;
  return 'No location recorded';
}

function safeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function exportAuditReportPdf(report: AuditReport) {
  const pdfLib: PdfLibModule = await import('pdf-lib');
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const document = await PDFDocument.create();
  const regularFont = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await fetchImageBytes('/zil-asu-logo.png');
  const logoImage = logoBytes ? await document.embedPng(logoBytes) : null;

  const imageBytesByAssetId = new Map<string, Uint8Array | null>();
  await Promise.all(
    report.missingItems.map(async (item) => {
      imageBytesByAssetId.set(item.asset.id, await fetchImageBytes(item.asset.referenceImageUrl));
    }),
  );

  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function addPage() {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensureSpace(height: number) {
    if (y - height < MARGIN) addPage();
  }

  function drawWrappedText(options: {
    text: string;
    x: number;
    yTop: number;
    maxWidth: number;
    fontSize: number;
    lineHeight: number;
    color?: { r: number; g: number; b: number };
    font?: typeof regularFont;
  }) {
    const font = options.font ?? regularFont;
    const lines = splitText(options.text, options.maxWidth, font, options.fontSize);
    lines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: options.x,
        y: options.yTop - options.fontSize - lineIndex * options.lineHeight,
        size: options.fontSize,
        font,
        color: rgb(options.color?.r ?? 0, options.color?.g ?? 0, options.color?.b ?? 0),
      });
    });

    return lines.length * options.lineHeight;
  }

  if (logoImage) {
    const maxLogoWidth = 118;
    const maxLogoHeight = 58;
    const logoScale = Math.min(maxLogoWidth / logoImage.width, maxLogoHeight / logoImage.height);
    const dimensions = logoImage.scale(logoScale);
    page.drawImage(logoImage, {
      x: PAGE_WIDTH - MARGIN - dimensions.width,
      y: y - dimensions.height + 2,
      width: dimensions.width,
      height: dimensions.height,
    });
  }

  page.drawText('Audit Report', {
    x: MARGIN,
    y: y - 20,
    size: 24,
    font: boldFont,
    color: rgb(PRIMARY.r, PRIMARY.g, PRIMARY.b),
  });
  page.drawText(report.location.name, {
    x: MARGIN,
    y: y - 48,
    size: 14,
    font: regularFont,
    color: rgb(MUTED.r, MUTED.g, MUTED.b),
  });
  y -= 84;

  page.drawRectangle({
    x: MARGIN,
    y: y - 88,
    width: CONTENT_WIDTH,
    height: 88,
    borderWidth: 1,
    borderColor: rgb(LIGHT_BORDER.r, LIGHT_BORDER.g, LIGHT_BORDER.b),
    color: rgb(LIGHT_FILL.r, LIGHT_FILL.g, LIGHT_FILL.b),
  });

  const metaItems = [
    ['Started By', report.session.startedBy ?? 'Not recorded'],
    ['Started', formatDateTime(report.session.startedAt)],
    ['Completed', formatDateTime(report.session.completedAt ?? report.generatedAt)],
    ['Generated', formatDateTime(report.generatedAt)],
  ];

  metaItems.forEach(([label, value], index) => {
    const columnX = MARGIN + 18 + (index % 2) * (CONTENT_WIDTH / 2);
    const rowY = y - 18 - Math.floor(index / 2) * 34;
    page.drawText(label, {
      x: columnX,
      y: rowY,
      size: 9,
      font: boldFont,
      color: rgb(MUTED.r, MUTED.g, MUTED.b),
    });
    page.drawText(value, {
      x: columnX,
      y: rowY - 16,
      size: 11,
      font: regularFont,
      color: rgb(0.12, 0.12, 0.13),
    });
  });
  y -= 112;

  page.drawText('Summary', {
    x: MARGIN,
    y: y - 14,
    size: 14,
    font: boldFont,
    color: rgb(PRIMARY.r, PRIMARY.g, PRIMARY.b),
  });
  y -= 28;

  const summaryItems = [
    ['Expected Assets', String(report.totals.expectedAssets), MUTED],
    ['Scans', String(report.totals.scans), MUTED],
    ['Found', String(report.totals.expectedFound), SUCCESS],
    ['Missing', String(report.totals.missing), DANGER],
    ['Unexpected', String(report.totals.unexpectedFound), MUTED],
    ['Duplicate Scans', String(report.totals.duplicateScans), MUTED],
  ] as const;

  const cardWidth = (CONTENT_WIDTH - 24) / 3;
  summaryItems.forEach(([label, value, color], index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    const x = MARGIN + column * (cardWidth + 12);
    const cardY = y - row * 68;

    page.drawRectangle({
      x,
      y: cardY - 52,
      width: cardWidth,
      height: 52,
      borderWidth: 1,
      borderColor: rgb(LIGHT_BORDER.r, LIGHT_BORDER.g, LIGHT_BORDER.b),
      color: rgb(1, 1, 1),
    });
    page.drawText(label, {
      x: x + 12,
      y: cardY - 16,
      size: 9,
      font: boldFont,
      color: rgb(MUTED.r, MUTED.g, MUTED.b),
    });
    page.drawText(value, {
      x: x + 12,
      y: cardY - 38,
      size: 16,
      font: boldFont,
      color: rgb(color.r, color.g, color.b),
    });
  });

  y -= 150;

  page.drawText('Missing Item Index', {
    x: MARGIN,
    y: y - 14,
    size: 14,
    font: boldFont,
    color: rgb(PRIMARY.r, PRIMARY.g, PRIMARY.b),
  });
  y -= 28;

  if (report.missingItems.length === 0) {
    page.drawText('No missing items remained after audit completion.', {
      x: MARGIN,
      y: y - 12,
      size: 11,
      font: regularFont,
      color: rgb(SUCCESS.r, SUCCESS.g, SUCCESS.b),
    });
  } else {
    report.missingItems.forEach((item) => {
      ensureSpace(22);
      page.drawText(`${item.asset.assetId}  ${item.asset.name}`, {
        x: MARGIN,
        y: y - 12,
        size: 11,
        font: boldFont,
        color: rgb(0.15, 0.15, 0.16),
      });
      y -= 22;
    });
  }

  for (const [itemIndex, item] of report.missingItems.entries()) {
    addPage();

    page.drawText(`Missing Item Trace ${itemIndex + 1}`, {
      x: MARGIN,
      y: y - 18,
      size: 20,
      font: boldFont,
      color: rgb(PRIMARY.r, PRIMARY.g, PRIMARY.b),
    });
    page.drawText(`${item.asset.name} (${item.asset.assetId})`, {
      x: MARGIN,
      y: y - 44,
      size: 13,
      font: regularFont,
      color: rgb(MUTED.r, MUTED.g, MUTED.b),
    });
    y -= 70;

    page.drawRectangle({
      x: MARGIN,
      y: y - 110,
      width: CONTENT_WIDTH,
      height: 110,
      borderWidth: 1,
      borderColor: rgb(LIGHT_BORDER.r, LIGHT_BORDER.g, LIGHT_BORDER.b),
      color: rgb(LIGHT_FILL.r, LIGHT_FILL.g, LIGHT_FILL.b),
    });

    const imageX = MARGIN + 16;
    const imageTop = y - 16;
    const imageSize = 72;
    const imageBytes = imageBytesByAssetId.get(item.asset.id) ?? null;

    if (imageBytes) {
      const embeddedImage = await document.embedPng(imageBytes);
      const scale = Math.min(imageSize / embeddedImage.width, imageSize / embeddedImage.height);
      const width = embeddedImage.width * scale;
      const height = embeddedImage.height * scale;
      page.drawImage(embeddedImage, {
        x: imageX + (imageSize - width) / 2,
        y: imageTop - height - (imageSize - height) / 2,
        width,
        height,
      });
      page.drawRectangle({
        x: imageX,
        y: imageTop - imageSize,
        width: imageSize,
        height: imageSize,
        borderWidth: 1,
        borderColor: rgb(LIGHT_BORDER.r, LIGHT_BORDER.g, LIGHT_BORDER.b),
      });
    } else {
      page.drawRectangle({
        x: imageX,
        y: imageTop - imageSize,
        width: imageSize,
        height: imageSize,
        borderWidth: 1,
        borderColor: rgb(LIGHT_BORDER.r, LIGHT_BORDER.g, LIGHT_BORDER.b),
        color: rgb(1, 1, 1),
      });
      page.drawText('No Photo', {
        x: imageX + 12,
        y: imageTop - 42,
        size: 10,
        font: boldFont,
        color: rgb(MUTED.r, MUTED.g, MUTED.b),
      });
    }

    const detailX = imageX + imageSize + 18;
    page.drawText(item.asset.name, {
      x: detailX,
      y: y - 24,
      size: 15,
      font: boldFont,
      color: rgb(0.12, 0.12, 0.13),
    });
    page.drawText(item.asset.assetId, {
      x: detailX,
      y: y - 42,
      size: 11,
      font: regularFont,
      color: rgb(MUTED.r, MUTED.g, MUTED.b),
    });

    const details = [
      `Home Location: ${item.asset.homeLocation.name}`,
      `Last Known Location: ${item.asset.currentLocation.name}`,
      'Status: Missing',
    ];
    details.forEach((detail, index) => {
      page.drawText(detail, {
        x: detailX,
        y: y - 64 - index * 14,
        size: 10.5,
        font: index === 2 ? boldFont : regularFont,
        color: index === 2 ? rgb(DANGER.r, DANGER.g, DANGER.b) : rgb(0.16, 0.16, 0.17),
      });
    });

    y -= 132;
    page.drawText('Event History', {
      x: MARGIN,
      y: y - 14,
      size: 13,
      font: boldFont,
      color: rgb(PRIMARY.r, PRIMARY.g, PRIMARY.b),
    });
    y -= 30;

    if (item.eventHistory.length === 0) {
      page.drawText('No event history recorded for this asset yet.', {
        x: MARGIN,
        y: y - 12,
        size: 10.5,
        font: regularFont,
        color: rgb(MUTED.r, MUTED.g, MUTED.b),
      });
      y -= 28;
      return;
    }

    item.eventHistory.forEach((event, eventIndex) => {
      const remarksLines = event.remarks
        ? splitText(event.remarks, CONTENT_WIDTH - 30, regularFont, 10)
        : [];
      const eventHeight = 66 + remarksLines.length * 12;
      ensureSpace(eventHeight + 10);

      page.drawRectangle({
        x: MARGIN,
        y: y - eventHeight,
        width: CONTENT_WIDTH,
        height: eventHeight,
        borderWidth: 1,
        borderColor: rgb(LIGHT_BORDER.r, LIGHT_BORDER.g, LIGHT_BORDER.b),
        color: rgb(eventIndex % 2 === 0 ? 1 : 0.985, eventIndex % 2 === 0 ? 1 : 0.985, eventIndex % 2 === 0 ? 1 : 0.985),
      });

      page.drawText(formatEventType(event.eventType), {
        x: MARGIN + 14,
        y: y - 20,
        size: 11,
        font: boldFont,
        color: rgb(0.13, 0.13, 0.14),
      });
      page.drawText(locationLine(event), {
        x: MARGIN + 14,
        y: y - 36,
        size: 10,
        font: regularFont,
        color: rgb(MUTED.r, MUTED.g, MUTED.b),
      });
      page.drawText(formatDateTime(event.createdAt), {
        x: PAGE_WIDTH - MARGIN - 170,
        y: y - 20,
        size: 10,
        font: regularFont,
        color: rgb(MUTED.r, MUTED.g, MUTED.b),
      });
      if (event.handledBy) {
        page.drawText(`by ${event.handledBy}`, {
          x: PAGE_WIDTH - MARGIN - 170,
          y: y - 36,
          size: 10,
          font: regularFont,
          color: rgb(MUTED.r, MUTED.g, MUTED.b),
        });
      }

      if (remarksLines.length > 0) {
        remarksLines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x: MARGIN + 14,
            y: y - 54 - lineIndex * 12,
            size: 10,
            font: regularFont,
            color: rgb(0.2, 0.2, 0.22),
          });
        });
      }

      y -= eventHeight + 10;
    });
  }

  const pdfBytes = await document.save();
  const locationName = safeFilePart(report.location.name) || 'location';
  const datePart = report.generatedAt.slice(0, 10);
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `audit-report-${locationName}-${datePart}.pdf`);
}
