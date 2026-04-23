import { Suspense } from 'react';
import { getTransactions, getAvailableYears, getFinancialSummary, getPendingCommitments, getTotalPending } from '@/lib/supabase/queries';
import { FinanceSummaryCards } from '@/components/admin/finance-summary-cards';
import { TransactionsTable } from '@/components/admin/transactions-table';
import { FinanceFilters } from '@/components/admin/finance-filters';
import { AddTransactionButton } from '@/components/admin/add-transaction-button';
import { CommitmentsList } from '@/components/admin/commitments-list';
import { Skeleton } from '@/components/ui/skeleton';

interface FinanzasPageProps {
  searchParams: { year?: string; type?: string; category?: string };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default async function FinanzasPage({ searchParams }: FinanzasPageProps) {
  const years = await getAvailableYears();
  const selectedYear = searchParams.year ? parseInt(searchParams.year, 10) : years[0];
  const typeFilter = searchParams.type ?? 'all';
  const categoryFilter = searchParams.category ?? 'all';

  const [summary, allTransactions, pendingCommitments, totalPending] = await Promise.all([
    getFinancialSummary(selectedYear),
    getTransactions(selectedYear),
    getPendingCommitments(selectedYear),
    getTotalPending(selectedYear),
  ]);

  const filteredTransactions = allTransactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold">Finanzas</h2>
          <AddTransactionButton
            year={selectedYear}
            pendingCommitments={pendingCommitments}
          />
        </div>

        <FinanceSummaryCards
          totalIncome={summary.totalIncome}
          totalExpense={summary.totalExpense}
          balance={summary.balance}
          carriedBalance={summary.carriedBalance}
          totalPending={totalPending}
        />

        <FinanceFilters years={years} currentYear={selectedYear} />

        {pendingCommitments.length > 0 && (
          <CommitmentsList
            commitments={pendingCommitments}
            year={selectedYear}
          />
        )}

        <TransactionsTable
          transactions={filteredTransactions}
          year={selectedYear}
        />
      </div>
    </Suspense>
  );
}
