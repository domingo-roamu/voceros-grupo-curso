import { createClient } from './server';
import type { Transaction, Announcement, AnnouncementMedia, AppSettings, Student, QuotaPayment, PartialCommitment } from '@/types';

export async function getTransactions(year: number): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('year', year)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Transaction[]) ?? [];
}

export async function getAvailableYears(): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('year')
    .order('year', { ascending: false });

  if (error) throw new Error(error.message);

  const years = Array.from(new Set((data ?? []).map((d: { year: number }) => d.year)));
  if (years.length === 0) {
    years.push(new Date().getFullYear());
  }
  return years;
}

export async function getFinancialSummary(year: number) {
  const supabase = await createClient();

  // Current year transactions
  const transactions = await getTransactions(year);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Carried balance from ALL previous years
  const { data: prevData } = await supabase
    .from('transactions')
    .select('type, amount')
    .lt('year', year);

  const prevIncome = (prevData ?? [])
    .filter((t: { type: string }) => t.type === 'income')
    .reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0);

  const prevExpense = (prevData ?? [])
    .filter((t: { type: string }) => t.type === 'expense')
    .reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0);

  const carriedBalance = prevIncome - prevExpense;

  return {
    totalIncome,
    totalExpense,
    balance: carriedBalance + totalIncome - totalExpense,
    carriedBalance,
  };
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('*, announcement_media(*)')
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as (Announcement & { announcement_media: AnnouncementMedia[] })[]).map((a) => ({
    ...a,
    media: a.announcement_media ?? [],
    announcement_media: undefined,
  })) as Announcement[];
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('*, announcement_media(*)')
    .eq('id', id)
    .single();

  if (error) return null;

  const row = data as Announcement & { announcement_media: AnnouncementMedia[] };
  return {
    ...row,
    media: (row.announcement_media ?? []).sort((a, b) => a.display_order - b.display_order),
    announcement_media: undefined,
  } as Announcement;
}

export async function getAppSetting(key: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) return null;
  return (data as Pick<AppSettings, 'value'>)?.value ?? null;
}

export async function getActiveYear(): Promise<number> {
  const value = await getAppSetting('active_year');
  return value ? parseInt(value, 10) : new Date().getFullYear();
}

export async function getStudents(): Promise<Student[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('active', true)
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Student[]) ?? [];
}

export async function getQuotaPayments(year: number): Promise<QuotaPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quota_payments')
    .select('*')
    .eq('year', year)
    .order('quota_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as QuotaPayment[]) ?? [];
}

export interface StudentWithQuotas extends Student {
  quotas: QuotaPayment[];
  totalPaid: number;
  totalPending: number;
  plan: { total_quotas: number; amount_per_quota: number } | null;
  nextQuotaNumber: number | null;
}

export async function getStudentsWithQuotas(year: number): Promise<StudentWithQuotas[]> {
  const [students, payments] = await Promise.all([
    getStudents(),
    getQuotaPayments(year),
  ]);

  return students.map((student) => {
    const quotas = payments
      .filter((p) => p.student_id === student.id)
      .sort((a, b) => a.quota_number - b.quota_number);

    const plan = student.quota_plan?.[String(year)] ?? null;

    const totalPaid = quotas
      .filter((q) => q.is_paid)
      .reduce((sum, q) => sum + Number(q.amount ?? 0), 0);

    const totalPending = plan
      ? (plan.total_quotas * plan.amount_per_quota) - totalPaid
      : 0;

    const paidNumbers = quotas.filter((q) => q.is_paid).map((q) => q.quota_number);
    const nextQuotaNumber = plan
      ? Array.from({ length: plan.total_quotas }, (_, i) => i + 1).find((n) => !paidNumbers.includes(n)) ?? null
      : null;

    return { ...student, quotas, totalPaid, totalPending: Math.max(0, totalPending), plan, nextQuotaNumber };
  });
}

export async function getPendingCommitments(year: number): Promise<PartialCommitment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('partial_commitments')
    .select('*')
    .eq('year', year)
    .eq('is_completed', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as PartialCommitment[]) ?? [];
}

export async function getAllCommitments(year: number): Promise<PartialCommitment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('partial_commitments')
    .select('*')
    .eq('year', year)
    .order('is_completed', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as PartialCommitment[]) ?? [];
}

export async function getTotalPending(year: number): Promise<number> {
  const commitments = await getPendingCommitments(year);
  return commitments.reduce(
    (sum, c) => sum + (Number(c.total_amount) - Number(c.paid_amount)),
    0
  );
}
