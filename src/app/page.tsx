import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { TrendingUp, TrendingDown, Wallet, Clock, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseChart } from '@/components/public/expense-chart';
import { PublicTransactionsTable } from '@/components/public/public-transactions-table';
import { PublicAnnouncements } from '@/components/public/public-announcements';
import { PublicQuotas } from '@/components/public/public-quotas';
import { YearSelector } from '@/components/public/year-selector';
import { BankInfoButton } from '@/components/public/bank-info-button';
import type { Transaction, Announcement, AnnouncementMedia } from '@/types';

export const revalidate = 60;

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

async function getPublicData(yearParam?: number) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('key, value');

  const settings = (settingsData ?? []).reduce<Record<string, string>>((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  const defaultYear = parseInt(settings['active_year'] ?? String(new Date().getFullYear()), 10);
  const activeYear = yearParam ?? defaultYear;
  const courseName = settings['course_name'] ?? 'Grupo Curso - Novedades y Finanzas';
  const showQuotasPublic = settings['show_quotas_public'] === 'true';

  // Get available years from transactions
  const { data: yearsData } = await supabase
    .from('transactions')
    .select('year');
  const availableYears = Array.from(new Set((yearsData ?? []).map((d: { year: number }) => d.year))).sort((a, b) => a - b);
  if (!availableYears.includes(defaultYear)) availableYears.push(defaultYear);

  const [{ data: transactions }, { data: announcements }] = await Promise.all([
    supabase.from('transactions').select('*').eq('year', activeYear).order('date', { ascending: false }),
    supabase.from('announcements').select('*, announcement_media(*)').order('is_pinned', { ascending: false }).order('published_at', { ascending: false }),
  ]);

  const txs = (transactions as Transaction[]) ?? [];
  const totalIncome = txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  // Carried balance
  const { data: prevData } = await supabase.from('transactions').select('type, amount').lt('year', activeYear);
  const prevIncome = (prevData ?? []).filter((t: { type: string }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
  const prevExpense = (prevData ?? []).filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
  const carriedBalance = prevIncome - prevExpense;

  // Pending commitments
  const { data: commitmentsData } = await supabase
    .from('partial_commitments')
    .select('total_amount, paid_amount')
    .eq('year', activeYear)
    .eq('is_completed', false);
  const totalPending = (commitmentsData ?? []).reduce(
    (s: number, c: { total_amount: number; paid_amount: number }) => s + (Number(c.total_amount) - Number(c.paid_amount)),
    0
  );

  // Quota data: curso del año activo
  let quotaStudents: { full_name: string; quotas: { installment_number: number; is_paid: boolean }[] }[] = [];
  let quotaInstallments = 0;
  if (showQuotasPublic) {
    const { data: courseQuotaData } = await supabase
      .from('quotas')
      .select('id, installments')
      .eq('year', activeYear)
      .eq('kind', 'course')
      .eq('is_active', true)
      .maybeSingle();

    if (courseQuotaData) {
      quotaInstallments = courseQuotaData.installments as number;
      const quotaId = courseQuotaData.id as string;

      const [{ data: participantsData }, { data: paymentsData }] = await Promise.all([
        supabase
          .from('quota_participants')
          .select('student_id, student:students(id, full_name, active)')
          .eq('quota_id', quotaId),
        supabase
          .from('quota_payments')
          .select('student_id, installment_number, is_paid')
          .eq('quota_id', quotaId),
      ]);

      const rawParticipants = (participantsData ?? []) as unknown as {
        student_id: string;
        student: { id: string; full_name: string; active: boolean } | null;
      }[];
      const participants = rawParticipants
        .filter((p) => p.student?.active)
        .sort((a, b) => (a.student?.full_name ?? '').localeCompare(b.student?.full_name ?? ''));

      quotaStudents = participants.map((p) => ({
        full_name: p.student!.full_name,
        quotas: ((paymentsData ?? []) as { student_id: string; installment_number: number; is_paid: boolean }[])
          .filter((pay) => pay.student_id === p.student_id),
      }));
    }
  }

  return {
    courseName,
    activeYear,
    defaultYear,
    availableYears,
    transactions: txs,
    announcements: ((announcements ?? []) as (Announcement & { announcement_media: AnnouncementMedia[] })[]).map((a) => ({
      ...a,
      media: a.announcement_media ?? [],
      announcement_media: undefined,
    })) as Announcement[],
    totalIncome,
    totalExpense,
    balance: carriedBalance + totalIncome - totalExpense,
    carriedBalance,
    totalPending,
    showQuotasPublic,
    quotaStudents,
    quotaInstallments,
    bankInfo: (settings['bank_holder'] && settings['bank_holder'] !== '-' && settings['bank_holder'].trim() !== '') ? {
      holder: settings['bank_holder'],
      rut: settings['bank_rut'] ?? '',
      bank: settings['bank_name'] ?? '',
      accountType: settings['bank_account_type'] ?? '',
      accountNumber: settings['bank_account_number'] ?? '',
      email: settings['bank_email'] ?? '',
    } : null,
  };
}

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function PublicPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const yearParam = params.year ? parseInt(params.year, 10) : undefined;
  const data = await getPublicData(yearParam && !isNaN(yearParam) ? yearParam : undefined);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-6 shadow-sm sm:py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-3xl">{data.courseName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Período {data.activeYear}</p>
          </div>
          <div className="flex items-center gap-2">
            <BankInfoButton bankInfo={data.bankInfo} />
            <YearSelector currentYear={data.activeYear} availableYears={data.availableYears} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* 2-column layout on desktop */}
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">

          {/* MAIN COLUMN */}
          <main className="space-y-6">
            {/* Summary cards — 2×2 mobile, 4 cols desktop */}
            <section>
              <div className={`grid gap-3 grid-cols-2 ${data.totalPending > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                <Card className="border-t-[3px] border-t-income bg-gradient-to-b from-income-light/50 to-card shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Ingresos</CardTitle>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-income-light">
                      <TrendingUp className="h-3.5 w-3.5 text-income" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xl font-bold text-income sm:text-2xl">{formatCLP(data.totalIncome)}</p>
                  </CardContent>
                </Card>

                <Card className="border-t-[3px] border-t-expense bg-gradient-to-b from-expense-light/50 to-card shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Egresos</CardTitle>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-expense-light">
                      <TrendingDown className="h-3.5 w-3.5 text-expense" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xl font-bold text-expense sm:text-2xl">{formatCLP(data.totalExpense)}</p>
                  </CardContent>
                </Card>

                <Card className="border-t-[3px] border-t-balance bg-gradient-to-b from-balance-light/50 to-card shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Saldo</CardTitle>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-balance-light">
                      <Wallet className="h-3.5 w-3.5 text-balance" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className={`text-xl font-bold sm:text-2xl ${data.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                      {formatCLP(data.balance)}
                    </p>
                    {data.carriedBalance !== 0 && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Incluye {formatCLP(data.carriedBalance)} anterior
                      </p>
                    )}
                  </CardContent>
                </Card>

                {data.totalPending > 0 && (
                  <Card className="border-t-[3px] border-t-amber-400 bg-gradient-to-b from-amber-50/50 to-card shadow-card">
                    <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Por pagar</CardTitle>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xl font-bold text-amber-600 sm:text-2xl">{formatCLP(data.totalPending)}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            {/* Expense donut chart */}
            <section>
              <h2 className="mb-3 text-base font-semibold tracking-tight">Distribución de egresos</h2>
              <Card className="shadow-card">
                <CardContent className="p-4 sm:p-6">
                  <ExpenseChart transactions={data.transactions} />
                </CardContent>
              </Card>
            </section>

            {/* Transactions */}
            <section>
              <h2 className="mb-3 text-base font-semibold">Movimientos recientes</h2>
              <PublicTransactionsTable transactions={data.transactions} />
            </section>

            {/* Quotas (conditional) */}
            {data.showQuotasPublic && data.quotaStudents.length > 0 && (
              <section>
                <h2 className="mb-3 text-base font-semibold">Estado de cuotas</h2>
                <PublicQuotas students={data.quotaStudents} totalQuotas={data.quotaInstallments} />
              </section>
            )}

            {/* Announcements — only visible on mobile (hidden on lg, shown in sidebar) */}
            <section className="lg:hidden">
              <h2 className="mb-3 text-base font-semibold">Anuncios</h2>
              <PublicAnnouncements announcements={data.announcements} />
            </section>
          </main>

          {/* SIDEBAR — desktop only, sticky */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Anuncios</h2>
              </div>
              <PublicAnnouncements announcements={data.announcements} />
            </div>
          </aside>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Solo lectura &middot; {data.courseName}
        </p>
      </footer>
    </div>
  );
}
