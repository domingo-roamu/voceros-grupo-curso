'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, type Transaction, type PartialCommitment } from '@/types';
import { formatCLP } from './finance-summary-cards';

const CUSTOM_CATEGORY_VALUE = '__custom__';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  year: number;
  pendingCommitments?: PartialCommitment[];
  prefillCommitmentId?: string;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  year,
  pendingCommitments = [],
  prefillCommitmentId,
}: TransactionFormProps) {
  const router = useRouter();
  const isEditing = !!transaction;

  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense');
  const [category, setCategory] = useState(transaction?.category ?? '');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '');
  const [paymentType, setPaymentType] = useState<'complete' | 'partial'>(prefillCommitmentId ? 'partial' : 'complete');
  const [partialMode, setPartialMode] = useState<'new' | 'existing'>(prefillCommitmentId ? 'existing' : 'new');
  const [totalInputMode, setTotalInputMode] = useState<'amount' | 'percentage'>('amount');
  const [totalCommitmentAmount, setTotalCommitmentAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [selectedCommitmentId, setSelectedCommitmentId] = useState(prefillCommitmentId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCommitment = pendingCommitments.find((c) => c.id === selectedCommitmentId);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Calculate total from percentage or vice versa
  const computedTotal = totalInputMode === 'percentage' && percentage && amount
    ? Math.round(Number(amount) * 100 / Number(percentage))
    : totalInputMode === 'amount' ? Number(totalCommitmentAmount) : 0;

  // Auto-detect matching existing commitment when user types category/description
  const effectiveCategoryForMatch = isCustom ? customCategory.trim().toUpperCase() : category;
  const matchingCommitment = paymentType === 'partial' && partialMode === 'new'
    ? pendingCommitments.find((c) =>
        c.category === effectiveCategoryForMatch &&
        c.description.toLowerCase().includes((description || effectiveCategoryForMatch).toLowerCase().replace(' (abono parcial)', ''))
      )
    : null;

  // Show suggestion banner when a match is found
  useEffect(() => {
    // Reset selected commitment when switching to new mode
    if (partialMode === 'new') {
      setSelectedCommitmentId('');
    }
  }, [partialMode]);

  function handleCategoryChange(value: string | null) {
    if (value === CUSTOM_CATEGORY_VALUE) {
      setIsCustom(true);
      setCategory('');
      setCustomCategory('');
    } else {
      setIsCustom(false);
      setCategory(value ?? '');
      setCustomCategory('');
    }
  }

  function getEffectiveCategory(): string {
    if (isCustom) return customCategory.trim().toUpperCase();
    return category;
  }

  function switchToExistingCommitment(commitmentId: string) {
    setPartialMode('existing');
    setSelectedCommitmentId(commitmentId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const effectiveCategory = getEffectiveCategory();
    if (!effectiveCategory) {
      setError('Ingresa o selecciona una categoría.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    // Validate partial payment fields
    if (paymentType === 'partial' && partialMode === 'new') {
      const totalForValidation = computedTotal;
      if (!totalForValidation || totalForValidation <= 0) {
        setError(totalInputMode === 'percentage'
          ? 'Ingresa un porcentaje válido.'
          : 'Ingresa el monto total del compromiso.');
        return;
      }
      if (Number(amount) >= totalForValidation) {
        setError('El abono debe ser menor al monto total. Usa "Completo" si pagas todo.');
        return;
      }
      if (totalInputMode === 'percentage' && (Number(percentage) <= 0 || Number(percentage) >= 100)) {
        setError('El porcentaje debe estar entre 1 y 99.');
        return;
      }
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const finalAmount = Number(amount);
      let commitmentId: string | null = null;

      // Handle partial payment commitment
      if (paymentType === 'partial') {
        if (partialMode === 'new') {
          const finalTotal = computedTotal;
          // Create new commitment
          const { data: newCommitment, error: commitError } = await supabase
            .from('partial_commitments')
            .insert({
              description: description || effectiveCategory,
              category: effectiveCategory,
              total_amount: finalTotal,
              paid_amount: finalAmount,
              year,
              is_completed: finalAmount >= finalTotal,
            })
            .select('id')
            .single();
          if (commitError) throw commitError;
          commitmentId = newCommitment.id;
        } else if (partialMode === 'existing' && selectedCommitmentId) {
          // Update existing commitment
          commitmentId = selectedCommitmentId;
          const commitment = selectedCommitment;
          if (commitment) {
            const newPaid = Number(commitment.paid_amount) + finalAmount;
            await supabase
              .from('partial_commitments')
              .update({
                paid_amount: newPaid,
                is_completed: newPaid >= Number(commitment.total_amount),
              })
              .eq('id', selectedCommitmentId);
          }
        }
      }

      const descParts: string[] = [];
      if (description) descParts.push(description);
      if (paymentType === 'partial') descParts.push('(abono parcial)');

      const payload = {
        date,
        type,
        category: effectiveCategory,
        description: descParts.join(' ') || null,
        amount: finalAmount,
        year,
        commitment_id: commitmentId,
      };

      if (isEditing && transaction) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', transaction.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('transactions').insert(payload);
        if (insertError) throw insertError;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al guardar el movimiento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                className="h-12"
                onClick={() => {
                  setType('income');
                  setCategory('');
                  setIsCustom(false);
                }}
              >
                Ingreso
              </Button>
              <Button
                type="button"
                variant={type === 'expense' ? 'default' : 'outline'}
                className="h-12"
                onClick={() => {
                  setType('expense');
                  setCategory('');
                  setIsCustom(false);
                }}
              >
                Egreso
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            {isCustom ? (
              <div className="flex gap-2">
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Nombre de la categoría"
                  className="h-12 flex-1 text-base"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={() => {
                    setIsCustom(false);
                    setCustomCategory('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Select
                value={category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_CATEGORY_VALUE}>
                    + Nueva categoría...
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle del movimiento"
              className="min-h-[60px] text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monto a pagar ($)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              className="h-12 text-base"
            />
          </div>

          {/* Partial/Complete payment */}
          <div className="space-y-2">
            <Label>Tipo de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentType === 'complete' ? 'default' : 'outline'}
                className="h-10 text-sm"
                onClick={() => setPaymentType('complete')}
              >
                Completo
              </Button>
              <Button
                type="button"
                variant={paymentType === 'partial' ? 'default' : 'outline'}
                className="h-10 text-sm"
                onClick={() => setPaymentType('partial')}
              >
                Parcial
              </Button>
            </div>
            {paymentType === 'partial' && (
              <div className="space-y-3 rounded-lg border border-balance/20 bg-balance-light/30 p-3">
                {/* New vs existing commitment */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={partialMode === 'new' ? 'default' : 'outline'}
                    className="h-9 text-xs"
                    onClick={() => {
                      setPartialMode('new');
                      setSelectedCommitmentId('');
                    }}
                  >
                    Nuevo compromiso
                  </Button>
                  <Button
                    type="button"
                    variant={partialMode === 'existing' ? 'default' : 'outline'}
                    className="h-9 text-xs"
                    onClick={() => setPartialMode('existing')}
                    disabled={pendingCommitments.length === 0}
                  >
                    Abonar a existente
                    {pendingCommitments.length > 0 && ` (${pendingCommitments.length})`}
                  </Button>
                </div>

                {partialMode === 'new' && (
                  <div className="space-y-3">
                    {/* Toggle: monto total vs porcentaje */}
                    <div className="space-y-2">
                      <Label className="text-sm">¿Cómo ingresar el total?</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={totalInputMode === 'amount' ? 'default' : 'outline'}
                          className="h-8 text-xs"
                          onClick={() => {
                            setTotalInputMode('amount');
                            setPercentage('');
                          }}
                        >
                          Monto total ($)
                        </Button>
                        <Button
                          type="button"
                          variant={totalInputMode === 'percentage' ? 'default' : 'outline'}
                          className="h-8 text-xs"
                          onClick={() => {
                            setTotalInputMode('percentage');
                            setTotalCommitmentAmount('');
                          }}
                        >
                          Porcentaje (%)
                        </Button>
                      </div>
                    </div>

                    {totalInputMode === 'amount' ? (
                      <div className="space-y-2">
                        <Label className="text-sm">Monto total del compromiso</Label>
                        <Input
                          type="number"
                          min="1"
                          value={totalCommitmentAmount}
                          onChange={(e) => setTotalCommitmentAmount(e.target.value)}
                          placeholder="Ej: 500000"
                          className="h-12 text-base"
                        />
                        {totalCommitmentAmount && amount && (
                          <p className="text-xs text-muted-foreground">
                            Abonando {formatCLP(Number(amount))} de {formatCLP(Number(totalCommitmentAmount))}
                            {' '}— quedarán {formatCLP(Number(totalCommitmentAmount) - Number(amount))} pendientes
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-sm">Este monto representa el (%)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          value={percentage}
                          onChange={(e) => setPercentage(e.target.value)}
                          placeholder="Ej: 30"
                          className="h-12 text-base"
                        />
                        {percentage && amount && Number(percentage) > 0 && Number(percentage) < 100 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-foreground">
                              Total calculado: {formatCLP(computedTotal)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Abonando {formatCLP(Number(amount))} ({percentage}%) — quedarán {formatCLP(computedTotal - Number(amount))} pendientes
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Auto-detect matching commitment */}
                    {matchingCommitment && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5">
                        <p className="text-xs font-medium text-amber-800">
                          Ya existe un compromiso similar:
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700">
                          {matchingCommitment.description} — pendiente: {formatCLP(Number(matchingCommitment.total_amount) - Number(matchingCommitment.paid_amount))}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 h-7 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
                          onClick={() => switchToExistingCommitment(matchingCommitment.id)}
                        >
                          Abonar a este compromiso
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {partialMode === 'existing' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Seleccionar compromiso</Label>
                    <Select
                      value={selectedCommitmentId}
                      onValueChange={(v) => setSelectedCommitmentId(v ?? '')}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingCommitments.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.description} — pendiente: {formatCLP(Number(c.total_amount) - Number(c.paid_amount))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCommitment && (
                      <p className="text-xs text-muted-foreground">
                        Total: {formatCLP(Number(selectedCommitment.total_amount))}
                        {' '}| Pagado: {formatCLP(Number(selectedCommitment.paid_amount))}
                        {' '}| Pendiente: {formatCLP(Number(selectedCommitment.total_amount) - Number(selectedCommitment.paid_amount))}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Agregar movimiento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
