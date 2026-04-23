import { getQuotasWithSummary, getActiveYear, getAppSetting, getStudents } from '@/lib/supabase/queries';
import { QuotasList } from '@/components/admin/quotas-list';
import { QuotasConfig } from '@/components/admin/quotas-config';

export default async function CuotasPage() {
  const activeYear = await getActiveYear();
  const [quotas, students, showPublic] = await Promise.all([
    getQuotasWithSummary(activeYear),
    getStudents(),
    getAppSetting('show_quotas_public').then((v) => v === 'true'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Cuotas {activeYear}</h2>
          <p className="text-sm text-muted-foreground">
            Cuota de curso y cuotas ad-hoc del año
          </p>
        </div>
        <QuotasConfig showPublic={showPublic} />
      </div>

      <QuotasList quotas={quotas} students={students} year={activeYear} />
    </div>
  );
}
