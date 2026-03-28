import { getAnnouncements } from '@/lib/supabase/queries';
import { AnnouncementsList } from '@/components/admin/announcements-list';

export default async function AnunciosPage() {
  const announcements = await getAnnouncements();

  return <AnnouncementsList announcements={announcements} />;
}
