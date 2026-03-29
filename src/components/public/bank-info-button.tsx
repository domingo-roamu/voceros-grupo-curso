'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Landmark, Copy, Check } from 'lucide-react';

interface BankInfo {
  holder: string;
  rut: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  email: string;
}

interface BankInfoButtonProps {
  bankInfo: BankInfo | null;
}

export function BankInfoButton({ bankInfo }: BankInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!bankInfo || !bankInfo.holder) return null;

  function copyAll() {
    if (!bankInfo) return;
    const text = [
      `Nombre: ${bankInfo.holder}`,
      `RUT: ${bankInfo.rut}`,
      `Banco: ${bankInfo.bank}`,
      `Tipo: ${bankInfo.accountType}`,
      `N° Cuenta: ${bankInfo.accountNumber}`,
      bankInfo.email ? `Correo: ${bankInfo.email}` : '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const fields = [
    { label: 'Nombre', value: bankInfo.holder },
    { label: 'RUT', value: bankInfo.rut },
    { label: 'Banco', value: bankInfo.bank },
    { label: 'Tipo cuenta', value: bankInfo.accountType },
    { label: 'N° Cuenta', value: bankInfo.accountNumber },
    { label: 'Correo comprobante', value: bankInfo.email },
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Landmark className="h-4 w-4" />
        <span className="hidden sm:inline">Datos para transferencia</span>
        <span className="sm:hidden">Transferir</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Datos para transferencia
            </DialogTitle>
            <DialogDescription>
              Copia los datos para realizar la transferencia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {fields.map((f) =>
              f.value ? (
                <div key={f.label} className="rounded-lg border p-2.5">
                  <p className="text-[11px] text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium">{f.value}</p>
                </div>
              ) : null
            )}

            <Button onClick={copyAll} className="h-11 w-full gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar todos los datos
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
