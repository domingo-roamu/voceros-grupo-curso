import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

interface PublicQuotaStudent {
  full_name: string;
  quotas: { installment_number: number; is_paid: boolean }[];
}

interface PublicQuotasProps {
  students: PublicQuotaStudent[];
  totalQuotas: number;
}

export function PublicQuotas({ students, totalQuotas }: PublicQuotasProps) {
  if (students.length === 0 || totalQuotas === 0) return null;

  const quotaNumbers = Array.from({ length: totalQuotas }, (_, i) => i + 1);

  return (
    <div>
      {/* Mobile: cards */}
      <div className="space-y-3 sm:hidden">
        {students.map((student) => (
          <Card key={student.full_name} className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{student.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {quotaNumbers.map((num) => {
                  const quota = student.quotas.find((q) => q.installment_number === num);
                  const isPaid = quota?.is_paid ?? false;
                  return (
                    <div
                      key={num}
                      className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium ${
                        isPaid
                          ? 'bg-income/15 text-income'
                          : 'bg-expense/10 text-expense'
                      }`}
                      title={`Cuota ${num}: ${isPaid ? 'Pagada' : 'Pendiente'}`}
                    >
                      {isPaid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto rounded-xl border shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Alumno</th>
                {quotaNumbers.map((num) => (
                  <th key={num} className="px-2 py-3 text-center font-medium">
                    C{num}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.full_name} className="border-b">
                  <td className="px-4 py-2.5 font-medium">{student.full_name}</td>
                  {quotaNumbers.map((num) => {
                    const quota = student.quotas.find((q) => q.installment_number === num);
                    const isPaid = quota?.is_paid ?? false;
                    return (
                      <td key={num} className="px-2 py-2.5 text-center">
                        {isPaid ? (
                          <Check className="mx-auto h-4 w-4 text-income" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-expense" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
