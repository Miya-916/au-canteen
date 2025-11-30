"use client";

import { useEffect } from "react";

export default function DebugLogger({ data }: { data: any }) {
  useEffect(() => {
    console.log("--- Shop Owner Page Debug Info ---");
    console.log("Current User Shop ID:", data.shopId);
    console.log("Fetched Shop Data:", data.shop);
    console.log("----------------------------------");
  }, [data]);

  return null;
}
