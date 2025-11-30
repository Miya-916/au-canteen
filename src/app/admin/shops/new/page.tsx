"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewShopPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<"email" | "phone" | "">("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("open");
  const [cuisine, setCuisine] = useState("");
  const [category, setCategory] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [address, setAddress] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const locations = [
    "1F - Stall 1", "1F - Stall 2", "1F - Stall 3", 
    "1F - Stall 4", "1F - Stall 5", "1F - Stall 6", 
    "2F - Stall 1"
  ];
  
  const cuisineTypes = [
    "Thai Cuisine", 
    "Chinese Cuisine", 
    "Western Cuisine", 
    "Japanese Cuisine", 
    "Korean Cuisine", 
    "Indian Cuisine", 
    "Vegetarian Cuisine"
  ];
  
  const foodCategories = [
    "Main Dishes", "Noodles", "Rice Dishes", "Snacks", "Beverages"
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Shop Name is required";
    if (!status) newErrors.status = "Status is required";
    if (!address) newErrors.address = "Location is required";
    if (!lineId.trim()) newErrors.lineId = "Line ID is required";
    
    // Phone is required by API
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{9,10}$/.test(phone.replace(/[-\s]/g, ""))) {
       newErrors.phone = "Phone number must be 9-10 digits";
    }

    if (!ownerPassword) {
      newErrors.ownerPassword = "Password is required";
    } else if (ownerPassword.length < 6) {
      newErrors.ownerPassword = "Password must be at least 6 characters";
    }

    if (!loginType) {
      newErrors.loginType = "Login Type is required";
    } else if (loginType === "email") {
      if (!ownerEmail.trim()) {
        newErrors.ownerEmail = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
        newErrors.ownerEmail = "Invalid email format";
      }
    }
    
    if (openDate && isNaN(Date.parse(openDate))) {
        newErrors.openDate = "Invalid date format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const res = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        status,
        cuisine,
        category,
        ownerName,
        ownerEmail,
        ownerPassword,
        phone,
        lineId,
        address,
        openDate,
        loginType,
      }),
    });
    if (res.ok) {
      router.push("/admin/shops");
      router.refresh();
    } else {
      const json = await res.json();
      setError(json.error || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link 
          href="/admin/shops" 
          title="Back to Shops Management"
          className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add New Shop</h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Shop Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Auntie Noy's Kitchen"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800 ${
                  status === 'open' 
                    ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300'
                }`}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Floor & Location</label>
              <select
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              {errors.address && <p className="mt-1 text-xs text-rose-500">{errors.address}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cuisine Type</label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select Cuisine</option>
                {cuisineTypes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Food Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select Category</option>
                {foodCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stall Vendor</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Enter stall vendor's name"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Vendor Line ID</label>
              <input
                type="text"
                required
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="Enter vendor's Line ID (for contact)"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
              />
              {errors.lineId && <p className="mt-1 text-xs text-rose-500">{errors.lineId}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Opening Date</label>
              <input
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
              />
              {errors.openDate && <p className="mt-1 text-xs text-rose-500">{errors.openDate}</p>}
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h3 className="mb-4 text-base font-medium text-zinc-900 dark:text-zinc-100">Vendor Login Account</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Login Type</label>
                <select
                  value={loginType}
                  onChange={(e) => setLoginType(e.target.value as "email" | "phone")}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="">Select Login Type</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
                {errors.loginType && <p className="mt-1 text-xs text-rose-500">{errors.loginType}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Owner Email {loginType === "email" && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="email"
                  required={loginType === "email"}
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="Enter email for vendor login"
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
                />
                {errors.ownerEmail && <p className="mt-1 text-xs text-rose-500">{errors.ownerEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Phone Number {loginType === "phone" && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  required={loginType === "phone"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone for vendor login"
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
                />
                {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Set initial password for vendor login"
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
                />
                {errors.ownerPassword && <p className="mt-1 text-xs text-rose-500">{errors.ownerPassword}</p>}
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}

          <div className="flex justify-end gap-3">
            <Link
              href="/admin/shops"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Add Shop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
