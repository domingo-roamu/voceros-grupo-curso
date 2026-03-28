'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import type { Transaction } from '@/types';

interface PublicTransactionsTableProps {
  transactions: Transaction[];
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

const INITIAL_LIMIT = 10;

export function PublicTransactionsTable({ transactions }: PublicTransactionsTableProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? transactions : transactions.slice(0, INITIAL_LIMIT);
  const hasMore = transactions.length > INITIAL_LIMIT;

  if (transactions.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground">
        No hay movimientos registrados.
      </p>
    );
  }

  return (
    <div>
      {/* Mobile: cards */}
      <div className="space-y-2 sm:hidden">
        {visible.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg bg-card p-3 shadow-card">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {t.type === 'income' ? '↑' : '↓'}
                </span>
                <span className="text-sm font-medium truncate">{t.category}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.date}</p>
            </div>
            <p className={`shrink-0 text-sm font-bold ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
              {t.type === 'income' ? '+' : '-'}{formatCLP(Number(t.amount))}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto rounded-xl border shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-xs">{t.date}</TableCell>
                  <TableCell className="text-sm">{t.category}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {t.description ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${t.type === 'income' ? 'border-0 bg-income/10 text-income' : 'border-0 bg-expense/10 text-expense'}`}>
                      {t.type === 'income' ? 'Ingreso' : 'Egreso'}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right text-sm font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCLP(Number(t.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Show more */}
      {hasMore && !showAll && (
        <div className="mt-3 text-center">
          <Button variant="ghost" className="gap-2 text-sm text-muted-foreground" onClick={() => setShowAll(true)}>
            Ver los {transactions.length} movimientos
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
