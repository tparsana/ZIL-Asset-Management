'use client';

import { ChangeEvent, useState } from 'react';
import { toast } from 'sonner';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Link as LinkIcon, Upload } from 'lucide-react';

interface ReferenceImageFieldProps {
  name: string;
  defaultValue?: string | null;
  label?: string;
}

export function shortenImageUrl(value?: string | null) {
  if (!value) return '';
  if (value.length <= 42) return value;

  const start = value.slice(0, 24);
  const end = value.slice(-14);
  return `${start}...${end}`;
}

export function ReferenceImageField({
  name,
  defaultValue,
  label = 'Reference Image',
}: ReferenceImageFieldProps) {
  const [url, setUrl] = useState(defaultValue ?? '');
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await fetch('/api/uploads/reference-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Image upload failed');

      setUrl(data.url);
      toast.success('Reference image added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Image upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <Label htmlFor={`${name}-url`}>{label}</Label>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <AssetThumbnail src={url} alt="Reference image preview" className="h-20 w-20 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${name}-url`}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste image URL or upload/take a picture"
              className="pl-9"
            />
          </div>
          {url && <p className="truncate text-xs text-muted-foreground">{shortenImageUrl(url)}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
              <label className="cursor-pointer">
                <Camera className="h-4 w-4 mr-2" />
                Take Picture
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
