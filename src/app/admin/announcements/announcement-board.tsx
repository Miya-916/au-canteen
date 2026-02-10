"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Announcement = {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  publish_time?: string;
  is_sticky?: boolean;
  category?: string;
  visibility?: string;
  created_at: string;
};

export default function AnnouncementBoard({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  // 初始表单状态
  const initialForm = {
    title: "",
    content: "",
    is_published: false,
    publish_time: new Date().toISOString().slice(0, 16), // 默认当前时间
    is_sticky: false,
    category: "Canteen Notice", // 默认分类
    visibility: "both", // 默认可见范围
  };
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 必填校验：标题不能为空
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }
    
    // 标题长度校验
    if (formData.title.length > 100) {
      alert("Title must be less than 100 characters");
      return;
    }

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
    setFormData(initialForm);
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
      publish_time: announcement.publish_time 
        ? new Date(announcement.publish_time).toISOString().slice(0, 16) 
        : new Date().toISOString().slice(0, 16),
      is_sticky: announcement.is_sticky || false,
      category: announcement.category || "Canteen Notice",
      visibility: announcement.visibility || "both",
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
            setFormData(initialForm);
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
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Enter title (max 100 chars)"
              />
            </div>

            {/* Content Field */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Content</label>
              <textarea
                required
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Enter announcement content..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Field */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="Canteen Notice">Canteen Notice</option>
                  <option value="Menu Update">Menu Update</option>
                </select>
              </div>

              {/* Publish Time Field */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Publish Time</label>
                <input
                  type="datetime-local"
                  value={formData.publish_time}
                  onChange={(e) => setFormData({ ...formData, publish_time: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>

            {/* Visibility Field (Radio Group) */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Visibility</label>
              <div className="flex flex-col sm:flex-row gap-4">
                {[
                  { value: "owners", label: "Shop Owners Only" },
                  { value: "users", label: "Users Only" },
                  { value: "both", label: "Both (Owners & Users)" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${
                      formData.visibility === option.value
                        ? "border-indigo-600 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={formData.visibility === option.value}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                      className="h-4 w-4 border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`text-sm ${
                      formData.visibility === option.value
                        ? "font-medium text-indigo-900 dark:text-indigo-100"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
               {/* Is Sticky Checkbox */}
               <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_sticky"
                  checked={formData.is_sticky}
                  onChange={(e) => setFormData({ ...formData, is_sticky: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_sticky" className="text-sm text-zinc-700 dark:text-zinc-300">
                  Sticky / Pinned
                </label>
              </div>

              {/* Is Published Checkbox */}
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
            <div className="col-span-3">Title</div>
            <div className="col-span-2">Content</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Visibility</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {announcements.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">No announcements found.</div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
                  <div className="col-span-3 text-sm font-medium truncate" title={a.title}>
                    {a.is_sticky && <span className="mr-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Pinned</span>}
                    {a.title}
                  </div>
                  <div className="col-span-2 text-sm text-zinc-600 dark:text-zinc-400 truncate" title={a.content}>
                    {a.content}
                  </div>
                  <div className="col-span-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {a.category || "-"}
                  </div>
                  <div className="col-span-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      a.visibility === 'owners' 
                        ? 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-400/20'
                        : a.visibility === 'users'
                        ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-400/20'
                        : 'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-900/20 dark:text-gray-400 dark:ring-gray-400/20'
                    }`}>
                      {a.visibility === 'owners' ? 'Owners Only' : a.visibility === 'users' ? 'Users Only' : 'Both'}
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
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
    </div>
  );
}
