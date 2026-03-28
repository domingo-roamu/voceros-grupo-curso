'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';

interface FinanceFiltersProps {
  years: number[];
  currentYear: number;
}

const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function FinanceFilters({ years, currentYear }: FinanceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentType = searchParams.get('type') ?? 'all';
  const currentCategory = searchParams.get('category') ?? 'all';

  function updateParams(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card sm:flex-row sm:items-center">
      <Select
        value={currentYear.toString()}
        onValueChange={(v) => updateParams('year', v)}
      >
        <SelectTrigger className="h-12 w-full text-base sm:w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentType} onValueChange={(v) => updateParams('type', v)}>
        <SelectTrigger className="h-12 w-full text-base sm:w-[160px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="income">Ingresos</SelectItem>
          <SelectItem value="expense">Egresos</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentCategory} onValueChange={(v) => updateParams('category', v)}>
        <SelectTrigger className="h-12 w-full text-base sm:w-[220px]">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {allCategories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
