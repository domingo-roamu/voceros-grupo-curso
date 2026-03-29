'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, Image as ImageIcon, Video, FileText, Link, Star } from 'lucide-react';
import {
  uploadAnnouncementFile,
  getPublicUrl,
  deleteAnnouncementFile,
  validateFile,
  getMediaType,
  ALL_ALLOWED_TYPES,
} from '@/lib/supabase/storage';
import type { Announcement, AnnouncementMedia } from '@/types';

interface AnnouncementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
}

interface PendingFile {
  file: File;
  preview: string | null;
  isCover: boolean;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

export function AnnouncementForm({ open, onOpenChange, announcement }: AnnouncementFormProps) {
  const router = useRouter();
  const isEditing = !!announcement;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [isPinned, setIsPinned] = useState(announcement?.is_pinned ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media state
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [existingMedia, setExistingMedia] = useState<AnnouncementMedia[]>(
    announcement?.media ?? []
  );
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [embedUrl, setEmbedUrl] = useState('');
  const [pendingEmbeds, setPendingEmbeds] = useState<string[]>([]);
  const [coverMediaId] = useState<string | null>(
    announcement?.cover_image_url ? 'existing' : null
  );

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newPending: PendingFile[] = [];

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      newPending.push({ file, preview, isCover: false });
    }

    setPendingFiles((prev) => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!);
      updated.splice(index, 1);
      return updated;
    });
  }

  function removeExistingMedia(mediaId: string) {
    setRemovedMediaIds((prev) => [...prev, mediaId]);
    setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
  }

  function addEmbed() {
    if (!embedUrl.trim()) return;
    const ytId = extractYouTubeId(embedUrl.trim());
    if (!ytId) {
      setError('URL no válida. Ingresa un link de YouTube.');
      return;
    }
    setPendingEmbeds((prev) => [...prev, embedUrl.trim()]);
    setEmbedUrl('');
    setError(null);
  }

  function removeEmbed(index: number) {
    setPendingEmbeds((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (!content.trim()) {
      setError('El contenido es obligatorio.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const payload = {
        title: title.trim(),
        content: content.trim(),
        is_pinned: isPinned,
        published_at: new Date().toISOString(),
        cover_image_url: null as string | null,
      };

      let announcementId: string;

      if (isEditing && announcement) {
        announcementId = announcement.id;

        // Delete removed media files from storage
        for (const mediaId of removedMediaIds) {
          const media = announcement.media?.find((m) => m.id === mediaId);
          if (media && media.storage_path) {
            await deleteAnnouncementFile(supabase, media.storage_path).catch(() => {});
          }
          await supabase.from('announcement_media').delete().eq('id', mediaId);
        }
      } else {
        // Insert announcement to get ID
        const { data: inserted, error: insertError } = await supabase
          .from('announcements')
          .insert(payload)
          .select('id')
          .single();
        if (insertError) throw insertError;
        announcementId = inserted.id;
      }

      // Upload new files
      let coverUrl: string | null = announcement?.cover_image_url ?? null;
      // Reset cover if the cover media was removed
      if (coverMediaId === null || removedMediaIds.includes(coverMediaId ?? '')) {
        coverUrl = null;
      }

      let order = existingMedia.length;
      for (const pending of pendingFiles) {
        const storagePath = await uploadAnnouncementFile(supabase, announcementId, pending.file);
        const mediaType = getMediaType(pending.file.type);
        const publicUrl = getPublicUrl(supabase, storagePath);

        await supabase.from('announcement_media').insert({
          announcement_id: announcementId,
          file_name: pending.file.name,
          file_type: pending.file.type,
          file_size: pending.file.size,
          storage_path: storagePath,
          media_type: mediaType,
          display_order: order++,
        });

        // Set first image as cover if none selected
        if (!coverUrl && mediaType === 'image') {
          coverUrl = publicUrl;
        }
        if (pending.isCover) {
          coverUrl = publicUrl;
        }
      }

      // Insert embeds
      for (const url of pendingEmbeds) {
        const ytId = extractYouTubeId(url);
        await supabase.from('announcement_media').insert({
          announcement_id: announcementId,
          file_name: `YouTube: ${ytId}`,
          file_type: 'video/youtube',
          file_size: 0,
          storage_path: '',
          media_type: 'embed',
          embed_url: url,
          display_order: order++,
        });
      }

      // Update announcement with cover
      payload.cover_image_url = coverUrl;
      const { error: updateError } = await supabase
        .from('announcements')
        .update(payload)
        .eq('id', announcementId);
      if (updateError) throw updateError;

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al guardar el anuncio.');
    } finally {
      setLoading(false);
    }
  }

  const mediaTypeIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="h-4 w-4" />;
    if (type === 'video' || type === 'embed') return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar anuncio' : 'Nuevo anuncio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del anuncio"
              required
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Contenido</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe el contenido del anuncio..."
              required
              className="min-h-[120px] text-base"
            />
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>Archivos adjuntos</Label>
            <div
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 transition-colors hover:border-muted-foreground/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click para subir imágenes, videos o documentos
              </p>
              <p className="text-xs text-muted-foreground/70">
                Imágenes (10MB), Videos (100MB), PDF/Docs (20MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALL_ALLOWED_TYPES.join(',')}
              onChange={handleFilesSelected}
              className="hidden"
            />
          </div>

          {/* Existing media (edit mode) */}
          {existingMedia.filter((m) => !removedMediaIds.includes(m.id)).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Archivos existentes</Label>
              <div className="grid grid-cols-2 gap-2">
                {existingMedia
                  .filter((m) => !removedMediaIds.includes(m.id))
                  .map((m) => (
                    <div
                      key={m.id}
                      className="group relative flex items-center gap-2 rounded-md border bg-muted/30 p-2"
                    >
                      {mediaTypeIcon(m.media_type)}
                      <span className="flex-1 truncate text-xs">{m.file_name}</span>
                      <button
                        type="button"
                        onClick={() => removeExistingMedia(m.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pending files preview */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Archivos nuevos</Label>
              <div className="grid grid-cols-2 gap-2">
                {pendingFiles.map((pf, i) => (
                  <div
                    key={i}
                    className="group relative overflow-hidden rounded-md border bg-muted/30"
                  >
                    {pf.preview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pf.preview}
                          alt={pf.file.name}
                          className="h-24 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPendingFiles((prev) =>
                              prev.map((f, idx) =>
                                idx === i ? { ...f, isCover: !f.isCover } : { ...f, isCover: false }
                              )
                            );
                          }}
                          className={`absolute bottom-1 left-1 rounded-full p-1 ${
                            pf.isCover ? 'bg-amber-400 text-white' : 'bg-black/40 text-white/70 hover:text-white'
                          }`}
                          title="Usar como portada"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-24 items-center justify-center">
                        {mediaTypeIcon(getMediaType(pf.file.type))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 p-1.5">
                      <span className="flex-1 truncate text-xs">{pf.file.name}</span>
                      <button
                        type="button"
                        onClick={() => removePendingFile(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Embed URL */}
          <div className="space-y-2">
            <Label>Video de YouTube (opcional)</Label>
            <div className="flex gap-2">
              <Input
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="h-10 flex-1"
              />
              <Button type="button" variant="outline" className="h-10" onClick={addEmbed}>
                <Link className="mr-1 h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Pending embeds */}
          {pendingEmbeds.length > 0 && (
            <div className="space-y-1">
              {pendingEmbeds.map((url, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                  <Video className="h-4 w-4 text-red-500" />
                  <span className="flex-1 truncate text-xs">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeEmbed(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Existing embeds (edit mode) */}
          {existingMedia
            .filter((m) => m.media_type === 'embed' && !removedMediaIds.includes(m.id))
            .map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                <Video className="h-4 w-4 text-red-500" />
                <span className="flex-1 truncate text-xs">{m.embed_url}</span>
                <button
                  type="button"
                  onClick={() => removeExistingMedia(m.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

          <div className="flex items-center gap-3">
            <Switch
              id="pinned"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
            <Label htmlFor="pinned" className="cursor-pointer">
              Fijar anuncio (aparece primero)
            </Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Publicar anuncio'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
