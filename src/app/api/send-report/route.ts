import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildReportHTML } from '@/lib/email/report-template';
import type { Transaction, Announcement } from '@/types';

export async function POST(request: Request) {
  try {
    const { scheduleId } = await request.json();
    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId requerido' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY no configurada. Agrega la variable en .env.local' },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Get schedule
    const { data: schedule, error: schedError } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (schedError || !schedule) {
      return NextResponse.json({ error: 'Programación no encontrada' }, { status: 404 });
    }

    // Get active year
    const { data: yearSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'active_year')
      .single();
    const activeYear = parseInt(yearSetting?.value ?? String(new Date().getFullYear()), 10);

    const { data: nameSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'course_name')
      .single();
    const courseName = nameSetting?.value ?? 'Grupo Curso - Novedades y Finanzas';

    // Get financial data
    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('year', activeYear);

    const txs = (transactions ?? []) as Pick<Transaction, 'type' | 'amount'>[];
    const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    // Carried balance
    const { data: prevTx } = await supabase
      .from('transactions')
      .select('type, amount')
      .lt('year', activeYear);
    const prevIncome = (prevTx ?? []).filter((t: { type: string }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
    const prevExpense = (prevTx ?? []).filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);

    // Get announcements
    const { data: announcements } = await supabase
      .from('announcements')
      .select('title, content')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(3);

    // Get email list
    const { data: students } = await supabase
      .from('students')
      .select('parent1_email, parent2_email')
      .eq('active', true);

    const emails = new Set<string>();
    for (const s of students ?? []) {
      if (s.parent1_email) emails.add(s.parent1_email);
      if (s.parent2_email) emails.add(s.parent2_email);
    }

    if (emails.size === 0) {
      return NextResponse.json({ error: 'No hay destinatarios.' }, { status: 400 });
    }

    const publicUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tesoreria-7d.vercel.app';
    const balance = (prevIncome - prevExpense) + totalIncome - totalExpense;

    const html = buildReportHTML({
      courseName,
      year: activeYear,
      totalIncome,
      totalExpense,
      balance,
      announcements: (announcements as Announcement[]) ?? [],
      publicUrl,
    });

    // Send via Resend batch API
    const emailList = Array.from(emails);
    const batchSize = 50;
    let totalSent = 0;

    for (let i = 0; i < emailList.length; i += batchSize) {
      const batch = emailList.slice(i, i + batchSize);

      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          batch.map((to) => ({
            from: fromEmail,
            to,
            subject: `${courseName} — Reporte Financiero ${activeYear}`,
            html,
          }))
        ),
      });

      if (res.ok) {
        totalSent += batch.length;
      }
    }

    // Update last_sent_at
    await supabase
      .from('report_schedules')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', scheduleId);

    return NextResponse.json({ sent: totalSent, total: emailList.length });
  } catch (err) {
    console.error('Send report error:', err);
    return NextResponse.json({ error: 'Error interno al enviar.' }, { status: 500 });
  }
}
