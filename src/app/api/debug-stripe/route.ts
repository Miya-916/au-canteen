import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;
  const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const status = {
    hasSecretKey: !!key,
    secretKeyPrefix: key ? key.slice(0, 8) + "..." : null,
    hasPublishableKey: !!pubKey,
    hasWebhookSecret: !!webhookSecret,
  };

  try {
    // Try to list customers to verify the key works (requires read permission)
    await stripe.customers.list({ limit: 1 });
    return NextResponse.json({ ...status, connection: "OK" });
  } catch (error: unknown) {
    const message = typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : "Unknown Stripe error";
    return NextResponse.json({ ...status, connection: "FAILED", error: message }, { status: 500 });
  }
}
