import { getStudentsWithQuotas, getActiveYear, getAppSetting } from '@/lib/supabase/queries';
import { QuotasGrid } from '@/components/admin/quotas-grid';
import { QuotasConfig } from '@/components/admin/quotas-config';

export default async function CuotasPage() {
  const activeYear = await getActiveYear();
  const students = await getStudentsWithQuotas(activeYear);
  const showPublic = (await getAppSetting('show_quotas_public')) === 'true';
  const annualAmount = await getAppSetting('quota_annual_amount');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Cuotas {activeYear}</h2>
          <p className="text-sm text-muted-foreground">
            Seguimiento de pago de cuotas por alumno
          </p>
        </div>
        <QuotasConfig
          showPublic={showPublic}
          annualAmount={parseInt(annualAmount ?? '30000', 10)}
        />
      </div>

      <QuotasGrid students={students} year={activeYear} />
    </div>
  );
}
