'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatQrLabelAssetId } from '@/lib/qr';
import type { Asset } from '@/lib/types';
import { ChevronDown, Download, QrCode, RefreshCcw } from 'lucide-react';

interface QrCodeCardProps {
  asset: Asset;
  onRegenerate?: () => Promise<Asset | null>;
  regenerating?: boolean;
}

export function QrCodeCard({ asset, onRegenerate, regenerating = false }: QrCodeCardProps) {
  const [labelDataUrl, setLabelDataUrl] = useState('');
  const [qrOnlyDataUrl, setQrOnlyDataUrl] = useState('');
  const [labelStripDataUrl, setLabelStripDataUrl] = useState('');
  const qrLabelText = formatQrLabelAssetId(asset.assetId);

  useEffect(() => {
    let cancelled = false;

    async function generateQrAssets() {
      try {
        const qrDataUrl = await QRCode.toDataURL(asset.qrCodePayload, {
          errorCorrectionLevel: 'M',
          margin: 0,
          width: 640,
          color: {
            dark: '#2b0f14',
            light: '#ffffff',
          },
        });

        const image = new Image();
        image.src = qrDataUrl;
        await image.decode();

        const singleCanvas = document.createElement('canvas');
        const singleWidth = 640;
        const singleQrSize = 640;
        const singleTextGap = 16;
        const singleLabelBandTop = singleQrSize + singleTextGap;
        singleCanvas.width = singleWidth;
        singleCanvas.height = singleLabelBandTop + 66;

        const singleContext = singleCanvas.getContext('2d');
        if (!singleContext) throw new Error('Canvas is unavailable');

        singleContext.fillStyle = '#ffffff';
        singleContext.fillRect(0, 0, singleCanvas.width, singleCanvas.height);
        singleContext.drawImage(image, 0, 0, singleQrSize, singleQrSize);
        singleContext.fillStyle = '#2b0f14';
        singleContext.textAlign = 'center';
        singleContext.textBaseline = 'middle';
        singleContext.font = '700 50px Arial, sans-serif';
        singleContext.fillText(
          qrLabelText,
          singleWidth / 2,
          singleLabelBandTop + (singleCanvas.height - singleLabelBandTop) / 2,
        );

        const stripCanvas = document.createElement('canvas');
        const stripWidth = 1050;
        const stripHeight = 266;
        const copies = 4;
        const cellWidth = stripWidth / copies;
        const qrSize = 228;
        const qrTop = 10;
        const stripTextGap = 8;
        const labelBandTop = qrTop + qrSize + stripTextGap;
        stripCanvas.width = stripWidth;
        stripCanvas.height = stripHeight;

        const stripContext = stripCanvas.getContext('2d');
        if (!stripContext) throw new Error('Canvas is unavailable');

        stripContext.fillStyle = '#ffffff';
        stripContext.fillRect(0, 0, stripCanvas.width, stripCanvas.height);
        stripContext.imageSmoothingEnabled = false;
        stripContext.fillStyle = '#111111';
        stripContext.textAlign = 'center';
        stripContext.textBaseline = 'middle';
        stripContext.font = '700 22px Arial, sans-serif';

        for (let index = 0; index < copies; index += 1) {
          const cellLeft = index * cellWidth;
          const qrLeft = cellLeft + (cellWidth - qrSize) / 2;
          stripContext.drawImage(image, qrLeft, qrTop, qrSize, qrSize);
          stripContext.fillText(
            qrLabelText,
            cellLeft + cellWidth / 2,
            labelBandTop + (stripCanvas.height - labelBandTop) / 2,
          );
        }

        if (!cancelled) {
          setQrOnlyDataUrl(qrDataUrl);
          setLabelDataUrl(singleCanvas.toDataURL('image/png'));
          setLabelStripDataUrl(stripCanvas.toDataURL('image/png'));
        }
      } catch {
        if (!cancelled) toast.error('Unable to generate QR code');
      }
    }

    generateQrAssets();

    return () => {
      cancelled = true;
    };
  }, [asset.qrCodePayload, qrLabelText]);

  function downloadPng(dataUrl: string, filename: string) {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Asset QR Code
        </CardTitle>
        <CardDescription>
          Tagged to {asset.name} ({asset.assetId})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-white p-2">
          {labelDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={labelDataUrl} alt={`QR label for ${asset.assetId}`} className="mx-auto w-full max-w-72" />
          ) : (
            <div className="mx-auto flex aspect-square w-full max-w-72 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              Generating QR...
            </div>
          )}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Label text: {qrLabelText}</p>
          <p>Payload: {asset.qrCodePayload}</p>
          <p>Generated: {new Date(asset.qrCodeGeneratedAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={!labelDataUrl || !labelStripDataUrl || !qrOnlyDataUrl}>
                <Download className="mr-2 h-4 w-4" />
                Downlabel Label
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => downloadPng(labelDataUrl, `${asset.assetId}-qr-tag.png`)}
              >
                Download Single QR
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => downloadPng(labelStripDataUrl, `${asset.assetId}-tag-strip.png`)}
              >
                Download Label Strip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onRegenerate && (
            <Button type="button" variant="outline" onClick={onRegenerate} disabled={regenerating}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              {regenerating ? 'Regenerating...' : 'Regenerate QR'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
