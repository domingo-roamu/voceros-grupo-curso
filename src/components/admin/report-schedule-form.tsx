'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ReportSchedule } from '@/types';

interface ReportScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ReportSchedule | null;
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function ReportScheduleForm({ open, onOpenChange, schedule }: ReportScheduleFormProps) {
  const router = useRouter();
  const isEditing = !!schedule;

  const [name, setName] = useState(schedule?.name ?? '');
  const [frequency, setFrequency] = useState(schedule?.frequency ?? 'manual');
  const [dayOfWeek, setDayOfWeek] = useState(String(schedule?.day_of_week ?? 1));
  const [dayOfMonth, setDayOfMonth] = useState(String(schedule?.day_of_month ?? 1));
  const [customDate, setCustomDate] = useState(schedule?.custom_date ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const payload = {
        name: name.trim(),
        frequency,
        day_of_week: frequency === 'weekly' ? parseInt(dayOfWeek, 10) : null,
        day_of_month: frequency === 'monthly' ? parseInt(dayOfMonth, 10) : null,
        custom_date: frequency === 'custom' ? customDate : null,
        is_active: true,
      };

      if (isEditing && schedule) {
        const { error: err } = await supabase
          .from('report_schedules')
          .update(payload)
          .eq('id', schedule.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('report_schedules').insert(payload);
        if (err) throw err;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al guardar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar programación' : 'Nueva programación'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Reporte mensual marzo"
              required
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label>Frecuencia</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v ?? 'manual')}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (solo enviar ahora)</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="custom">Fecha específica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>Día de la semana</Label>
              <Select value={dayOfWeek} onValueChange={(v) => setDayOfWeek(v ?? '1')}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, i) => (
                    <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === 'monthly' && (
            <div className="space-y-2">
              <Label>Día del mes</Label>
              <Select value={dayOfMonth} onValueChange={(v) => setDayOfMonth(v ?? '1')}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Día {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === 'custom' && (
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear programación'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
