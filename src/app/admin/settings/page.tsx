"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type AppSettings = {
  system: {
    siteTitle: string;
    timezone: string;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'zh';
  };
};


const defaultSettings: AppSettings = {
  system: { siteTitle: "", timezone: "" },
  appearance: { theme: 'system', language: 'en' },
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

 
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
        setLoading(false);
      });
  }, []);

 
  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage("Settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save settings.");
      }
    } catch {
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };


  const [passData, setPassData] = useState({ old: "", new: "", confirm: "" });
  const [passMsg, setPassMsg] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const isPasswordFormComplete = !!(passData.old && passData.new && passData.confirm);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login?role=admin");
    router.refresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg("");
    if (!isPasswordFormComplete) {
      setPassMsg("Missing fields");
      return;
    }
    if (passData.new !== passData.confirm) {
      setPassMsg("New passwords do not match.");
      return;
    }
    if (passData.new.length < 6) {
      setPassMsg("Password must be at least 6 characters.");
      return;
    }

    setPassLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: passData.old, newPassword: passData.new }),
    });
    setPassLoading(false);

    if (res.ok) {
      setPassMsg("Password updated successfully.");
      setPassData({ old: "", new: "", confirm: "" });
    } else {
      const data = await res.json();
      setPassMsg(data.error || "Failed to update password.");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading settings...</div>;
  }

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto sm:px-6 sm:py-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {message && (
        <div className={`mb-6 rounded-lg p-4 text-sm font-medium ${message.includes("success") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">System Config</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Site Title</label>
              <input
                type="text"
                value={settings.system.siteTitle}
                onChange={(e) => setSettings({ ...settings, system: { ...settings.system, siteTitle: e.target.value } })}
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Timezone</label>
              <input
                type="text"
                value={settings.system.timezone}
                onChange={(e) => setSettings({ ...settings, system: { ...settings.system, timezone: e.target.value } })}
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>
        </div>

        {}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Appearance</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Theme</label>
              <select
                value={settings.appearance.theme}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    appearance: {
                      ...settings.appearance,
                      theme: e.target.value as AppSettings["appearance"]["theme"],
                    },
                  })
                }
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Language</label>
              <select
                value={settings.appearance.language}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    appearance: {
                      ...settings.appearance,
                      language: e.target.value as AppSettings["appearance"]["language"],
                    },
                  })
                }
                className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="en">English</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 mt-8">
        <h3 className="text-lg font-semibold mb-6">Account Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Change Password</h4>
            <input
              type="password"
              placeholder="Current Password"
              required
              value={passData.old}
              onChange={e => setPassData({...passData, old: e.target.value})}
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              type="password"
              placeholder="New Password"
              required
              value={passData.new}
              onChange={e => setPassData({...passData, new: e.target.value})}
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              required
              value={passData.confirm}
              onChange={e => setPassData({...passData, confirm: e.target.value})}
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            {passMsg && (
              <div className={`text-sm ${passMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {passMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={passLoading || !isPasswordFormComplete}
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            >
              {passLoading ? "Updating..." : "Update Password"}
            </button>
          </form>

          <div>
            <h4 className="text-sm font-medium text-rose-600 mb-4">Danger Zone</h4>
            <p className="text-sm text-zinc-500 mb-4">Sign out of your account on this device.</p>
            <button
              onClick={handleLogout}
              className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-400"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
