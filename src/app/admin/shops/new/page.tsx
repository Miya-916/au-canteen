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
  const [lineRecipientId, setLineRecipientId] = useState("");
  const [address, setAddress] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
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

  async function uploadImage(file: File, sid: string) {
    setError("");
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sid", sid || "temp");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
          }
        };
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300 && json.url) {
              setImageUrl(json.url);
              resolve();
            } else {
              reject(new Error(json.error || "Upload failed"));
            }
          } catch {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(fd);
      });
    } catch (e: unknown) {
      const msg = typeof e === "object" && e && (e as { message?: string }).message;
      setError(msg || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

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
        lineRecipientId,
        address,
        openDate,
        imageUrl,
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
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Shop Profile Image</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    setPreview(URL.createObjectURL(file));
                    await uploadImage(file, "temp");
                  }
                }}
                className="mt-1 flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500 hover:bg-zinc-100"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span>Drag & Drop image here</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className={`inline-block rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm ${uploading ? 'opacity-60 pointer-events-none' : 'hover:bg-zinc-50'}`}>
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPreview(URL.createObjectURL(file));
                      await uploadImage(file, "temp");
                    }}
                    className="hidden"
                  />
                </label>
                {uploading && (
                  <span className="text-xs text-zinc-500" aria-live="polite">
                    {progress === 0 ? "Initializing upload..." : `Uploading... ${progress}%`}
                  </span>
                )}
                {!uploading && imageUrl && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Uploaded
                  </span>
                )}
              </div>
            </div>
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
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">LINE Recipient ID</label>
              <input
                type="text"
                value={lineRecipientId}
                onChange={(e) => setLineRecipientId(e.target.value)}
                placeholder="Enter LINE userId (for LINE notifications)"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
              />
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
