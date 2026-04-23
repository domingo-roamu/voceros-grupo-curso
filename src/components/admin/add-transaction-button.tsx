'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TransactionForm } from './transaction-form';
import type { PartialCommitment } from '@/types';

interface AddTransactionButtonProps {
  year: number;
  pendingCommitments?: PartialCommitment[];
}

export function AddTransactionButton({ year, pendingCommitments = [] }: AddTransactionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop button */}
      <Button
        onClick={() => setOpen(true)}
        className="hidden h-12 shadow-sm transition-shadow hover:shadow-md sm:flex"
      >
        <Plus className="mr-2 h-4 w-4" />
        Agregar movimiento
      </Button>

      {/* Mobile FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-fab transition-all hover:shadow-fab-hover hover:scale-105 active:scale-95 sm:hidden lg:bottom-6"
        aria-label="Agregar movimiento"
      >
        <Plus className="h-6 w-6" />
      </button>

      <TransactionForm open={open} onOpenChange={setOpen} year={year} pendingCommitments={pendingCommitments} />
    </>
  );
}
