'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Clock } from 'lucide-react';

interface FinanceSummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  carriedBalance?: number;
  totalPending?: number;
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export { formatCLP };

export function FinanceSummaryCards({
  totalIncome,
  totalExpense,
  balance,
  carriedBalance = 0,
  totalPending = 0,
}: FinanceSummaryCardsProps) {
  return (
    <div className={`grid gap-4 ${totalPending > 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
      <Card className="border-t-[3px] border-t-income bg-gradient-to-b from-income-light/50 to-card shadow-card transition-shadow hover:shadow-card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Ingresos
          </CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-income-light">
            <TrendingUp className="h-4 w-4 text-income" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-income">{formatCLP(totalIncome)}</p>
        </CardContent>
      </Card>
      <Card className="border-t-[3px] border-t-expense bg-gradient-to-b from-expense-light/50 to-card shadow-card transition-shadow hover:shadow-card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Egresos
          </CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-expense-light">
            <TrendingDown className="h-4 w-4 text-expense" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-expense">{formatCLP(totalExpense)}</p>
        </CardContent>
      </Card>
      <Card className="border-t-[3px] border-t-balance bg-gradient-to-b from-balance-light/50 to-card shadow-card transition-shadow hover:shadow-card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-balance-light">
            <Wallet className="h-4 w-4 text-balance" />
          </div>
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${balance >= 0 ? 'text-income' : 'text-expense'}`}
          >
            {formatCLP(balance)}
          </p>
          {carriedBalance !== 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Incluye {formatCLP(carriedBalance)} de períodos anteriores
            </p>
          )}
        </CardContent>
      </Card>
      {totalPending > 0 && (
        <Card className="border-t-[3px] border-t-amber-400 bg-gradient-to-b from-amber-50/50 to-card shadow-card transition-shadow hover:shadow-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por pagar</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{formatCLP(totalPending)}</p>
            <p className="mt-1 text-xs text-muted-foreground">En compromisos pendientes</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
