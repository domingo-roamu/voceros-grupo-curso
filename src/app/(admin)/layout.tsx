import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/admin-header';
import { SidebarNav, BottomNav } from '@/components/admin/sidebar-nav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'course_name')
    .single();

  const courseName = settings?.value ?? 'Grupo Curso - Novedades y Finanzas';

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader courseName={courseName} userEmail={user.email ?? ''} />
      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden w-56 shrink-0 border-r bg-sidebar lg:block">
          <SidebarNav />
        </aside>
        {/* Main content */}
        <main className="flex-1 pb-20 lg:pb-6">
          <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
            {children}
          </div>
        </main>
      </div>
      {/* Bottom nav mobile */}
      <BottomNav />
    </div>
  );
}
