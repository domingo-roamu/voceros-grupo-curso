import { SetPasswordForm } from '@/components/admin/set-password-form';

export const dynamic = 'force-dynamic';

export default function SetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-balance-light/30 px-4">
      <SetPasswordForm />
    </main>
  );
}
