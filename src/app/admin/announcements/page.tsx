import AnnouncementBoard from "./announcement-board";
import { listAnnouncements } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const announcements = await listAnnouncements();

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <AnnouncementBoard announcements={announcements} />
    </div>
  );
}
