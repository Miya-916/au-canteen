import nodemailer from "nodemailer";

const user = process.env.SMTP_USER || "";
const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 587);
const useGmailService = host.includes("gmail.com");
const debugEnabled = (process.env.SMTP_DEBUG || "").toLowerCase() === "true" || process.env.SMTP_DEBUG === "1";

const transporter = nodemailer.createTransport({
  service: useGmailService ? "gmail" : undefined,
  host: useGmailService ? undefined : host,
  port: useGmailService ? undefined : port,
  secure: useGmailService ? undefined : port === 465,
  requireTLS: true,
  logger: debugEnabled,
  debug: debugEnabled,
  auth: { user, pass },
});

let verified = false;
async function ensureVerified() {
  if (verified) return;
  try {
    await transporter.verify();
    verified = true;
  } catch (e) {
    console.error("SMTP verify failed:", e);
  }
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!user || !pass) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("SMTP credentials missing, skipping email to", to);
    }
    return;
  }
  try {
    await ensureVerified();
    await transporter.sendMail({
      from: `"AU Canteen" <${user}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent to", to);
  } catch (error) {
    console.error("Failed to send email to", to, error);
  }
}

export function buildOrderStatusEmail(input: {
  orderId: string;
  status: string;
  totalAmount?: number | string | null;
  orderItems?: Array<{ name?: string | null; quantity?: number | string | null }> | null;
  pickupTime?: string | null;
  pickupLocation?: string | null;
}) {
  const normalized = String(input.status || "").trim().toLowerCase();
  const statusLabel =
    normalized === "accepted"
      ? "Order Accepted"
      : normalized === "preparing"
        ? "Payment Verified"
        : normalized === "ready"
          ? "Ready for Pickup"
          : normalized === "completed"
            ? "Order Completed"
            : normalized === "cancelled" || normalized === "rejected"
              ? "Rejected"
              : "";
  if (!statusLabel) return null;
  const orderId = String(input.orderId || "").trim();
  const orderIdShort = orderId ? orderId.slice(0, 8) : "";
  const totalValue = typeof input.totalAmount === "number" ? input.totalAmount : Number(input.totalAmount);
  const totalText = Number.isFinite(totalValue) ? `฿${totalValue.toFixed(2)}` : input.totalAmount ? `฿${input.totalAmount}` : "N/A";
  const itemsText = Array.isArray(input.orderItems)
    ? input.orderItems
        .map((item) => {
          const name = String(item?.name || "").trim();
          if (!name) return "";
          const quantityValue = Number(item?.quantity);
          const quantityPrefix = Number.isFinite(quantityValue) && quantityValue > 0 ? `${quantityValue}x ` : "";
          return `${quantityPrefix}${name}`;
        })
        .filter(Boolean)
        .join(", ")
    : "";
  const pickupTimeText = String(input.pickupTime || "").trim() || "N/A";
  const pickupLocationText = String(input.pickupLocation || "").trim() || "AU Canteen";
  const orderIdText = orderIdShort || orderId || "N/A";
  const subject = statusLabel === "Rejected" ? "Order Rejected" : `${statusLabel} · Order #${orderIdShort || orderId}`;
  const message =
    statusLabel === "Rejected"
      ? "The shop could not accept the order."
      : "Your order status has been updated.";
  if (normalized === "preparing") {
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #111827;">Payment Verified</h2>
        <p style="margin: 0 0 16px; color: #4b5563;">Your payment has been successfully verified.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb;">
          <p style="margin: 0 0 6px; color: #111827;"><strong>Order ID:</strong> ${orderIdText}</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Payment Status:</strong> Verified</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Total Amount:</strong> ${totalText}</p>
          <p style="margin: 0; color: #111827;"><strong>Pickup Location:</strong> ${pickupLocationText}</p>
        </div>
        <p style="margin: 16px 0 0; color: #4b5563;">The shop will prepare your order closer to your selected pickup time.</p>
        <p style="margin: 12px 0 0; color: #4b5563;">Thank you for ordering from AU Canteen ❤️.</p>
      </div>
    `;
    return { subject, html };
  }
  if (normalized === "ready") {
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #111827;">Ready for Pickup</h2>
        <p style="margin: 0 0 16px; color: #4b5563;">Your order is ready for pickup.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb;">
          <p style="margin: 0 0 6px; color: #111827;"><strong>Order ID:</strong> ${orderIdText}</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Items Ordered:</strong> ${itemsText || "N/A"}</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Status:</strong> Ready for Pickup</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Total Amount:</strong> ${totalText}</p>
          <p style="margin: 0; color: #111827;"><strong>Pickup Location:</strong> ${pickupLocationText}</p>
        </div>
        <p style="margin: 16px 0 0; color: #4b5563;">Please come to the shop to collect your order.</p>
        <p style="margin: 12px 0 0; color: #4b5563;">Thank you for ordering from AU Canteen.</p>
      </div>
    `;
    return { subject, html };
  }
  if (normalized === "cancelled" || normalized === "rejected") {
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #111827;">Your Order Could Not Be Processed</h2>
        <p style="margin: 0 0 16px; color: #4b5563;">Unfortunately, your order has been rejected by the shop.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb;">
          <p style="margin: 0 0 6px; color: #111827;"><strong>Order ID:</strong> ${orderIdText}</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Status:</strong> Rejected</p>
        </div>
        <p style="margin: 16px 0 0; color: #4b5563;">Please try choose a different menu item.</p>
        <p style="margin: 12px 0 0; color: #4b5563;">Thank you for using AU Canteen Ordering System.</p>
      </div>
    `;
    return { subject: "Order Rejected", html };
  }
  if (normalized === "completed") {
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #111827;">Order Completed!</h2>
        <p style="margin: 0 0 16px; color: #4b5563;">Your order has been completed successfully. We hope you enjoyed your meal!</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb;">
          <p style="margin: 0 0 6px; color: #111827;"><strong>Order ID:</strong> ${orderIdText}</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Total Amount:</strong> ${totalText}</p>
        </div>
        <p style="margin: 16px 0 0; color: #4b5563;">Thank you for ordering from AU Canteen.</p>
      </div>
    `;
    return { subject: "Your Order is Completed", html };
  }
  if (normalized === "accepted") {
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #111827;">Your order has been accepted! 🎉</h2>
        <p style="margin: 0 0 16px; color: #4b5563;">The shop has received your order and will prepare it according to your selected pickup time.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb;">
          <p style="margin: 0 0 6px; color: #111827;"><strong>Order ID:</strong> ${orderIdText}</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Items Ordered:</strong> ${itemsText || "N/A"}</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Total:</strong> ${totalText}</p>
          <p style="margin: 0 0 6px; color: #111827;"><strong>Pickup Time:</strong> ${pickupTimeText}</p>
          <p style="margin: 0; color: #111827;"><strong>Pickup Location:</strong> ${pickupLocationText}</p>
        </div>
        <p style="margin: 16px 0 0; color: #4b5563;">Please come to the shop during the pickup window to collect your order.</p>
        <p style="margin: 12px 0 0; color: #4b5563;">Thanks for ordering from AU Canteen!</p>
      </div>
    `;
    return { subject, html };
  }
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
      <h2 style="margin: 0 0 12px; color: #111827;">${statusLabel}</h2>
      <p style="margin: 0 0 16px; color: #4b5563;">${message}</p>
      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb;">
        <p style="margin: 0 0 6px; color: #111827;"><strong>Order ID:</strong> ${orderId || orderIdShort}</p>
        <p style="margin: 0 0 6px; color: #111827;"><strong>Status:</strong> ${statusLabel}</p>
        <p style="margin: 0 0 6px; color: #111827;"><strong>Total:</strong> ${totalText}</p>
        <p style="margin: 0; color: #111827;"><strong>Pickup Location:</strong> ${pickupLocationText}</p>
      </div>
      <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">AU Canteen System</p>
    </div>
  `;
  return { subject, html };
}
