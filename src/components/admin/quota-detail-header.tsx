'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { QuotaForm } from './quota-form';
import { formatCLP } from './finance-summary-cards';
import type { Quota, Student } from '@/types';

interface QuotaDetailHeaderProps {
  quota: Quota;
  students: Student[];
  initialParticipantIds: string[];
  hasPaidPayments: boolean;
}

export function QuotaDetailHeader({ quota, students, initialParticipantIds, hasPaidPayments }: QuotaDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{quota.name}</h2>
          <Badge
            className={
              quota.kind === 'course'
                ? 'border-0 bg-primary/10 text-primary'
                : 'border-0 bg-balance/10 text-balance'
            }
          >
            {quota.kind === 'course' ? 'Curso' : 'Ad-hoc'}
          </Badge>
        </div>
        {quota.description && (
          <p className="text-sm text-muted-foreground">{quota.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatCLP(Number(quota.total_amount))}</span>
          {' · '}
          {quota.installments === 1 ? 'Pago único' : `${quota.installments} parcialidades`}
          {' · '}
          Año {quota.year}
        </p>
      </div>

      <Button variant="outline" className="h-10 gap-2" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4" />
        Editar cuota
      </Button>

      <QuotaForm
        open={editOpen}
        onOpenChange={setEditOpen}
        year={quota.year}
        students={students}
        quota={quota}
        initialParticipantIds={initialParticipantIds}
        hasPaidPayments={hasPaidPayments}
      />
    </div>
  );
}
