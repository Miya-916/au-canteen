import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // Only warn in development, but don't crash
    if (process.env.NODE_ENV !== "production") {
      console.warn("SMTP credentials missing, skipping email to", to);
    }
    return;
  }
  try {
    await transporter.sendMail({
      from: `"AU Canteen" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent to", to);
  } catch (error) {
    console.error("Failed to send email to", to, error);
  }
}
