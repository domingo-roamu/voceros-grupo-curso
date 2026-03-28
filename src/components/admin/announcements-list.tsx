'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Pin, Plus } from 'lucide-react';
import { AnnouncementForm } from './announcement-form';
import type { Announcement } from '@/types';

interface AnnouncementsListProps {
  announcements: Announcement[];
}

export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
  const router = useRouter();
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este anuncio?')) return;

    setDeleting(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      router.refresh();
    } catch {
      alert('Error al eliminar el anuncio.');
    } finally {
      setDeleting(null);
    }
  }

  async function togglePinned(id: string, currentPinned: boolean) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentPinned })
        .eq('id', id);
      if (error) throw error;
      router.refresh();
    } catch {
      alert('Error al actualizar el anuncio.');
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Anuncios</h2>
        <Button onClick={() => setShowForm(true)} className="h-12">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo anuncio
        </Button>
      </div>

      {announcements.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No hay anuncios publicados.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} className="shadow-card transition-shadow hover:shadow-card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    {a.is_pinned && (
                      <Badge className="gap-1 border-0 bg-amber-100 text-amber-700">
                        <Pin className="h-3 w-3" />
                        Fijado
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={a.is_pinned}
                      onCheckedChange={() => togglePinned(a.id, a.is_pinned)}
                      aria-label="Fijar anuncio"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.published_at
                    ? new Date(a.published_at).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : ''}
                </p>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{a.content}</p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => setEditingAnnouncement(a)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {deleting === a.id ? '...' : 'Eliminar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnnouncementForm
        open={showForm}
        onOpenChange={setShowForm}
      />

      {editingAnnouncement && (
        <AnnouncementForm
          open={!!editingAnnouncement}
          onOpenChange={(open) => !open && setEditingAnnouncement(null)}
          announcement={editingAnnouncement}
        />
      )}
    </>
  );
}
