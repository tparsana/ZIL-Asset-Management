'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import jsQR from 'jsqr';
import { Scan, Camera, Video, VideoOff, Search } from 'lucide-react';

interface ScannerPanelProps {
  onScanResult?: (value: string) => void;
  manualValue?: string;
  onManualValueChange?: (value: string) => void;
  onManualSubmit?: (value: string) => void;
  manualButtonLabel?: string;
  manualPlaceholder?: string;
  manualDisabled?: boolean;
  helpText?: string;
  className?: string;
}

export function ScannerPanel({
  onScanResult,
  manualValue,
  onManualValueChange,
  onManualSubmit,
  manualButtonLabel = 'Lookup',
  manualPlaceholder = 'CAM-001 or QR payload',
  manualDisabled = false,
  helpText = 'Scan an asset QR code or enter the asset ID manually.',
  className,
}: ScannerPanelProps) {
  const [scanLinePosition, setScanLinePosition] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onScanResultRef = useRef(onScanResult);

  useEffect(() => {
    onScanResultRef.current = onScanResult;
  }, [onScanResult]);

  useEffect(() => {
    if (cameraActive) {
      const interval = setInterval(() => {
        setScanLinePosition((prev) => (prev >= 100 ? 0 : prev + 2));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [cameraActive]);

  useEffect(() => {
    if (!cameraActive) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function startCamera() {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        interval = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context || canvas.width === 0 || canvas.height === 0) return;

          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            onScanResultRef.current?.(code.data);
            setCameraActive(false);
          }
        }, 250);
      } catch {
        setCameraError('Camera access failed. Use manual asset ID lookup or check browser permissions.');
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraActive]);

  function submitManualLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = manualValue?.trim();
    if (value) onManualSubmit?.(value);
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        {/* Scanner Viewport */}
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-foreground/5">
          {cameraActive && (
            <>
              <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}

          {/* Camera Frame */}
          <div className="absolute inset-4 border-2 border-dashed border-muted-foreground/30 rounded-lg" />
          
          {/* Corner Markers */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" />

          {/* Scan Line */}
          {cameraActive && (
            <div 
              className="absolute left-4 right-4 h-0.5 bg-primary shadow-[0_0_8px_2px] shadow-primary/50 transition-all"
              style={{ top: `${4 + (scanLinePosition / 100) * 80}%` }}
            />
          )}

          {/* Center Icon */}
          {!cameraActive && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Camera className="h-12 w-12" />
              <p className="text-sm font-medium">Position QR code in frame</p>
            </div>
          )}

          {cameraActive && (
            <div className="flex flex-col items-center gap-3 text-primary">
              <Scan className="h-12 w-12 animate-pulse" />
              <p className="text-sm font-medium">{cameraActive ? 'Scanning QR code...' : 'Scanning...'}</p>
            </div>
          )}
        </div>

        {/* Scanner Controls */}
        <div className="space-y-3 border-t border-border bg-card p-4">
          <div className="grid gap-2">
            <Button
              type="button"
              onClick={() => setCameraActive((active) => !active)}
              className="h-12 text-base"
              size="lg"
            >
              {cameraActive ? <VideoOff className="h-5 w-5 mr-2" /> : <Video className="h-5 w-5 mr-2" />}
              {cameraActive ? 'Stop Camera' : 'Scan QR'}
            </Button>
          </div>
          {onManualSubmit && (
            <form onSubmit={submitManualLookup} className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={manualValue ?? ''}
                onChange={(event) => onManualValueChange?.(event.target.value)}
                placeholder={manualPlaceholder}
                className="h-11"
              />
              <Button disabled={manualDisabled || !manualValue?.trim()} type="submit" variant="outline" className="h-11 sm:w-auto">
                <Search className="h-4 w-4 mr-2" />
                {manualButtonLabel}
              </Button>
            </form>
          )}
          {cameraError && <p className="text-xs text-destructive text-center mt-2">{cameraError}</p>}
          <p className="text-xs text-muted-foreground text-center mt-2">
            {helpText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
