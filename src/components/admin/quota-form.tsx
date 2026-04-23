'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCLP } from './finance-summary-cards';
import type { Quota, Student } from '@/types';

interface QuotaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  students: Student[];
  quota?: Quota | null;
  initialParticipantIds?: string[];
  hasPaidPayments?: boolean;
}

export function QuotaForm({
  open,
  onOpenChange,
  year,
  students,
  quota,
  initialParticipantIds = [],
  hasPaidPayments = false,
}: QuotaFormProps) {
  const router = useRouter();
  const isEditing = !!quota;
  const locked = isEditing && hasPaidPayments;

  const [name, setName] = useState(quota?.name ?? '');
  const [description, setDescription] = useState(quota?.description ?? '');
  const [totalAmount, setTotalAmount] = useState(quota?.total_amount?.toString() ?? '');
  const [mode, setMode] = useState<'single' | 'plan'>(
    quota && quota.installments > 1 ? 'plan' : 'single'
  );
  const [installmentsInput, setInstallmentsInput] = useState(
    quota && quota.installments > 1 ? String(quota.installments) : '3'
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialParticipantIds));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installments = mode === 'single' ? 1 : Math.max(1, parseInt(installmentsInput, 10) || 1);
  const participantCount = selectedIds.size;
  const totalNum = Number(totalAmount) || 0;

  const { perStudent, perInstallment } = useMemo(() => {
    if (participantCount === 0 || totalNum === 0) return { perStudent: 0, perInstallment: 0 };
    const perS = Math.round(totalNum / participantCount);
    const perI = Math.round(perS / installments);
    return { perStudent: perS, perInstallment: perI };
  }, [participantCount, totalNum, installments]);

  function toggleStudent(id: string) {
    if (locked) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (locked) return;
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Ingresa un nombre para la cuota.');
      return;
    }
    if (totalNum <= 0) {
      setError('El monto total debe ser mayor a 0.');
      return;
    }
    if (participantCount === 0) {
      setError('Selecciona al menos un alumno.');
      return;
    }
    if (installments < 1) {
      setError('La cantidad de parcialidades debe ser al menos 1.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const participantIds = Array.from(selectedIds);

      if (isEditing && quota) {
        // Editar cuota: si tiene pagos, ya bloqueamos la UI. Solo actualizamos nombre/descr.
        const updatePayload: Partial<Quota> = { name: name.trim(), description: description.trim() || null };
        if (!locked) {
          updatePayload.total_amount = totalNum;
          updatePayload.installments = installments;
        }
        const { error: updateError } = await supabase
          .from('quotas')
          .update(updatePayload)
          .eq('id', quota.id);
        if (updateError) throw updateError;

        if (!locked) {
          // Rehacer participants + pagos vacíos
          await supabase.from('quota_participants').delete().eq('quota_id', quota.id);
          await supabase.from('quota_payments').delete().eq('quota_id', quota.id);

          await supabase.from('quota_participants').insert(
            participantIds.map((studentId) => ({
              quota_id: quota.id,
              student_id: studentId,
              amount_per_installment: perInstallment,
            }))
          );

          const payments = participantIds.flatMap((studentId) =>
            Array.from({ length: installments }, (_, i) => ({
              quota_id: quota.id,
              student_id: studentId,
              year: quota.year,
              installment_number: i + 1,
              amount: perInstallment,
              is_paid: false,
            }))
          );
          if (payments.length > 0) {
            await supabase.from('quota_payments').insert(payments);
          }
        }
      } else {
        const { data: newQuota, error: insertError } = await supabase
          .from('quotas')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            total_amount: totalNum,
            installments,
            year,
            kind: 'adhoc',
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        const newQuotaId = newQuota!.id as string;

        await supabase.from('quota_participants').insert(
          participantIds.map((studentId) => ({
            quota_id: newQuotaId,
            student_id: studentId,
            amount_per_installment: perInstallment,
          }))
        );

        const payments = participantIds.flatMap((studentId) =>
          Array.from({ length: installments }, (_, i) => ({
            quota_id: newQuotaId,
            student_id: studentId,
            year,
            installment_number: i + 1,
            amount: perInstallment,
            is_paid: false,
          }))
        );
        if (payments.length > 0) {
          await supabase.from('quota_payments').insert(payments);
        }
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al guardar la cuota.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!quota) return;
    const confirmMsg = hasPaidPayments
      ? `Esta cuota tiene pagos registrados. ¿Eliminar "${quota.name}" y todos sus pagos?`
      : `¿Eliminar la cuota "${quota.name}"?`;
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from('quotas').delete().eq('id', quota.id);
      if (deleteError) throw deleteError;
      onOpenChange(false);
      router.push('/admin/cuotas');
      router.refresh();
    } catch {
      setError('Error al eliminar la cuota.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cuota' : 'Nueva cuota'}</DialogTitle>
        </DialogHeader>

        {locked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Esta cuota tiene pagos registrados. Solo se puede editar el nombre y la descripción.
            Para cambiar monto o participantes, crea una cuota nueva.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Paseo Maipú, Libro de inglés"
              required
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles del gasto asociado"
              className="min-h-[60px] text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total">Monto total ($)</Label>
            <Input
              id="total"
              type="number"
              min="1"
              step="1"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              disabled={locked}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === 'single' ? 'default' : 'outline'}
                className="h-10 text-sm"
                onClick={() => setMode('single')}
                disabled={locked}
              >
                Pago único
              </Button>
              <Button
                type="button"
                variant={mode === 'plan' ? 'default' : 'outline'}
                className="h-10 text-sm"
                onClick={() => setMode('plan')}
                disabled={locked}
              >
                Parcialidades
              </Button>
            </div>
            {mode === 'plan' && (
              <div className="space-y-1">
                <Label htmlFor="installments" className="text-xs text-muted-foreground">
                  Número de parcialidades
                </Label>
                <Input
                  id="installments"
                  type="number"
                  min="2"
                  max="12"
                  value={installmentsInput}
                  onChange={(e) => setInstallmentsInput(e.target.value)}
                  disabled={locked}
                  className="h-10"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Alumnos participantes</Label>
              <button
                type="button"
                onClick={toggleAll}
                disabled={locked}
                className="text-xs text-primary hover:underline disabled:opacity-40"
              >
                {selectedIds.size === students.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border p-2">
              {students.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No hay alumnos registrados todavía.
                </p>
              )}
              {students.map((s) => {
                const checked = selectedIds.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted ${
                      locked ? 'opacity-60' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(s.id)}
                      disabled={locked}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span>{s.full_name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {participantCount > 0 && totalNum > 0 && (
            <div className="rounded-lg border border-balance/20 bg-balance-light/30 p-3 text-xs">
              <p className="font-medium">
                {formatCLP(totalNum)} ÷ {participantCount} alumno{participantCount > 1 ? 's' : ''}
                {installments > 1 ? ` ÷ ${installments} parcialidades` : ''}
                {' = '}
                <span className="text-balance">{formatCLP(perInstallment)}</span>
                {installments > 1 ? ' por pago' : ' por alumno'}
              </p>
              {installments > 1 && (
                <p className="mt-1 text-muted-foreground">
                  Total por alumno: {formatCLP(perStudent)}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" className="h-12 flex-1 text-base" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cuota'}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                className="h-12"
                onClick={handleDelete}
                disabled={loading}
              >
                Eliminar
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
