import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { getShop, getShopByOwnerUid, getUser } from "@/lib/db";
import ShopOwnerClient from "./ShopOwnerClient";
import DebugLogger from "./DebugLogger";

export const dynamic = "force-dynamic";

export default async function OwnerHome() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;

    let uid = null;
    let tokenPayload = null;
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload && typeof payload === "object" && "uid" in payload) {
        tokenPayload = payload as { uid: string; email?: string };
        uid = tokenPayload.uid;
      }
    }

    let shop = null;
    let shopId: string | null = null;
    let shopNotFound = false;
    let userEmail: string | null = null;
    let user = null;

    if (uid) {
      user = await getUser(uid);
      shopId = user?.shop_id || null;
      userEmail = user?.email || tokenPayload?.email || "Unknown Email";
      const shopByUserLink = shopId ? await getShop(shopId) : null;
      const shopByOwner = shopByUserLink ? null : await getShopByOwnerUid(uid);
      const shopData = shopByUserLink || shopByOwner;
      if (shopData) {
        shop = {
          ...shopData,
          open_date: shopData.open_date ? new Date(shopData.open_date).toISOString().split("T")[0] : null,
        };
        shopId = shopData.sid || shopId;
      } else if (shopId) {
        shopNotFound = true;
      }
    }

    if (shop) {
      return <ShopOwnerClient shop={shop} />;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
        <DebugLogger data={{ shopId, shop, user, tokenPayload }} />
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Shop Owner Portal</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {!uid ? (
                <>
                  Please log in to view your shop.
                  <br />
                  <a href="/login" className="mt-2 inline-block font-medium text-indigo-600 hover:text-indigo-500">Go to Login</a>
                </>
              ) : shopNotFound ? (
                "Shop not found, please contact admin"
              ) : (
                <>
                  No shop associated with this account <span className="font-medium text-zinc-900 dark:text-zinc-100">({userEmail})</span>.
                  <br />
                  Contact admin: admin@aucanteen.com
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <h1 className="mb-2 text-xl font-semibold text-rose-600">Server Error</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Please reload the page. If the problem persists, log in again.
            </p>
            <a href="/login" className="mt-4 inline-block font-medium text-indigo-600 hover:text-indigo-500">Go to Login</a>
          </div>
        </div>
      </div>
    );
  }
}
