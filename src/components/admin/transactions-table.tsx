'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { formatCLP } from './finance-summary-cards';
import { TransactionForm } from './transaction-form';
import type { Transaction } from '@/types';

interface TransactionsTableProps {
  transactions: Transaction[];
  year: number;
}

export function TransactionsTable({ transactions, year }: TransactionsTableProps) {
  const router = useRouter();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;

    setDeleting(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      router.refresh();
    } catch {
      alert('Error al eliminar el movimiento.');
    } finally {
      setDeleting(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No hay movimientos registrados para este período.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="space-y-3 sm:hidden">
        {transactions.map((t) => (
          <div key={t.id} className="rounded-xl bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t.date}</p>
                <Badge className={t.type === 'income' ? 'border-0 bg-income/10 text-income' : 'border-0 bg-expense/10 text-expense'}>
                  {t.type === 'income' ? 'Ingreso' : 'Egreso'}
                </Badge>
                <p className="text-sm font-medium">{t.category}</p>
                {t.description && (
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                )}
              </div>
              <p
                className={`text-lg font-bold ${t.type === 'income' ? 'text-income' : 'text-expense'}`}
              >
                {t.type === 'income' ? '+' : '-'}
                {formatCLP(Number(t.amount))}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => setEditingTransaction(t)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => handleDelete(t.id)}
                disabled={deleting === t.id}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {deleting === t.id ? '...' : 'Eliminar'}
              </Button>
            </div>
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
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {t.description ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.type === 'income' ? 'default' : 'destructive'}>
                      {t.type === 'income' ? 'Ingreso' : 'Egreso'}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatCLP(Number(t.amount))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTransaction(t)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {editingTransaction && (
        <TransactionForm
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          transaction={editingTransaction}
          year={year}
        />
      )}
    </>
  );
}
