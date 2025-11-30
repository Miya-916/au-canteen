"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Announcement = {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
};

export default function AnnouncementBoard({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "", is_published: false });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/announcements/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setEditingId(null);
    } else {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setIsCreating(false);
    }
    setFormData({ title: "", content: "", is_published: false });
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const startEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_published: announcement.is_published,
    });
    setEditingId(announcement.id);
    setIsCreating(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Announcements</h2>
        <button
          onClick={() => {
            setIsCreating(!isCreating);
            setEditingId(null);
            setFormData({ title: "", content: "", is_published: false });
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {isCreating ? "Cancel" : "New Announcement"}
        </button>
      </div>

      {(isCreating || editingId) && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h3 className="mb-4 font-medium">{editingId ? "Edit Announcement" : "New Announcement"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Content</label>
              <textarea
                required
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is_published" className="text-sm text-zinc-700 dark:text-zinc-300">
                Publish immediately
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
                }}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
          <div className="col-span-3">Title</div>
          <div className="col-span-5">Content</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {announcements.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">No announcements found.</div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
                <div className="col-span-3 text-sm font-medium truncate" title={a.title}>
                  {a.title}
                </div>
                <div className="col-span-5 text-sm text-zinc-600 dark:text-zinc-400 truncate" title={a.content}>
                  {a.content}
                </div>
                <div className="col-span-2 text-center">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      a.is_published
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {a.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    onClick={() => startEdit(a)}
                    className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-sm text-rose-600 hover:text-rose-500 dark:text-rose-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
