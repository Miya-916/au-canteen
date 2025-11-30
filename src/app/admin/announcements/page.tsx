import AnnouncementBoard from "./announcement-board";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const res = await fetch("http://localhost:3000/api/announcements", { cache: "no-store" });
  const announcements = res.ok ? await res.json() : [];

  return (
    <div className="px-8 py-6">
      <AnnouncementBoard announcements={announcements} />
    </div>
  );
}
