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
  lineRecipientId: lineRecipientIdInit,
  address: addressInit,
  imageUrl: imageUrlInit,
  qrUrl: qrUrlInit,
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
  lineRecipientId?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  qrUrl?: string | null;
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
  const [lineRecipientId, setLineRecipientId] = useState(lineRecipientIdInit || "");
  const [address, setAddress] = useState(addressInit || "");
  const [imageUrl, setImageUrl] = useState(imageUrlInit || "");
  const [preview, setPreview] = useState<string>(imageUrlInit || "");
  const [qrUrl, setQrUrl] = useState(qrUrlInit || "");
  const [qrPreview, setQrPreview] = useState<string>(qrUrlInit || "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [qrProgress, setQrProgress] = useState<number>(0);
  const [qrError, setQrError] = useState<string | null>(null);
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
    "Main Dishes", "Noodles", "Snacks", "Beverages"
  ];

  async function uploadImage(file: File) {
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sid", sid);
      fd.append("kind", "profile");
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

  async function uploadQr(file: File) {
    setQrError(null);
    setUploadingQr(true);
    setQrProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sid", sid);
      fd.append("kind", "qr");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setQrProgress(pct);
          }
        };
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300 && json.url) {
              setQrUrl(json.url);
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
      setQrError(msg || "Failed to upload QR");
    } finally {
      setUploadingQr(false);
    }
  }

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
          lineRecipientId: lineRecipientId || undefined,
          address,
          imageUrl: imageUrl || undefined,
          qrUrl: qrUrl || undefined,
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
    <form onSubmit={onSubmit} className="mt-4 max-w-5xl space-y-6">
      {error && <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</div>}
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
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
        </div>

        <div className="space-y-4">
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
            <label className="block text-sm font-medium">LINE Recipient ID</label>
            <input 
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" 
              value={lineRecipientId} 
              onChange={(e) => setLineRecipientId(e.target.value)} 
              placeholder="Enter LINE userId (for LINE notifications)"
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
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Shop Profile Image</label>
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
              await uploadImage(file);
            }
          }}
          className="mt-1 flex h-80 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500 hover:bg-zinc-100 relative overflow-hidden"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-full w-full object-contain" />
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
                await uploadImage(file);
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
          {!uploading && error && (
            <span className="text-xs text-rose-600" aria-live="polite">{error}</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Shop QR Code</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={async (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              const file = files[0];
              setQrPreview(URL.createObjectURL(file));
              await uploadQr(file);
            }
          }}
          className="mt-1 flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500 hover:bg-zinc-100"
        >
          {qrPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrPreview} alt="QR Preview" className="h-full w-full object-contain p-2" />
          ) : (
            <span>Drag & Drop QR image here</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <label className={`inline-block rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm ${uploadingQr ? 'opacity-60 pointer-events-none' : 'hover:bg-zinc-50'}`}>
            Choose QR
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setQrPreview(URL.createObjectURL(file));
                await uploadQr(file);
              }}
              className="hidden"
            />
          </label>
          {uploadingQr && (
            <span className="text-xs text-zinc-500" aria-live="polite">
              {qrProgress === 0 ? "Initializing upload..." : `Uploading... ${qrProgress}%`}
            </span>
          )}
          {!uploadingQr && qrUrl && (
            <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Uploaded
            </span>
          )}
          {!uploadingQr && qrError && (
            <span className="text-xs text-rose-600" aria-live="polite">{qrError}</span>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 mt-6">
        <h3 className="mb-4 font-medium">Owner Account (Required)</h3>
        <div className="space-y-4 max-w-xl">
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
