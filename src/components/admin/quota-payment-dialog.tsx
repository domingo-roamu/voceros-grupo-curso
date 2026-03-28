'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { QuotaPayment } from '@/types';

interface QuotaPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentId: string;
  quotaNumber: number;
  year: number;
  existing?: QuotaPayment | null;
}

export function QuotaPaymentDialog({
  open,
  onOpenChange,
  studentName,
  studentId,
  quotaNumber,
  year,
  existing,
}: QuotaPaymentDialogProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '10000');
  const [paidAt, setPaidAt] = useState(
    existing?.paid_at ?? new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const payload = {
        student_id: studentId,
        year,
        quota_number: quotaNumber,
        amount: Number(amount),
        paid_at: paidAt,
        is_paid: true,
        notes: notes || null,
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('quota_payments')
          .update(payload)
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('quota_payments')
          .upsert(payload, { onConflict: 'student_id,year,quota_number' });
        if (insertError) throw insertError;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al registrar el pago.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkUnpaid() {
    if (!existing) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('quota_payments')
        .update({ is_paid: false, paid_at: null, amount: null })
        .eq('id', existing.id);
      if (updateError) throw updateError;
      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al actualizar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Cuota {quotaNumber} — {studentName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto ($)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid_at">Fecha de pago</Label>
            <Input
              id="paid_at"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: transferencia, efectivo..."
              className="min-h-[60px] text-base"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="h-12 flex-1 text-base" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar pago'}
            </Button>
            {existing?.is_paid && (
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={handleMarkUnpaid}
                disabled={loading}
              >
                Desmarcar
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
