'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Transaction } from '@/types';

interface ExpenseChartProps {
  transactions: Transaction[];
}

const COLORS = [
  '#e05a5a', '#d97744', '#c9a030', '#3d8b6e', '#4a8fa8',
  '#5b6db5', '#7c5cbf', '#c76090', '#4fa5a0', '#7a8b5a',
];

function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(value);
}

export function ExpenseChart({ transactions }: ExpenseChartProps) {
  const expenses = transactions.filter((t) => t.type === 'expense');

  const grouped = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
    return acc;
  }, {});

  const data = Object.entries(grouped)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No hay egresos para mostrar.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      {/* Donut chart */}
      <div className="relative h-[220px] w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatCLP(Number(value)), 'Total']}
              contentStyle={{
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #e2e5ea',
                boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{formatCLP(grandTotal)}</p>
        </div>
      </div>

      {/* Category legend */}
      <div className="flex-1 space-y-2">
        {data.map((item, index) => {
          const pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
          return (
            <div key={item.category} className="flex items-center gap-3">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex flex-1 items-center justify-between gap-2">
                <span className="text-sm truncate">{item.category}</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-sm font-medium">{formatCLP(item.total)}</span>
                  <span className="w-10 text-xs text-muted-foreground">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
