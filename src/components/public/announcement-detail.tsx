'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, Download, FileText } from 'lucide-react';
import type { Announcement, AnnouncementMedia } from '@/types';

interface AnnouncementDetailProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getMediaUrl: (media: AnnouncementMedia) => string;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnnouncementDetail({
  announcement,
  open,
  onOpenChange,
  getMediaUrl,
}: AnnouncementDetailProps) {
  if (!announcement) return null;

  const media = announcement.media ?? [];
  const images = media.filter((m) => m.media_type === 'image');
  const videos = media.filter((m) => m.media_type === 'video');
  const embeds = media.filter((m) => m.media_type === 'embed');
  const documents = media.filter((m) => m.media_type === 'document');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pr-8">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{announcement.title}</SheetTitle>
            {announcement.is_pinned && (
              <Badge className="gap-0.5 border-0 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                <Pin className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
          <SheetDescription>
            {announcement.published_at
              ? new Date(announcement.published_at).toLocaleDateString('es-CL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {/* Cover image */}
          {announcement.cover_image_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={announcement.cover_image_url}
              alt=""
              className="w-full rounded-lg object-cover"
              style={{ maxHeight: '300px' }}
            />
          )}

          {/* Content */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {announcement.content}
          </div>

          {/* Image gallery */}
          {images.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Fotos</h3>
              <div className="grid grid-cols-2 gap-2">
                {images.map((img) => {
                  const url = getMediaUrl(img);
                  return (
                    <a
                      key={img.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-lg"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={img.file_name}
                        className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="p-2 text-xs text-white">
                          <Download className="inline h-3 w-3" /> Abrir
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Videos</h3>
              {videos.map((vid) => {
                const url = getMediaUrl(vid);
                return (
                  <div key={vid.id} className="overflow-hidden rounded-lg">
                    <video
                      controls
                      preload="metadata"
                      className="w-full rounded-lg"
                      style={{ maxHeight: '300px' }}
                    >
                      <source src={url} type={vid.file_type} />
                    </video>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{vid.file_name}</span>
                      <a href={url} download={vid.file_name}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Download className="mr-1 h-3 w-3" />
                          Descargar
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* YouTube embeds */}
          {embeds.length > 0 && (
            <div className="space-y-2">
              {embeds.map((embed) => {
                const ytId = extractYouTubeId(embed.embed_url ?? '');
                if (!ytId) return null;
                return (
                  <div key={embed.id} className="overflow-hidden rounded-lg">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={embed.file_name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full rounded-lg"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Documentos</h3>
              {documents.map((doc) => {
                const url = getMediaUrl(doc);
                return (
                  <a
                    key={doc.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {media.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">Sin archivos adjuntos</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
