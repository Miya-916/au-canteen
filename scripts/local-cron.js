const cronSecret = process.env.CRON_SECRET || "pickup_reminder_secret_412";

async function runCron() {
  console.log("Running pickup reminder cron...");
  try {
    const res = await fetch("http://localhost:3000/api/line/pickup-reminders", {
      method: "POST",
      headers: {
        "x-cron-secret": cronSecret,
      },
    });
    if (!res.ok) {
      console.error("Cron failed:", res.status, await res.text());
    } else {
      console.log("Cron success:", await res.json());
    }
  } catch (e) {
    console.error("Cron error:", e);
  }
}

// Run immediately
runCron();

// Then run every minute
setInterval(runCron, 60 * 1000);
