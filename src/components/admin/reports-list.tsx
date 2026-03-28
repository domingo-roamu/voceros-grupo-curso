'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Send, Pencil, Trash2, Loader2 } from 'lucide-react';
import { ReportScheduleForm } from './report-schedule-form';
import type { ReportSchedule } from '@/types';

const FREQ_LABELS: Record<string, string> = {
  manual: 'Manual',
  weekly: 'Semanal',
  monthly: 'Mensual',
  custom: 'Fecha específica',
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface ReportsListProps {
  schedules: ReportSchedule[];
  totalEmails: number;
  resendConfigured: boolean;
}

export function ReportsList({ schedules, totalEmails, resendConfigured }: ReportsListProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleToggleActive(schedule: ReportSchedule) {
    const supabase = createClient();
    await supabase
      .from('report_schedules')
      .update({ is_active: !schedule.is_active })
      .eq('id', schedule.id);
    router.refresh();
  }

  async function handleSendNow(scheduleId: string) {
    setSendingId(scheduleId);
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar');
      alert(`Reporte enviado a ${data.sent} destinatarios.`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al enviar el reporte.');
    } finally {
      setSendingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta programación?')) return;
    setDeleting(id);
    try {
      const supabase = createClient();
      await supabase.from('report_schedules').delete().eq('id', id);
      router.refresh();
    } catch {
      alert('Error al eliminar.');
    } finally {
      setDeleting(null);
    }
  }

  function formatScheduleInfo(s: ReportSchedule): string {
    if (s.frequency === 'weekly' && s.day_of_week !== null) return `Cada ${DAYS[s.day_of_week]}`;
    if (s.frequency === 'monthly' && s.day_of_month !== null) return `Día ${s.day_of_month} de cada mes`;
    if (s.frequency === 'custom' && s.custom_date) return `El ${s.custom_date}`;
    return 'Envío manual';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Reportes</h2>
          <p className="text-sm text-muted-foreground">
            Envíos masivos a {totalEmails} apoderados
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-10 gap-2">
          <Plus className="h-4 w-4" />
          Nueva programación
        </Button>
      </div>

      {!resendConfigured && (
        <Card className="border-amber-200 bg-amber-50 shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              <strong>Resend no configurado.</strong> Agrega RESEND_API_KEY en .env.local para habilitar el envío de correos.
              Las programaciones se pueden crear, pero no se enviarán hasta configurar Resend.
            </p>
          </CardContent>
        </Card>
      )}

      {schedules.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No hay programaciones de envío. Crea una para empezar.
        </p>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.name}</p>
                      <Badge className={s.is_active ? 'border-0 bg-income/10 text-income' : 'border-0 bg-muted text-muted-foreground'}>
                        {s.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge className="border-0 bg-balance/10 text-balance">
                        {FREQ_LABELS[s.frequency]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatScheduleInfo(s)}
                      {s.last_sent_at && (
                        <> · Último envío: {new Date(s.last_sent_at).toLocaleDateString('es-CL')}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={() => handleToggleActive(s)}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleSendNow(s.id)}
                      disabled={sendingId === s.id || !resendConfigured}
                    >
                      {sendingId === s.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Enviar ahora
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingSchedule(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReportScheduleForm open={showForm} onOpenChange={setShowForm} />
      {editingSchedule && (
        <ReportScheduleForm
          open={!!editingSchedule}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
          schedule={editingSchedule}
        />
      )}
    </div>
  );
}
