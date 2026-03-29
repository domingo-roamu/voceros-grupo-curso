import { createClient } from '@/lib/supabase/server';
import { BankAccountForm } from '@/components/admin/bank-account-form';
import { GeneralSettingsForm } from '@/components/admin/general-settings-form';
import { InviteAdminForm } from '@/components/admin/invite-admin-form';

async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from('app_settings').select('key, value');
  return (data ?? []).reduce<Record<string, string>>((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
}

export default async function ConfiguracionPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Configuración</h2>

      <GeneralSettingsForm settings={settings} />
      <BankAccountForm settings={settings} />
      <InviteAdminForm />
    </div>
  );
}
