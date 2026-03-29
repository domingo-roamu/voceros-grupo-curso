'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Landmark } from 'lucide-react';

interface BankAccountFormProps {
  settings: Record<string, string>;
}

const BANKS = [
  'Banco de Chile',
  'Banco Estado',
  'Banco Santander',
  'BCI',
  'Banco Itaú',
  'Scotiabank',
  'Banco Falabella',
  'Banco BICE',
  'Banco Security',
  'Banco Consorcio',
  'Banco Ripley',
  'Banco Internacional',
  'MACH',
  'Mercado Pago',
  'Tenpo',
  'Otro',
];

const ACCOUNT_TYPES = [
  'Cuenta Corriente',
  'Cuenta Vista',
  'Cuenta de Ahorro',
  'Cuenta RUT',
];

export function BankAccountForm({ settings }: BankAccountFormProps) {
  const router = useRouter();
  const [holder, setHolder] = useState(settings['bank_holder'] ?? '');
  const [rut, setRut] = useState(settings['bank_rut'] ?? '');
  const [bank, setBank] = useState(settings['bank_name'] ?? '');
  const [accountType, setAccountType] = useState(settings['bank_account_type'] ?? '');
  const [accountNumber, setAccountNumber] = useState(settings['bank_account_number'] ?? '');
  const [email, setEmail] = useState(settings['bank_email'] ?? '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSave() {
    setValidationError(null);

    if (!holder.trim()) {
      setValidationError('El nombre del titular es obligatorio.');
      return;
    }
    if (!rut.trim()) {
      setValidationError('El RUT es obligatorio.');
      return;
    }
    if (!bank) {
      setValidationError('Selecciona un banco.');
      return;
    }
    if (!accountType) {
      setValidationError('Selecciona el tipo de cuenta.');
      return;
    }
    if (!accountNumber.trim()) {
      setValidationError('El número de cuenta es obligatorio.');
      return;
    }

    setLoading(true);
    setSaved(false);
    try {
      const supabase = createClient();
      const entries = [
        { key: 'bank_holder', value: holder.trim() },
        { key: 'bank_rut', value: rut.trim() },
        { key: 'bank_name', value: bank },
        { key: 'bank_account_type', value: accountType },
        { key: 'bank_account_number', value: accountNumber.trim() },
        { key: 'bank_email', value: email.trim() || '' },
      ];
      for (const entry of entries) {
        const { error } = await supabase.from('app_settings').upsert(entry, { onConflict: 'key' });
        if (error) {
          console.error('Error saving', entry.key, error);
          throw error;
        }
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setValidationError('Error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4" />
          Datos bancarios para transferencias
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Estos datos se mostrarán a los apoderados en la página pública.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="holder">Nombre titular</Label>
            <Input
              id="holder"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Nombre completo"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rut">RUT</Label>
            <Input
              id="rut"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="12.345.678-9"
              className="h-12 text-base"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Select value={bank} onValueChange={(v) => setBank(v ?? '')}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Seleccionar banco" />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de cuenta</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v ?? '')}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Número de cuenta</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0012345678"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankEmail">Correo para comprobante</Label>
            <Input
              id="bankEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tesorero@email.com"
              className="h-12 text-base"
            />
          </div>
        </div>

        {validationError && <p className="text-sm text-destructive">{validationError}</p>}

        <Button onClick={handleSave} disabled={loading} className="h-12">
          {loading ? 'Guardando...' : saved ? '✓ ¡Datos guardados!' : 'Guardar datos bancarios'}
        </Button>
      </CardContent>
    </Card>
  );
}
