"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

interface Shop {
  sid: string;
  name: string;
  status: string;
  owner_uid: string | null;
  owner_name: string | null;
  cuisine: string | null;
  open_date: string | null;
  email: string | null;
  phone: string | null;
  line_id: string | null;
  line_recipient_id?: string | null;
  address: string | null;
  category: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  category?: string | null;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  note?: string;
}

interface Order {
  id: string;
  shop_id: string;
  user_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}
interface Announcement {
  id: string;
  title: string;
  content?: string | null;
  is_published?: boolean;
  publish_time?: string | null;
  is_sticky?: boolean;
  visibility?: string | null;
  category?: string | null;
  created_at?: string | null;
}

export default function ShopOwnerClient({ shop: initialShop }: { shop: Shop }) {
  const router = useRouter();
  const [shop, setShop] = useState(initialShop);
  const [activeView, setActiveView] = useState<"dashboard" | "menu" | "settings" | "notifications" | "reports">("dashboard");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Dashboard State
  const [stats, setStats] = useState({ todayOrders: 0, todayRevenue: 0, topDish: "N/A" });
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderTab, setOrderTab] = useState<"pending" | "completed">("pending");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<{
    id: string;
    sid: string;
    shop_name: string;
    changes: Record<string, unknown>;
    status: string;
    created_at: string;
  }[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Menu State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: "", price: "", stock: "", imageUrl: "", category: "Staple" });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const menuImageInputRef = useRef<HTMLInputElement | null>(null);

  // Settings State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: shop.name || "",
    address: shop.address || "",
    phone: shop.phone || "",
    line_id: shop.line_id || "",
    line_recipient_id: shop.line_recipient_id || "",
    cuisine: shop.cuisine || "",
    open_date: shop.open_date ? new Date(shop.open_date).toISOString().split('T')[0] : "",
  });
  const [shopUpdateLoading, setShopUpdateLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  const isOpen = shop.status.toLowerCase() === "open";
  const [reports, setReports] = useState<{
    summary: { totalSales: number; totalOrders: number; averageOrderValue: number };
    trend: { date: string; sales: number; orders: number }[];
    topItems: { name: string; quantity: number; sales: number }[];
    categoryDistribution?: { category: string; sales: number; units: number }[];
    timeRangeTrend?: { slot: string; orders: number; sales: number }[];
    range?: { from: string; to: string };
  } | null>(null);
  const [orderDetails, setOrderDetails] = useState<Order[]>([]);
  const [orderDetailsTotal, setOrderDetailsTotal] = useState(0);
  const [orderDetailsPage, setOrderDetailsPage] = useState(0);

  // --- Effects ---

  useEffect(() => {
    if (activeView === "menu") {
      fetchMenu();
    } else if (activeView === "dashboard") {
      fetchStats();
      fetchOrders();
    } else if (activeView === "reports") {
      fetchReports();
    }
  }, [activeView, shop.sid]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeView === "dashboard") {
        fetchStats();
        fetchOrders();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeView, shop.sid]);
  useEffect(() => {
    if (activeView !== "reports") return;
    fetchOrderDetails();
  }, [activeView, reports?.range?.from, reports?.range?.to, orderDetailsPage]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/announcements?role=owner", { cache: "no-store" });
        const rows: Announcement[] = res.ok ? await res.json() : [];
        if (alive) setAnnouncements(rows || []);
      } catch {
        if (alive) setAnnouncements([]);
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  useEffect(() => {
    if (activeView !== "notifications") return;
    let alive = true;
    const load = async () => {
      try {
        setNotificationsLoading(true);
        const res = await fetch("/api/pending", { cache: "no-store" });
        const data: {
          id: string;
          sid: string;
          shop_name: string;
          changes: Record<string, unknown>;
          status: string;
          created_at: string;
          owner_read_at?: string | null;
        }[] = res.ok ? await res.json() : [];
        const filtered = (data || []).filter((r) => {
          const s = (r.status || "").toLowerCase();
          return r.sid === shop.sid && (s === "approved" || s === "rejected");
        });
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (alive) setNotifications(filtered);
      } catch {
        if (alive) setNotifications([]);
      } finally {
        if (alive) setNotificationsLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [activeView, shop.sid]);

  // --- Fetch Functions ---

  const fetchMenu = () => {
    fetch(`/api/shops/${shop.sid}/menu`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setMenuItems(data);
      })
      .catch(console.error);
  };

  const fetchStats = () => {
    fetch(`/api/shops/${shop.sid}/stats`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && !data.error) {
          setStats({
            todayOrders: data.todayOrders,
            todayRevenue: data.todayRevenue,
            topDish: data.topDish
          });
        }
      })
      .catch(console.error);
  };

  const fetchOrders = () => {
    fetch(`/api/shops/${shop.sid}/orders`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(console.error);
  };
  const fetchReports = () => {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    fetch(`/api/shops/${shop.sid}/reports?from=${from}&to=${to}`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && !data.error) setReports(data);
      })
      .catch(() => setReports(null));
  };
  const fetchOrderDetails = () => {
    const from = reports?.range?.from;
    const to = reports?.range?.to;
    const size = 10;
    const offset = orderDetailsPage * size;
    if (!from || !to) return;
    fetch(`/api/shops/${shop.sid}/orders?from=${from}&to=${to}&offset=${offset}&limit=${size}`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && !data.error) {
          setOrderDetails(Array.isArray(data.rows) ? data.rows : []);
          setOrderDetailsTotal(Number(data.total || 0));
        } else {
          setOrderDetails([]);
          setOrderDetailsTotal(0);
        }
      })
      .catch(() => {
        setOrderDetails([]);
        setOrderDetailsTotal(0);
      });
  };

  // --- Action Handlers ---

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Force full navigation to ensure clean state and trigger middleware logout logic
      window.location.href = "/login?logout=1";
    } catch (error) {
      console.error("Logout failed", error);
      // Fallback
      window.location.href = "/login?logout=1";
    }
  };

  const handleToggleStatus = async () => {
    setLoadingStatus(true);
    const newStatus = isOpen ? "closed" : "open";
    try {
      const res = await fetch(`/api/shops/${shop.sid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updatedShop = await res.json();
      setShop(updatedShop);
      showToast(`Shop is now ${newStatus}`, "success");
    } catch (error) {
      showToast("Failed to update status", "error");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      const current = order?.status || "pending";
      const next =
        current === "pending"
          ? "accepted"
          : current === "accepted"
            ? "preparing"
            : current === "preparing"
              ? "ready"
              : current === "ready"
                ? "completed"
                : "completed";
      const res = await fetch(`/api/shops/${shop.sid}/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      
      if (!res.ok) throw new Error("Failed to update order status");
      
      await fetchOrders();
      await fetchStats();
      showToast("Order status updated", "success");
    } catch (error) {
      showToast("Failed to update order status", "error");
    }
  };

  // Menu Handlers (Simplified for brevity, kept core logic)
  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setMenuLoading(true);
    try {
      const url = editingItemId 
        ? `/api/shops/${shop.sid}/menu/${editingItemId}`
        : `/api/shops/${shop.sid}/menu`;
      const method = editingItemId ? "PUT" : "POST";
      
      const payload = {
        ...menuForm,
        ...(editingItemId ? {} : { id: draftId })
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save item");
      
      await fetchMenu();
      setIsMenuModalOpen(false);
      resetMenuForm();
      showToast("Menu updated successfully", "success");
    } catch (error) {
      showToast("Failed to save menu item", "error");
    } finally {
      setMenuLoading(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`/api/shops/${shop.sid}/menu/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchMenu();
      showToast("Item deleted", "success");
    } catch (error) {
      showToast("Failed to delete item", "error");
    }
  };

  const resetMenuForm = () => {
    setMenuForm({ name: "", price: "", stock: "", imageUrl: "", category: "Staple" });
    setEditingItemId(null);
    setDraftId(null);
    if (menuImageInputRef.current) menuImageInputRef.current.value = "";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sid", shop.sid);
    formData.append("kind", "menu");
    // Pass editingItemId (if editing) or draftId (if creating) to ensure fixed path
    if (editingItemId) {
      formData.append("menuId", editingItemId);
    } else if (draftId) {
      formData.append("menuId", draftId);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setMenuForm((prev) => ({ ...prev, imageUrl: data.url }));
      }
    } catch (error) {
      console.error("Upload failed", error);
      showToast("Image upload failed", "error");
    }
  };

  // Settings Handlers
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      showToast("Password must be at least 8 characters with letters and numbers", "error");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      
      showToast("Password changed successfully! Please re-login", "success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => handleLogout(), 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      showToast(message, "error");
    } finally {
      setPasswordLoading(false);
    }
  };


  // --- Render Helpers ---

  const filteredMenuItems = menuItems.filter(item => 
    categoryFilter === "All" || item.category === categoryFilter
  );

  const filteredOrders = orders.filter(order =>
    {
      const s = (order.status || "").toLowerCase();
      return orderTab === "pending"
        ? s !== "completed" && s !== "cancelled"
        : s === "completed" || s === "cancelled";
    }
  );

  const statusBadgeClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return "bg-amber-100 text-amber-800";
    if (s === "accepted") return "bg-indigo-100 text-indigo-800";
    if (s === "preparing") return "bg-sky-100 text-sky-800";
    if (s === "ready") return "bg-emerald-100 text-emerald-800";
    if (s === "completed") return "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100";
    if (s === "cancelled") return "bg-rose-100 text-rose-800";
    return "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100";
  };

  const statusLabel = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return "Waiting";
    if (s === "accepted") return "Accepted";
    if (s === "preparing") return "Preparing";
    if (s === "ready") return "Ready";
    if (s === "completed") return "Completed";
    if (s === "cancelled") return "Rejected";
    return s || "Unknown";
  };

  const actionLabel = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return "Accept Order";
    if (s === "accepted") return "Start Preparing";
    if (s === "preparing") return "Mark Ready";
    if (s === "ready") return "Mark Picked Up";
    return "Update Status";
  };

  const canReject = (status: string) => {
    const s = (status || "").toLowerCase();
    return s === "pending" || s === "accepted";
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/shops/${shop.sid}/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed to reject order");
      await fetchOrders();
      await fetchStats();
      showToast("Order rejected", "success");
    } catch (error) {
      showToast("Failed to reject order", "error");
    }
  };

  return (
    <div suppressHydrationWarning className="flex h-[100svh] min-h-[100svh] bg-[#f5f5f5] dark:bg-black overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-white shadow-lg ${
          toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
        } animate-in slide-in-from-top-2`}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden h-full w-64 shrink-0 flex-col bg-zinc-100 text-zinc-600 border-r border-zinc-200 overflow-y-auto md:flex">
        <div className="flex items-center gap-3 px-6 py-6 text-xl font-semibold shrink-0 border-b border-zinc-200 text-zinc-900">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm text-white">S</div>
          <span>Shop Owner</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
          <button
            onClick={() => setActiveView("dashboard")}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeView === "dashboard" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </button>
          <button
            onClick={() => setActiveView("menu")}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeView === "menu" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            Menu Management
          </button>
          <button
            onClick={() => setActiveView("reports")}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeView === "reports" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18M7 15l3-3 4 4 5-5"/></svg>
            Reports
          </button>
          <button
            onClick={() => setActiveView("notifications")}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeView === "notifications" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z"/></svg>
            Notifications
          </button>
          <button
            onClick={() => setActiveView("settings")}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeView === "settings" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Settings
          </button>
        </nav>
        <div className="p-4 border-t border-zinc-200">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden pt-[calc(env(safe-area-inset-top)+56px)] md:pt-0">
        <div className="md:hidden fixed inset-x-0 top-0 z-50 shrink-0 border-b border-zinc-200 bg-white shadow-md ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/10 h-[calc(env(safe-area-inset-top)+56px)] pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <details className="relative z-50">
              <summary className="list-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </summary>
              <div className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="p-2">
                  <button
                    onClick={(e) => {
                      setActiveView("dashboard");
                      (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={(e) => {
                      setActiveView("menu");
                      (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Menu Management
                  </button>
                  <button
                    onClick={(e) => {
                      setActiveView("reports");
                      (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Reports
                  </button>
                  <button
                    onClick={(e) => {
                      setActiveView("notifications");
                      (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Notifications
                  </button>
                  <button
                    onClick={(e) => {
                      setActiveView("settings");
                      (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Settings
                  </button>
                  <div className="my-2 h-px bg-zinc-200 dark:bg-zinc-800" />
                  <button
                    onClick={() => handleLogout()}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </details>
            <div className="min-w-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{shop?.name || "Shop Owner"}</div>
            <NotificationBell sid={shop.sid} onView={() => setActiveView("notifications")} />
          </div>
        </div>

        <div className="flex flex-col md:flex-1 md:min-h-0">
        {activeView === "dashboard" && (
          <div className="flex flex-col bg-[#f5f5f5] dark:bg-black px-4 py-4 space-y-6 sm:p-6 md:flex-1 md:min-h-0 md:overflow-y-auto">
            {/* Top: Shop Info (Compact) */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{shop.name}</h1>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 flex flex-col gap-1 mt-1 sm:flex-row sm:items-center sm:gap-4">
                  <span>{shop.phone || "No phone"}</span>
                  {shop.line_id && <span>Line: {shop.line_id}</span>}
                  <span>{shop.address || "No address"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {isOpen ? 'Open' : 'Closed'}
                </div>
                <div className="hidden md:block">
                  <NotificationBell sid={shop.sid} onView={() => setActiveView("notifications")} />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">🔔</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-yellow-900">Announcements</div>
                  <div className="mt-1 space-y-2">
                    {(announcements || []).length === 0 ? (
                      <div className="text-xs text-yellow-900">No announcements</div>
                    ) : (
                      announcements.slice(0, 2).map((a) => (
                        <div key={a.id}>
                          <div className="text-xs font-semibold text-yellow-900">{a.title}</div>
                          {a.content ? <div className="mt-0.5 text-xs text-yellow-900/90">{a.content}</div> : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 gap-6 lg:flex-1 lg:min-h-0 lg:grid-cols-2">
              {/* Left Column: Status & Stats */}
              <div className="space-y-6">
                {/* Business Status */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Business Status</h2>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Current status: <span className="font-medium text-zinc-900 dark:text-white">{isOpen ? "Accepting Orders" : "Not Accepting Orders"}</span>
                    </div>
                    <button
                      onClick={handleToggleStatus}
                      disabled={loadingStatus}
                      className={`px-6 py-2 rounded-lg font-medium text-white shadow-sm transition-all ${
                        isOpen
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      } disabled:opacity-70`}
                    >
                      {loadingStatus ? "Updating..." : (isOpen ? "Close Shop" : "Open Shop")}
                    </button>
                  </div>
                </div>

                {/* Today's Stats */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Todays Stats</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-center">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium">Orders</div>
                      <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.todayOrders}</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg text-center">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium">Revenue</div>
                      <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">฿{stats.todayRevenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg text-center">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium">Top Dish</div>
                      <div className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-1 truncate" title={stats.topDish}>{stats.topDish}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Management */}
              <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm h-auto lg:h-[calc(100vh-220px)] lg:min-h-0 lg:overflow-hidden">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <h2 className="text-lg font-semibold">Order Management</h2>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button
                      onClick={() => setOrderTab("pending")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        orderTab === "pending" ? "bg-white dark:bg-black text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setOrderTab("completed")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        orderTab === "completed" ? "bg-white dark:bg-black text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-4 lg:flex-1 lg:overflow-y-auto lg:min-h-0">
                  {filteredOrders.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-center text-zinc-400">
                      <p>No {orderTab} orders</p>
                    </div>
                  ) : (
                    filteredOrders.map(order => (
                      <div key={order.id} className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">#{order.id.slice(0, 8)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                                statusBadgeClass(order.status)
                              }`}>
                                {statusLabel(order.status)}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              {new Date(order.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-indigo-600">฿{order.total_amount}</div>
                            <div className="text-xs text-zinc-500">{order.items?.length || 0} items</div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-3">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="bg-white dark:bg-zinc-900 px-1.5 rounded text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                                    {item.quantity}x
                                  </span>
                                  <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">{item.name}</span>
                                </div>
                                <span className="text-zinc-500 text-xs">฿{item.price * item.quantity}</span>
                              </div>
                              {item.note && (
                                <div className="ml-8 text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded inline-block self-start">
                                  Note: {item.note}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {order.status !== 'completed' && (
                          <div className="flex gap-2">
                            <button 
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                              onClick={() => handleCompleteOrder(order.id)}
                            >
                              {actionLabel(order.status)}
                            </button>
                            {canReject(order.status) && (
                              <button 
                                className="px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
                                onClick={() => handleRejectOrder(order.id)}
                                title="Reject and cancel this order"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "reports" && (
          <div className="bg-zinc-50 dark:bg-black px-4 pt-8 pb-4 space-y-6 sm:px-6 sm:pb-6 sm:pt-10 md:flex-1 md:min-h-0 md:overflow-y-auto">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">Reports</h1>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {reports?.range ? `Last 30 days (${reports.range.from} → ${reports.range.to})` : "Last 30 days"}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500">Total Sales</div>
                <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">฿{Number(reports?.summary?.totalSales || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500">Total Orders</div>
                <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{Number(reports?.summary?.totalOrders || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500">Avg Order Value</div>
                <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">฿{Number(reports?.summary?.averageOrderValue || 0).toFixed(2)}</div>
                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">per order</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Order / Sales Distribution</div>
                {(() => {
                  const parts = (reports?.categoryDistribution || []).slice().sort((a, b) => (Number(b.sales) || 0) - (Number(a.sales) || 0));
                  const total = parts.reduce((s, p) => s + (Number(p.sales) || 0), 0);
                  const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#14B8A6", "#8B5CF6", "#22C55E", "#FB7185"];
                  let acc = 0;
                  const segments = parts.map((p, i) => {
                    const pct = total > 0 ? (Number(p.sales) || 0) / total : 0;
                    const start = acc;
                    acc += pct;
                    return { start, end: acc, color: colors[i % colors.length], label: p.category, pct: Math.round(pct * 100) };
                  });
                  const bg = segments.map(s => `${s.color} ${Math.round(s.start * 100)}% ${Math.round(s.end * 100)}%`).join(", ");
                  return (
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                      <div className="relative h-36 w-36 shrink-0 rounded-full sm:h-40 sm:w-40" style={{ background: `conic-gradient(${bg || "#e5e7eb 0% 100%"})` }}>
                        <div className="absolute inset-5 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center sm:inset-6">
                          <div className="text-center">
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Total</div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">฿{Number(total).toFixed(0)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {segments.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
                            <span className="flex-1 min-w-0 truncate" title={s.label}>{s.label}</span>
                            <span className="text-zinc-500 dark:text-zinc-400">{s.pct}%</span>
                          </div>
                        ))}
                        {segments.length === 0 && <div className="text-sm text-zinc-500">No data</div>}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sales / Orders by Time of Day</div>
                {(() => {
                  const slots = ["06–10", "10–14", "14–18"];
                  const raw = (reports?.timeRangeTrend || []).slice();
                  const rows = slots.map(s => raw.find(r => r.slot === s) || { slot: s, orders: 0, sales: 0 });
                  const max = Math.max(...rows.map(r => Number(r.orders) || 0), 0);
                  const H = 100;
                  const path = rows
                    .map((r, i) => {
                      const x = rows.length > 1 ? (i / (rows.length - 1)) * 100 : 50;
                      const y = max > 0 ? H - ((Number(r.orders) || 0) / max) * H : H;
                      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                    }).join(" ");
                  const area = `${path} L 100 100 L 0 100 Z`;
                  return (
                    <div>
                      <svg className="w-full h-32" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d={area || "M 0 100 L 100 100 L 0 100 Z"} className="fill-indigo-600/10 stroke-0" />
                        <path d={path || "M 0 100 L 100 100"} className="stroke-[1.5] stroke-indigo-600 fill-none" />
                      </svg>
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                        {rows.map((t) => (
                          <div key={t.slot} className="flex-1 text-center">{t.slot}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top Selling Items</div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(reports?.topItems || []).map((it) => (
                  <div key={it.name} className="flex items-center justify-between py-2">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{it.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{it.quantity} sold · ฿{Number(it.sales).toFixed(0)}</div>
                  </div>
                ))}
                {(reports?.topItems || []).length === 0 && (
                  <div className="py-6 text-center text-sm text-zinc-500">No data</div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Order Details</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 dark:text-zinc-400">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Order ID</th>
                      <th className="py-2 pr-3">Order Time</th>
                      <th className="py-2 pr-3">Items</th>
                      <th className="py-2 pr-3">Total Amount</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {orderDetails.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-zinc-500">No orders in range</td>
                      </tr>
                    ) : (
                      orderDetails.map((o) => {
                        const d = new Date(o.created_at);
                        const date = d.toISOString().split("T")[0];
                        const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
                        const items = Array.isArray(o.items) ? o.items.map((it: OrderItem) => `${Number(it.quantity || 0)}x ${String(it.name || "")}`).join(", ") : "";
                        const total = typeof o.total_amount === "number" ? o.total_amount : Number(o.total_amount || 0);
                        return (
                          <tr key={o.id} className="text-zinc-900 dark:text-zinc-100">
                            <td className="py-2 pr-3">{date}</td>
                            <td className="py-2 pr-3">#{String(o.id).slice(0, 8)}</td>
                            <td className="py-2 pr-3">{time}</td>
                            <td className="py-2 pr-3 truncate" title={items}>{items}</td>
                            <td className="py-2 pr-3">฿{Number(total).toFixed(0)}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${statusBadgeClass(o.status)}`}>
                                {statusLabel(o.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {orderDetailsTotal > 0 ? `Showing ${orderDetails.length} of ${orderDetailsTotal}` : ""}
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50"
                    onClick={() => setOrderDetailsPage((p) => Math.max(p - 1, 0))}
                    disabled={orderDetailsPage === 0}
                  >
                    Prev
                  </button>
                  <button
                    className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50"
                    onClick={() => setOrderDetailsPage((p) => p + 1)}
                    disabled={orderDetailsTotal > 0 ? (orderDetailsPage + 1) * 10 >= orderDetailsTotal : orderDetails.length < 10}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "notifications" && (
          <div className="flex flex-col bg-zinc-50 dark:bg-black px-4 py-4 space-y-6 sm:p-6 md:flex-1 md:min-h-0 md:overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <button
                  onClick={async () => {
                    try {
                      setNotificationsLoading(true);
                      const res = await fetch("/api/pending", { cache: "no-store" });
                      const data: {
                        id: string;
                        sid: string;
                        shop_name: string;
                        changes: Record<string, unknown>;
                        status: string;
                        created_at: string;
                      }[] = res.ok ? await res.json() : [];
                      const filtered = (data || []).filter((r) => {
                        const s = (r.status || "").toLowerCase();
                        return r.sid === shop.sid && (s === "approved" || s === "rejected");
                      });
                      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                      setNotifications(filtered);
                    } finally {
                      setNotificationsLoading(false);
                    }
                  }}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  {notificationsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <div className="p-4">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">No notifications</div>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {notifications.map((n) => {
                      const s = (n.status || "").toLowerCase();
                      const badgeClass =
                        s === "approved"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
                      const label = s === "approved" ? "Approved" : "Rejected";
                      const msg = typeof n.changes?.message === "string" ? n.changes.message : "";
                      return (
                        <div key={n.id} className="flex items-start justify-between gap-4 px-4 py-3">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Update Request</div>
                            {msg ? <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{msg}</div> : null}
                            <div className="mt-1 text-[11px] text-zinc-500">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === "menu" && (
          <div className="flex flex-col bg-zinc-50 dark:bg-black md:flex-1 md:min-h-0 md:overflow-y-auto">
            <div className="sticky top-0 z-20 bg-zinc-50 dark:bg-black px-4 pt-8 pb-2 sm:px-6 sm:pt-10 shadow-sm transition-shadow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">Menu Management</h1>
                <button
                  onClick={() => {
                    setDraftId(self.crypto.randomUUID());
                    setIsMenuModalOpen(true);
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                >
                  Add Menu Item
                </button>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {["All", "Set", "Staple", "Side Dish", "Drink", "Dessert"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      categoryFilter === cat 
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" 
                        : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Grid */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-zinc-900 h-[340px] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="relative h-40 w-full shrink-0 bg-zinc-100 dark:bg-zinc-800">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-zinc-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                      )}
                      {item.stock === 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Sold Out</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col min-h-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-white line-clamp-2 flex-1 mr-2" title={item.name}>{item.name}</h3>
                        <span className="font-bold text-indigo-600 shrink-0">฿{item.price}</span>
                      </div>
                      <div className="text-sm text-zinc-500 mb-4 truncate">
                        Stock: {item.stock} • {item.category || "Uncategorized"}
                      </div>
                      <div className="mt-auto flex gap-2">
                        <button
                          onClick={() => {
                            setMenuForm({
                              name: item.name,
                              price: item.price.toString(),
                              stock: item.stock.toString(),
                              imageUrl: item.image_url || "",
                              category: item.category || "Staple"
                            });
                            setEditingItemId(item.id);
                            setIsMenuModalOpen(true);
                          }}
                          className="flex-1 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(item.id)}
                          className="px-3 py-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === "settings" && (
          <div className="bg-zinc-50 dark:bg-black px-4 pt-8 pb-4 sm:px-6 sm:pb-6 sm:pt-10 md:flex-1 md:min-h-0 md:overflow-y-auto">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 sm:text-2xl">Settings</h1>
            
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Change Password Section */}
              <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">Change Password</h2>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                      placeholder="Min 8 chars, letters & numbers"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-70"
                    >
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </section>

              <hr className="border-zinc-200 dark:border-zinc-800" />

              {/* Edit Shop Info Section */}
              <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-5 text-zinc-900 dark:text-white">Edit Shop Information</h2>
                <div className="mb-5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Personal information is managed by admin. Contact admin to update.
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setShopUpdateLoading(true);
                  try {
                    const res = await fetch(`/api/pending`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        sid: shop.sid,
                        changes: { message: requestMessage },
                        reason: requestMessage || null,
                        requested_by: shop.owner_uid || null,
                      }),
                    });
                    if (!res.ok) {
                      let err = "Failed to submit request";
                      try {
                        const data = await res.json();
                        if (data?.error) err = String(data.error);
                      } catch {}
                      throw new Error(err);
                    }
                    setRequestMessage("");
                    showToast("Request submitted to admin", "success");
                  } catch (error) {
                    const msg = error instanceof Error ? error.message : "Failed to submit request";
                    showToast(msg, "error");
                  } finally {
                    setShopUpdateLoading(false);
                  }
                }} className="grid grid-cols-1 gap-y-5 md:grid-cols-2 md:gap-x-6 md:gap-y-6">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Shop Name</label>
                    <input
                      type="text"
                      value={shopForm.name}
                      disabled
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-800/60 dark:disabled:text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cuisine</label>
                    <input
                      type="text"
                      value={shopForm.cuisine}
                      disabled
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-800/60 dark:disabled:text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Location / Floor</label>
                    <input
                      type="text"
                      value={shopForm.address}
                      disabled
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-800/60 dark:disabled:text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone</label>
                    <input
                      type="text"
                      value={shopForm.phone}
                      disabled
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-800/60 dark:disabled:text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Line ID</label>
                    <input
                      type="text"
                      value={shopForm.line_id}
                      disabled
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-800/60 dark:disabled:text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">LINE Recipient ID</label>
                    <input
                      type="text"
                      value={shopForm.line_recipient_id}
                      disabled
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-800/60 dark:disabled:text-zinc-300"
                      placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      ℹ️ How to get this ID: Follow our LINE Official Account, and the bot will reply with your User ID.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Opening Date</label>
                    <input
                      type="date"
                      value={shopForm.open_date}
                      disabled
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-800/60 dark:disabled:text-zinc-300"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Request Message</label>
                    <textarea
                      rows={3}
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="Describe what information needs to be updated"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={shopUpdateLoading || !requestMessage.trim()}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-70"
                    >
                      {shopUpdateLoading ? "Submitting..." : "Request Update"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Menu Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {editingItemId ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button onClick={() => setIsMenuModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveMenu} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input type="text" required value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-zinc-800 dark:border-zinc-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Price</label>
                  <input type="number" required value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-zinc-800 dark:border-zinc-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Stock</label>
                  <input type="number" required value={menuForm.stock} onChange={e => setMenuForm({...menuForm, stock: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-zinc-800 dark:border-zinc-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Category</label>
                <select value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})} className="w-full rounded-lg border p-2 dark:bg-zinc-800 dark:border-zinc-700">
                  <option value="Staple">Staple</option>
                  <option value="Set">Set</option>
                  <option value="Side Dish">Side Dish</option>
                  <option value="Drink">Drink</option>
                  <option value="Dessert">Dessert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Image</label>
                <input
                  ref={menuImageInputRef}
                  type="file"
                  accept="image/*"
                  onClick={(e) => {
                    (e.currentTarget as HTMLInputElement).value = "";
                  }}
                  onChange={handleImageUpload}
                  className="w-full text-sm"
                />
                {menuForm.imageUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={menuForm.imageUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuForm((prev) => ({ ...prev, imageUrl: "" }));
                        if (menuImageInputRef.current) menuImageInputRef.current.value = "";
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsMenuModalOpen(false)} className="px-4 py-2 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancel</button>
                <button type="submit" disabled={menuLoading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">{menuLoading ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
