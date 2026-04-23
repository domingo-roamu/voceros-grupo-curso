'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { QuotaPaymentDialog } from './quota-payment-dialog';
import { formatCLP } from './finance-summary-cards';
import type { QuotaDetail, QuotaParticipantWithStudent } from '@/lib/supabase/queries';
import type { QuotaPayment } from '@/types';

interface QuotasGridProps {
  detail: QuotaDetail;
}

interface Selected {
  studentId: string;
  studentName: string;
  installmentNumber: number;
  defaultAmount: number;
  existing: QuotaPayment | null;
}

export function QuotasGrid({ detail }: QuotasGridProps) {
  const { quota, participants, totalPaid, totalExpected } = detail;
  const [selected, setSelected] = useState<Selected | null>(null);

  function getPayment(p: QuotaParticipantWithStudent, num: number): QuotaPayment | undefined {
    return p.payments.find((pay) => pay.installment_number === num);
  }

  function handleClick(p: QuotaParticipantWithStudent, num: number) {
    setSelected({
      studentId: p.student_id,
      studentName: p.student.full_name,
      installmentNumber: num,
      defaultAmount: Number(p.amount_per_installment),
      existing: getPayment(p, num) ?? null,
    });
  }

  const paidPct = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
  const installments = Array.from({ length: quota.installments }, (_, i) => i + 1);

  return (
    <>
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Participantes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{participants.length}</p>
            <p className="text-xs text-muted-foreground">
              {quota.installments} {quota.installments === 1 ? 'pago único' : `parcialidades`}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recaudado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCLP(totalPaid)}</p>
            <p className="text-xs text-muted-foreground">de {formatCLP(totalExpected)} esperado</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Recaudación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{paidPct}%</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-income transition-all" style={{ width: `${paidPct}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {participants.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Esta cuota no tiene participantes todavía. Edítala para agregarlos.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-4 lg:hidden">
            {participants.map((p) => (
              <Card key={p.student_id} className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{p.student.full_name}</CardTitle>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>
                      {quota.installments === 1
                        ? formatCLP(Number(p.amount_per_installment))
                        : `${quota.installments} × ${formatCLP(Number(p.amount_per_installment))}`}
                    </span>
                    <span className="text-income">Pagado: {formatCLP(p.totalPaid)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {installments.map((num) => {
                      const payment = getPayment(p, num);
                      const isPaid = payment?.is_paid ?? false;
                      return (
                        <button
                          key={num}
                          onClick={() => handleClick(p, num)}
                          className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 text-sm font-medium transition-all ${
                            isPaid
                              ? 'border-income bg-income/10 text-income'
                              : 'border-muted bg-background text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          {isPaid ? <Check className="h-4 w-4" /> : num}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto rounded-xl border shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-medium">Alumno</th>
                    <th className="px-3 py-3 text-center font-medium">Monto</th>
                    {installments.map((num) => (
                      <th key={num} className="px-3 py-3 text-center font-medium">C{num}</th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium">Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.student_id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">{p.student.full_name}</td>
                      <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                        {formatCLP(Number(p.amount_per_installment))}
                      </td>
                      {installments.map((num) => {
                        const payment = getPayment(p, num);
                        const isPaid = payment?.is_paid ?? false;
                        return (
                          <td key={num} className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleClick(p, num)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                                isPaid
                                  ? 'bg-income/15 text-income hover:bg-income/25'
                                  : 'bg-muted text-muted-foreground hover:bg-expense/10 hover:text-expense'
                              }`}
                            >
                              {isPaid ? <Check className="h-4 w-4" /> : <X className="h-3 w-3" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <Badge
                          className={
                            p.totalPending === 0
                              ? 'border-0 bg-income/10 text-income'
                              : 'border-0 bg-expense/10 text-expense'
                          }
                        >
                          {formatCLP(p.totalPaid)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selected && (
        <QuotaPaymentDialog
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          studentName={selected.studentName}
          studentId={selected.studentId}
          quotaId={quota.id}
          installmentNumber={selected.installmentNumber}
          year={quota.year}
          defaultAmount={selected.defaultAmount}
          existing={selected.existing}
        />
      )}
    </>
  );
}
