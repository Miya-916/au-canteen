import Stripe from "stripe";

let stripeSingleton: Stripe | null | undefined;

export function getStripe() {
  if (stripeSingleton !== undefined) return stripeSingleton;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    stripeSingleton = null;
    return null;
  }
  stripeSingleton = new Stripe(key, { typescript: true });
  return stripeSingleton;
}
