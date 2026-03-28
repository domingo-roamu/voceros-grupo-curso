import { LoginForm } from '@/components/admin/login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-balance-light/30 px-4">
      <LoginForm />
    </main>
  );
}
