'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, ChevronDown } from 'lucide-react';
import type { Announcement } from '@/types';

interface PublicAnnouncementsProps {
  announcements: Announcement[];
}

const INITIAL_LIMIT = 5;

export function PublicAnnouncements({ announcements }: PublicAnnouncementsProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? announcements : announcements.slice(0, INITIAL_LIMIT);
  const hasMore = announcements.length > INITIAL_LIMIT;

  if (announcements.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">Sin anuncios.</p>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((a) => (
        <Card key={a.id} className="shadow-card">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">{a.title}</p>
                  {a.is_pinned && (
                    <Badge className="gap-0.5 border-0 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                      <Pin className="h-2.5 w-2.5" />
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {a.published_at
                    ? new Date(a.published_at).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : ''}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {a.content}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {hasMore && !showAll && (
        <Button
          variant="ghost"
          className="w-full gap-1 text-xs text-muted-foreground"
          onClick={() => setShowAll(true)}
        >
          Ver más anuncios
          <ChevronDown className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
