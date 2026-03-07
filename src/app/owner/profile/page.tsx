import ShopOwnerClient from "../ShopOwnerClient";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { getShop, getUser } from "@/lib/db";

export default async function ShopOwnerProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;

  let uid = null;
  let shop = null;

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload && typeof payload === "object" && "uid" in payload) {
      uid = (payload as { uid: string }).uid;
    }
  }

  if (uid) {
    const user = await getUser(uid);
    if (user?.shop_id) {
      const shopData = await getShop(user.shop_id);
      if (shopData) {
        shop = {
          ...shopData,
          open_date: shopData.open_date ? new Date(shopData.open_date).toISOString().split('T')[0] : null,
        };
      }
    }
  }

  if (!shop) {
    return <div>Shop not found or not authorized</div>;
  }

  return (
    <ShopOwnerClient shop={shop} initialView="profile">
      {/* We are reusing ShopOwnerClient but we want to show Profile content */}
      {/* However, ShopOwnerClient currently controls its own content based on activeView */}
      {/* And "settings" view in ShopOwnerClient is the shop settings, not user profile */}
      {/* We need to enhance ShopOwnerClient to accept children or a "profile" view */}
    </ShopOwnerClient>
  );
}
