'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { formatCLP } from './finance-summary-cards';
import { TransactionForm } from './transaction-form';
import type { PartialCommitment, Student } from '@/types';

interface CommitmentsListProps {
  commitments: PartialCommitment[];
  year: number;
  students: Student[];
}

export function CommitmentsList({ commitments, year, students }: CommitmentsListProps) {
  const [abonarId, setAbonarId] = useState<string | null>(null);

  const pending = commitments.filter((c) => !c.is_completed);

  if (pending.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Compromisos pendientes</h3>
      {pending.map((c) => {
        const paid = Number(c.paid_amount);
        const total = Number(c.total_amount);
        const pendingAmount = total - paid;
        const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

        return (
          <Card key={c.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{c.description}</p>
                    <Badge className="border-0 bg-balance/10 text-balance text-xs">
                      {c.category}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Total: {formatCLP(total)}</span>
                    <span className="text-income">Pagado: {formatCLP(paid)}</span>
                    <span className="text-expense">Pendiente: {formatCLP(pendingAmount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-income transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{pct}%</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => setAbonarId(c.id)}
                >
                  <Plus className="h-3 w-3" />
                  Abonar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {abonarId && (
        <TransactionForm
          open={!!abonarId}
          onOpenChange={(open) => !open && setAbonarId(null)}
          year={year}
          students={students}
          pendingCommitments={pending}
          prefillCommitmentId={abonarId}
        />
      )}
    </div>
  );
}
