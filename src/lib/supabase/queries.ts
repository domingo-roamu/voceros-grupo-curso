import { createClient } from './server';
import type { Transaction, Announcement, AnnouncementMedia, AppSettings, Student, QuotaPayment, PartialCommitment, Quota, QuotaParticipant } from '@/types';

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

export async function getQuotaPayments(quotaId: string): Promise<QuotaPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quota_payments')
    .select('*')
    .eq('quota_id', quotaId)
    .order('installment_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as QuotaPayment[]) ?? [];
}

export async function getQuotas(year: number): Promise<Quota[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quotas')
    .select('*')
    .eq('year', year)
    .eq('is_active', true)
    .order('kind', { ascending: false }) // 'course' primero
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Quota[]) ?? [];
}

export interface QuotaSummary extends Quota {
  participantsCount: number;
  totalPaid: number;
  paidPct: number;
}

export async function getQuotasWithSummary(year: number): Promise<QuotaSummary[]> {
  const supabase = await createClient();
  const quotas = await getQuotas(year);
  if (quotas.length === 0) return [];

  const quotaIds = quotas.map((q) => q.id);

  const [{ data: participantsData }, { data: paymentsData }] = await Promise.all([
    supabase.from('quota_participants').select('quota_id, student_id').in('quota_id', quotaIds),
    supabase.from('quota_payments').select('quota_id, amount, is_paid').in('quota_id', quotaIds),
  ]);

  return quotas.map((q) => {
    const participantsCount = ((participantsData ?? []) as QuotaParticipant[])
      .filter((p) => p.quota_id === q.id).length;
    const totalPaid = ((paymentsData ?? []) as Pick<QuotaPayment, 'quota_id' | 'amount' | 'is_paid'>[])
      .filter((p) => p.quota_id === q.id && p.is_paid)
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const paidPct = q.total_amount > 0 ? Math.round((totalPaid / Number(q.total_amount)) * 100) : 0;
    return { ...q, participantsCount, totalPaid, paidPct };
  });
}

export interface QuotaParticipantWithStudent extends QuotaParticipant {
  student: Student;
  payments: QuotaPayment[];
  totalPaid: number;
  totalDue: number;
  totalPending: number;
  nextInstallment: number | null;
}

export interface QuotaDetail {
  quota: Quota;
  participants: QuotaParticipantWithStudent[];
  totalPaid: number;
  totalExpected: number;
}

export async function getQuotaDetail(quotaId: string): Promise<QuotaDetail | null> {
  const supabase = await createClient();

  const { data: quotaData, error: quotaError } = await supabase
    .from('quotas')
    .select('*')
    .eq('id', quotaId)
    .single();

  if (quotaError || !quotaData) return null;
  const quota = quotaData as Quota;

  const [{ data: participantsData }, { data: paymentsData }] = await Promise.all([
    supabase
      .from('quota_participants')
      .select('quota_id, student_id, amount_per_installment, student:students(*)')
      .eq('quota_id', quotaId),
    supabase
      .from('quota_payments')
      .select('*')
      .eq('quota_id', quotaId)
      .order('installment_number', { ascending: true }),
  ]);

  const payments = (paymentsData ?? []) as QuotaPayment[];

  const participants: QuotaParticipantWithStudent[] = ((participantsData ?? []) as unknown as (QuotaParticipant & { student: Student })[])
    .map((p) => {
      const studentPayments = payments.filter((pay) => pay.student_id === p.student_id);
      const totalPaid = studentPayments
        .filter((pay) => pay.is_paid)
        .reduce((sum, pay) => sum + Number(pay.amount ?? 0), 0);
      const totalDue = Number(p.amount_per_installment) * quota.installments;
      const paidNumbers = studentPayments.filter((pay) => pay.is_paid).map((pay) => pay.installment_number);
      const nextInstallment = Array.from({ length: quota.installments }, (_, i) => i + 1)
        .find((n) => !paidNumbers.includes(n)) ?? null;
      return {
        ...p,
        payments: studentPayments,
        totalPaid,
        totalDue,
        totalPending: Math.max(0, totalDue - totalPaid),
        nextInstallment,
      };
    })
    .sort((a, b) => a.student.full_name.localeCompare(b.student.full_name));

  const totalPaid = participants.reduce((sum, p) => sum + p.totalPaid, 0);
  const totalExpected = participants.reduce((sum, p) => sum + p.totalDue, 0);

  return { quota, participants, totalPaid, totalExpected };
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
