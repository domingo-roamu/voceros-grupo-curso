'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Announcement } from '@/types';

interface AnnouncementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
}

export function AnnouncementForm({ open, onOpenChange, announcement }: AnnouncementFormProps) {
  const router = useRouter();
  const isEditing = !!announcement;

  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [isPinned, setIsPinned] = useState(announcement?.is_pinned ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      };

      if (isEditing && announcement) {
        const { error: updateError } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', announcement.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('announcements').insert(payload);
        if (insertError) throw insertError;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al guardar el anuncio.');
    } finally {
      setLoading(false);
    }
  }

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
            <Label htmlFor="content">Contenido (soporta markdown básico)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe el contenido del anuncio. Puedes usar **negrita**, *cursiva*, y - listas."
              required
              className="min-h-[160px] text-base"
            />
          </div>

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
