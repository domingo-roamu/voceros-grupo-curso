'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface YearSelectorProps {
  currentYear: number;
  availableYears: number[];
}

export function YearSelector({ currentYear, availableYears }: YearSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sorted = [...availableYears].sort((a, b) => a - b);

  function navigate(year: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(year));
    router.push(`?${params.toString()}`);
  }

  if (sorted.length <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      {sorted.map((year) => (
        <Button
          key={year}
          variant={year === currentYear ? 'default' : 'outline'}
          size="sm"
          className={`h-8 min-w-[60px] text-xs ${year === currentYear ? '' : 'opacity-70'}`}
          onClick={() => navigate(year)}
        >
          {year}
        </Button>
      ))}
    </div>
  );
}
