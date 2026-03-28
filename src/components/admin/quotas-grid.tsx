'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Plus, Pencil } from 'lucide-react';
import { QuotaPaymentDialog } from './quota-payment-dialog';
import { StudentForm } from './student-form';
import { formatCLP } from './finance-summary-cards';
import type { StudentWithQuotas } from '@/lib/supabase/queries';
import type { QuotaPayment, Student } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface QuotasGridProps {
  students: StudentWithQuotas[];
  year: number;
}

interface SelectedQuota {
  studentId: string;
  studentName: string;
  quotaNumber: number;
  existing: QuotaPayment | null;
}

interface PlanSetup {
  student: StudentWithQuotas;
  totalQuotas: string;
}

export function QuotasGrid({ students, year }: QuotasGridProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedQuota | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [planSetup, setPlanSetup] = useState<PlanSetup | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  function getQuota(student: StudentWithQuotas, num: number): QuotaPayment | undefined {
    return student.quotas.find((q) => q.quota_number === num);
  }

  function handleClick(student: StudentWithQuotas, num: number) {
    setSelected({
      studentId: student.id,
      studentName: student.full_name,
      quotaNumber: num,
      existing: getQuota(student, num) ?? null,
    });
  }

  async function handleSavePlan() {
    if (!planSetup) return;
    const totalQ = parseInt(planSetup.totalQuotas, 10);
    if (isNaN(totalQ) || totalQ < 1 || totalQ > 12) return;

    setSavingPlan(true);
    try {
      const supabase = createClient();
      // Get current student data for the plan
      const { data: studentData } = await supabase
        .from('students')
        .select('quota_plan')
        .eq('id', planSetup.student.id)
        .single();

      const currentPlan = (studentData?.quota_plan as Record<string, unknown>) ?? {};

      // Get annual amount from settings
      const { data: settingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'quota_annual_amount')
        .single();
      const annualAmount = parseInt(settingData?.value ?? '30000', 10);
      const perQuota = Math.round(annualAmount / totalQ);

      const updatedPlan = {
        ...currentPlan,
        [String(year)]: { total_quotas: totalQ, amount_per_quota: perQuota },
      };

      await supabase
        .from('students')
        .update({ quota_plan: updatedPlan })
        .eq('id', planSetup.student.id);

      // Create empty quota_payments if they don't exist
      for (let i = 1; i <= totalQ; i++) {
        await supabase.from('quota_payments').upsert(
          {
            student_id: planSetup.student.id,
            year,
            quota_number: i,
            amount: perQuota,
            is_paid: false,
          },
          { onConflict: 'student_id,year,quota_number' }
        );
      }

      setPlanSetup(null);
      router.refresh();
    } catch {
      alert('Error al guardar el plan.');
    } finally {
      setSavingPlan(false);
    }
  }

  // Summary calculations (per-student based)
  const studentsWithPlan = students.filter((s) => s.plan);
  const totalExpectedAmount = studentsWithPlan.reduce(
    (sum, s) => sum + (s.plan ? s.plan.total_quotas * s.plan.amount_per_quota : 0),
    0
  );
  const totalPaidAmount = students.reduce((sum, s) => sum + s.totalPaid, 0);
  const paidPct = totalExpectedAmount > 0 ? Math.round((totalPaidAmount / totalExpectedAmount) * 100) : 0;

  // Max quotas for desktop table header
  const maxQuotas = Math.max(1, ...students.map((s) => s.plan?.total_quotas ?? 0));

  return (
    <>
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground">
              {studentsWithPlan.length} con plan definido
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recaudado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCLP(totalPaidAmount)}</p>
            {totalExpectedAmount > 0 && (
              <p className="text-xs text-muted-foreground">de {formatCLP(totalExpectedAmount)} esperado</p>
            )}
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

      {/* Add student */}
      <div className="flex justify-end">
        <Button onClick={() => setShowStudentForm(true)} className="h-10 gap-2">
          <Plus className="h-4 w-4" />
          Agregar alumno
        </Button>
      </div>

      {/* Mobile: card view */}
      <div className="space-y-4 lg:hidden">
        {students.map((student) => (
          <Card key={student.id} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{student.full_name}</CardTitle>
                <button onClick={() => setEditingStudent(student)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              {student.plan ? (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{student.plan.total_quotas} cuota{student.plan.total_quotas > 1 ? 's' : ''} de {formatCLP(student.plan.amount_per_quota)}</span>
                  <span className="text-income">Pagado: {formatCLP(student.totalPaid)}</span>
                </div>
              ) : (
                <Badge className="border-0 bg-amber-100 text-amber-700 text-xs">Sin plan</Badge>
              )}
            </CardHeader>
            <CardContent>
              {student.plan ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: student.plan.total_quotas }, (_, i) => i + 1).map((num) => {
                    const quota = getQuota(student, num);
                    const isPaid = quota?.is_paid ?? false;
                    return (
                      <button
                        key={num}
                        onClick={() => handleClick(student, num)}
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
              ) : (
                <Button variant="outline" size="sm" onClick={() => setPlanSetup({ student, totalQuotas: '3' })}>
                  Definir plan de cuotas
                </Button>
              )}
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
                <th className="px-3 py-3 text-center font-medium">Plan</th>
                {Array.from({ length: maxQuotas }, (_, i) => (
                  <th key={i} className="px-3 py-3 text-center font-medium">C{i + 1}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Pagado</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{student.full_name}</span>
                      <button onClick={() => setEditingStudent(student)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {student.plan ? (
                      <button
                        onClick={() => setPlanSetup({ student, totalQuotas: String(student.plan!.total_quotas) })}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {student.plan.total_quotas}×{formatCLP(student.plan.amount_per_quota)}
                      </button>
                    ) : (
                      <button
                        onClick={() => setPlanSetup({ student, totalQuotas: '3' })}
                        className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200"
                      >
                        Definir
                      </button>
                    )}
                  </td>
                  {Array.from({ length: maxQuotas }, (_, i) => i + 1).map((num) => {
                    const inPlan = student.plan && num <= student.plan.total_quotas;
                    if (!inPlan) {
                      return <td key={num} className="px-3 py-3 text-center"><span className="text-muted-foreground/30">—</span></td>;
                    }
                    const quota = getQuota(student, num);
                    const isPaid = quota?.is_paid ?? false;
                    return (
                      <td key={num} className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleClick(student, num)}
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
                    <Badge className={student.totalPending === 0 && student.plan ? 'border-0 bg-income/10 text-income' : 'border-0 bg-expense/10 text-expense'}>
                      {formatCLP(student.totalPaid)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      {selected && (
        <QuotaPaymentDialog
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          studentName={selected.studentName}
          studentId={selected.studentId}
          quotaNumber={selected.quotaNumber}
          year={year}
          existing={selected.existing}
        />
      )}

      <StudentForm open={showStudentForm} onOpenChange={setShowStudentForm} year={year} totalQuotas={0} />

      {editingStudent && (
        <StudentForm
          open={!!editingStudent}
          onOpenChange={(open) => !open && setEditingStudent(null)}
          student={editingStudent}
          year={year}
          totalQuotas={0}
        />
      )}

      {/* Plan setup dialog */}
      {planSetup && (
        <Dialog open={!!planSetup} onOpenChange={(open) => !open && setPlanSetup(null)}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Plan de cuotas — {planSetup.student.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>¿En cuántas cuotas pagará?</Label>
                <Select value={planSetup.totalQuotas} onValueChange={(v) => setPlanSetup({ ...planSetup, totalQuotas: v ?? '3' })}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} cuota{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSavePlan} className="h-12 w-full" disabled={savingPlan}>
                {savingPlan ? 'Guardando...' : 'Guardar plan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
