'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Asset } from '@/lib/types';
import { Download, QrCode, RefreshCcw } from 'lucide-react';

interface QrCodeCardProps {
  asset: Asset;
  onRegenerate?: () => Promise<Asset | null>;
  regenerating?: boolean;
}

export function QrCodeCard({ asset, onRegenerate, regenerating = false }: QrCodeCardProps) {
  const [labelDataUrl, setLabelDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function generateQrLabel() {
      try {
        const qrDataUrl = await QRCode.toDataURL(asset.qrCodePayload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 600,
          color: {
            dark: '#2b0f14',
            light: '#ffffff',
          },
        });

        const image = new Image();
        image.src = qrDataUrl;
        await image.decode();

        const canvas = document.createElement('canvas');
        const width = 640;
        const qrSize = 600;
        const topPadding = 6;
        const textTop = topPadding + qrSize + 8;
        canvas.width = width;
        canvas.height = textTop + 54;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable');

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, (width - qrSize) / 2, topPadding, qrSize, qrSize);

        context.fillStyle = '#2b0f14';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.font = '700 40px Arial, sans-serif';
        context.fillText(asset.assetId, width / 2, textTop);

        if (!cancelled) setLabelDataUrl(canvas.toDataURL('image/png'));
      } catch {
        if (!cancelled) toast.error('Unable to generate QR code');
      }
    }

    generateQrLabel();

    return () => {
      cancelled = true;
    };
  }, [asset.qrCodePayload, asset.assetId]);

  function downloadQrCode() {
    if (!labelDataUrl) return;
    const link = document.createElement('a');
    link.href = labelDataUrl;
    link.download = `${asset.assetId}-qr-label.png`;
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
        <div className="rounded-xl border bg-white p-4">
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
          <p>Label text: {asset.assetId}</p>
          <p>Payload: {asset.qrCodePayload}</p>
          <p>Generated: {new Date(asset.qrCodeGeneratedAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={downloadQrCode} disabled={!labelDataUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download Label PNG
          </Button>
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
