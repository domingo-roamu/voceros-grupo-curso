import { createClient } from '@/lib/supabase/server';
import { getStudents } from '@/lib/supabase/queries';
import { ReportsList } from '@/components/admin/reports-list';
import type { ReportSchedule } from '@/types';

export default async function ReportesPage() {
  const supabase = await createClient();

  const { data: schedules } = await supabase
    .from('report_schedules')
    .select('*')
    .order('created_at', { ascending: false });

  const students = await getStudents();
  const emailSet = new Set<string>();
  for (const s of students) {
    if (s.parent1_email) emailSet.add(s.parent1_email);
    if (s.parent2_email) emailSet.add(s.parent2_email);
  }

  const resendConfigured = !!process.env.RESEND_API_KEY;

  return (
    <ReportsList
      schedules={(schedules as ReportSchedule[]) ?? []}
      totalEmails={emailSet.size}
      resendConfigured={resendConfigured}
    />
  );
}
