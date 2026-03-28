export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string | null;
  amount: number;
  year: number;
  commitment_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PartialCommitment {
  id: string;
  description: string;
  category: string;
  total_amount: number;
  paid_amount: number;
  year: number;
  is_completed: boolean;
  created_by: string | null;
  created_at: string;
}

export interface QuotaPlan {
  total_quotas: number;
  amount_per_quota: number;
}

export interface Student {
  id: string;
  full_name: string;
  parent1_name: string | null;
  parent1_email: string | null;
  parent2_name: string | null;
  parent2_email: string | null;
  active: boolean;
  quota_plan: Record<string, QuotaPlan>;
}

export interface QuotaPayment {
  id: string;
  student_id: string;
  year: number;
  quota_number: number;
  amount: number | null;
  paid_at: string | null;
  is_paid: boolean;
  notes: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReportSchedule {
  id: string;
  name: string;
  frequency: 'manual' | 'weekly' | 'monthly' | 'custom';
  custom_date: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  last_sent_at: string | null;
  is_active: boolean;
  created_by: string | null;
}

export interface AppSettings {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense';

export const INCOME_CATEGORIES = ['CUOTAS', 'KERMESSE', 'OTRO INGRESO'] as const;

export const EXPENSE_CATEGORIES = [
  'PASEO DE CURSO',
  'DÍA DEL ALUMNO',
  'COLACIÓN COMPARTIDA',
  'CLASS MERIT',
  'CELEBRACIÓN 18',
  'DÍA DEL AUXILIAR',
  'DÍA DEL PROFESOR',
  'FIESTA GRADUACIÓN',
  'OBSEQUIO',
  'OTRO EGRESO',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
