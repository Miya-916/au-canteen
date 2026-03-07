"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [user, setUser] = useState({
    uid: "",
    name: "",
    email: "",
    role: "",
    image_url: "",
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Prevent default drag/drop behavior on window to avoid "jumping out"
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  useEffect(() => {
    // Add timestamp to prevent caching
    fetch(`/api/admin/profile?t=${Date.now()}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          console.error("Profile fetch error:", res.status, text);
          throw new Error(`Failed to load profile: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Profile data loaded:", data);
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Profile load catch:", err);
        setLoading(false);
        showToast("Error loading profile", "error");
      });
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      // Only set to false if leaving the main drop zone, not entering a child
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "user-profile");
    formData.append("uid", user.uid);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      // Add timestamp to prevent caching
      const url = `${data.url}?t=${Date.now()}`;
      setUser(prev => ({ ...prev, image_url: url }));
      showToast("Image uploaded successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to upload image", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const cleanUrl = user.image_url.split('?')[0];

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          image_url: cleanUrl,
        }),
      });

      if (res.ok) {
        showToast("Profile updated successfully!", "success");
        // Dispatch event to update layout
        window.dispatchEvent(new Event("user-profile-updated"));
        router.refresh();
      } else {
        showToast("Failed to update profile", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating profile", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading profile...</div>;
  }

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto sm:px-6 sm:py-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">My Profile</h2>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-white shadow-lg ${
          toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
        } animate-in slide-in-from-top-2`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                {user.image_url ? (
                  <img
                    src={user.image_url}
                    alt={user.name || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-indigo-600 font-bold text-3xl">
                    {(user.name || user.email || "A").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {user.name || "Admin User"}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Enter your name"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Profile Photo
                </label>
                <div 
                  className={`mt-1 flex justify-center rounded-lg border border-dashed px-6 py-10 transition-colors ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
                      : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    {uploading ? (
                      <div className="text-sm text-zinc-500">Uploading...</div>
                    ) : (
                      <>
                        <div className="mt-4 flex text-sm leading-6 text-zinc-600 dark:text-zinc-400 justify-center">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md bg-white dark:bg-zinc-900 font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                          >
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleChange} accept="image/*" />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-500">PNG, JPG, GIF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 shadow-sm cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={user.role}
                  readOnly
                  className="block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 shadow-sm cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900/50 capitalize"
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-8 pb-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? "Saving..." : "Update Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
