"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [passData, setPassData] = useState({ old: "", new: "", confirm: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (passData.new !== passData.confirm) {
      setMessage("New passwords do not match.");
      return;
    }
    if (passData.new.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: passData.old, newPassword: passData.new }),
    });
    setLoading(false);

    if (res.ok) {
      setMessage("Password updated successfully.");
      setPassData({ old: "", new: "", confirm: "" });
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed to update password.");
    }
  };

  return (
    <div className="px-8 py-6">
      <h2 className="text-xl font-semibold mb-6">Settings</h2>
      
      <div className="max-w-md space-y-8">
        {/* Change Password Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-medium mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Password</label>
              <input
                type="password"
                required
                value={passData.old}
                onChange={e => setPassData({...passData, old: e.target.value})}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">New Password</label>
              <input
                type="password"
                required
                value={passData.new}
                onChange={e => setPassData({...passData, new: e.target.value})}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm New Password</label>
              <input
                type="password"
                required
                value={passData.confirm}
                onChange={e => setPassData({...passData, confirm: e.target.value})}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            
            {message && (
              <div className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Sign Out Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-medium mb-4 text-rose-600">Danger Zone</h3>
          <p className="text-sm text-zinc-500 mb-4">Sign out of your account on this device.</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-400"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
