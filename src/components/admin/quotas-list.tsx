'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { QuotaForm } from './quota-form';
import { formatCLP } from './finance-summary-cards';
import type { QuotaSummary } from '@/lib/supabase/queries';
import type { Student } from '@/types';

interface QuotasListProps {
  quotas: QuotaSummary[];
  students: Student[];
  year: number;
}

export function QuotasList({ quotas, students, year }: QuotasListProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} className="h-10 gap-2">
          <Plus className="h-4 w-4" />
          Nueva cuota
        </Button>
      </div>

      {quotas.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay cuotas en {year}. Crea la primera para empezar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {quotas.map((q) => (
            <Link key={q.id} href={`/admin/cuotas/${q.id}`} className="block">
              <Card className="shadow-card transition-shadow hover:shadow-card-hover">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold">{q.name}</h3>
                      {q.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{q.description}</p>
                      )}
                    </div>
                    <Badge
                      className={
                        q.kind === 'course'
                          ? 'border-0 bg-primary/10 text-primary'
                          : 'border-0 bg-balance/10 text-balance'
                      }
                    >
                      {q.kind === 'course' ? 'Curso' : 'Ad-hoc'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{q.participantsCount} alumno{q.participantsCount === 1 ? '' : 's'}</span>
                    </div>
                    <span>
                      {q.installments === 1 ? 'Pago único' : `${q.installments} parcialidades`}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {formatCLP(q.totalPaid)} / {formatCLP(Number(q.total_amount))}
                      </span>
                      <span className="font-semibold">{q.paidPct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-income transition-all"
                        style={{ width: `${q.paidPct}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <QuotaForm
        open={showForm}
        onOpenChange={setShowForm}
        year={year}
        students={students}
      />
    </>
  );
}
