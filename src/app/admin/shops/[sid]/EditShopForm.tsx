"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EditShopForm({
  sid,
  name: nameInit,
  status: statusInit,
  ownerName: ownerNameInit,
  ownerEmail: ownerEmailInit,
  cuisine: cuisineInit,
  category: categoryInit,
  openDate: openDateInit,
  phone: phoneInit,
  lineId: lineIdInit,
  address: addressInit,
}: {
  sid: string;
  name: string;
  status: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  cuisine?: string | null;
  category?: string | null;
  openDate?: string | null;
  phone?: string | null;
  lineId?: string | null;
  address?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(nameInit || "");
  const [status, setStatus] = useState(statusInit || "open");
  const [ownerName, setOwnerName] = useState(ownerNameInit || "");
  const [ownerEmail, setOwnerEmail] = useState(ownerEmailInit || "");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [cuisine, setCuisine] = useState(cuisineInit || "");
  const [category, setCategory] = useState(categoryInit || "");
  const [openDate, setOpenDate] = useState(openDateInit || "");
  const [phone, setPhone] = useState(phoneInit || "");
  const [lineId, setLineId] = useState(lineIdInit || "");
  const [address, setAddress] = useState(addressInit || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEmailLocked, setIsEmailLocked] = useState(!!ownerEmailInit);

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
    if (!name.trim()) return "Shop Name is required";
    if (!address) return "Location is required";
    if (!lineId.trim()) return "Vendor Line ID is required";
    
    if (!phone.trim()) return "Phone Number is required";
    if (!/^\d{9,10}$/.test(phone.replace(/[-\s]/g, ""))) {
      return "Phone number must be 9-10 digits";
    }

    if (!ownerEmail.trim()) return "Owner Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      return "Invalid email format";
    }
    
    if (openDate && isNaN(Date.parse(openDate))) {
      return "Date format must be dd/mm/yyyy";
    }

    return null;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/shops/${sid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status,
          ownerName,
          ownerEmail: ownerEmail.trim().toLowerCase(),
          ownerPassword: ownerPassword || undefined,
          cuisine: cuisine || undefined,
          category: category || undefined,
          openDate: openDate || undefined,
          phone,
          lineId,
          address,
        }),
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error(out?.error || "Failed to save shop");
      }
      router.push("/admin/shops");
      router.refresh();
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && (err as { message?: string }).message;
      setError(msg || "Failed to save shop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 max-w-xl space-y-4">
      {error && <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</div>}
      <div>
        <label className="block text-sm font-medium">Shop Name</label>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium">Status</label>
        <select 
          className={`mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 ${
            status === 'open' 
              ? 'bg-green-50 text-green-800' 
              : 'bg-rose-50 text-rose-800'
          }`} 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Floor & Location (Required)</label>
        <select
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        >
          <option value="">Select Location</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Cuisine Type</label>
        <select
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
        >
          <option value="">Select Cuisine</option>
          {cuisineTypes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Food Category</label>
        <select
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Select Category</option>
          {foodCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Stall Vendor</label>
        <input 
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" 
          value={ownerName} 
          onChange={(e) => setOwnerName(e.target.value)} 
          placeholder="Enter stall vendor's name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Vendor Line ID (Required)</label>
        <input 
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" 
          value={lineId} 
          onChange={(e) => setLineId(e.target.value)} 
          placeholder="Enter vendor's Line ID (for contact)"
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Phone Number (Required)</label>
        <input 
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)} 
          placeholder="Enter phone number"
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Opening Date</label>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
      </div>
      <div className="pt-4 border-t border-zinc-200 mt-6">
        <h3 className="mb-4 font-medium">Owner Account (Required)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Owner Email</label>
            <div className="flex gap-2">
              <input 
                className={`mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 ${isEmailLocked ? 'bg-zinc-100 text-zinc-500' : ''}`} 
                type="email" 
                value={ownerEmail} 
                onChange={(e) => setOwnerEmail(e.target.value)} 
                placeholder="Enter email for login" 
                readOnly={isEmailLocked}
              />
              {isEmailLocked && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Modifying this email will change the shop owner's login account, are you sure?")) {
                      setIsEmailLocked(false);
                    }
                  }}
                  className="mt-1 rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 whitespace-nowrap"
                >
                  Edit Account
                </button>
              )}
            </div>
          </div>
          {ownerEmail && (
            <div>
              <label className="block text-sm font-medium">New Password (leave blank to keep current)</label>
              <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Set new password" />
            </div>
          )}
        </div>
      </div>
      <div className="pt-4 flex justify-end">
        <button disabled={loading} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-teal-800">{loading ? "Saving..." : "Save Changes"}</button>
      </div>
    </form>
  );
}
