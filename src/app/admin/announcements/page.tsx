import AnnouncementBoard from "./announcement-board";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const res = await fetch("http://localhost:3000/api/announcements", { cache: "no-store" });
  const announcements = res.ok ? await res.json() : [];

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <AnnouncementBoard announcements={announcements} />
    </div>
  );
}
