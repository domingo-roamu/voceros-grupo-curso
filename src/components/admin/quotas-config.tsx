'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCLP } from './finance-summary-cards';

interface QuotasConfigProps {
  showPublic: boolean;
  annualAmount: number;
}

export function QuotasConfig({ showPublic, annualAmount }: QuotasConfigProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(showPublic);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [amountInput, setAmountInput] = useState(annualAmount.toString());

  async function handleToggle(checked: boolean) {
    setEnabled(checked);
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('app_settings')
        .update({ value: String(checked), updated_at: new Date().toISOString() })
        .eq('key', 'show_quotas_public');
      router.refresh();
    } catch {
      setEnabled(!checked);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAmount() {
    const val = parseInt(amountInput, 10);
    if (isNaN(val) || val < 1) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('app_settings')
        .upsert({ key: 'quota_annual_amount', value: String(val), updated_at: new Date().toISOString() }, { onConflict: 'key' });
      setEditOpen(false);
      router.refresh();
    } catch {
      alert('Error al guardar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <button
        onClick={() => setEditOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-card transition-colors hover:bg-accent"
      >
        <span className="text-sm font-medium">Cuota anual: {formatCLP(annualAmount)}</span>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card">
        {enabled ? (
          <Eye className="h-4 w-4 text-income" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Label htmlFor="show-public" className="cursor-pointer text-sm">
          {enabled ? 'Público' : 'Oculto'}
        </Label>
        <Switch
          id="show-public"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Cuota anual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto anual por alumno ($)</Label>
              <Input
                type="number"
                min="1"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">
                Este monto se divide según el plan de cuotas de cada alumno.
              </p>
            </div>
            <Button onClick={handleSaveAmount} className="h-12 w-full" disabled={loading}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
