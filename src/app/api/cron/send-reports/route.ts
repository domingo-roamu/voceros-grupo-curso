import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();
    const todayStr = today.toISOString().split('T')[0];

    // Find schedules that should run today
    const { data: schedules } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('is_active', true);

    const toSend = (schedules ?? []).filter((s) => {
      if (s.frequency === 'weekly' && s.day_of_week === dayOfWeek) return true;
      if (s.frequency === 'monthly' && s.day_of_month === dayOfMonth) return true;
      if (s.frequency === 'custom' && s.custom_date === todayStr) return true;
      return false;
    });

    if (toSend.length === 0) {
      return NextResponse.json({ message: 'No schedules to send today', count: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const results = [];

    for (const schedule of toSend) {
      try {
        const res = await fetch(`${appUrl}/api/send-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduleId: schedule.id }),
        });
        const data = await res.json();
        results.push({ id: schedule.id, name: schedule.name, ...data });
      } catch (err) {
        results.push({ id: schedule.id, name: schedule.name, error: String(err) });
      }
    }

    return NextResponse.json({ sent: results.length, results });
  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
