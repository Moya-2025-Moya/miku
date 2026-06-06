/**
 * Manage the Telegram webhook.
 *
 *   npx tsx scripts/telegram-webhook.ts set https://your-app.vercel.app
 *   npx tsx scripts/telegram-webhook.ts info
 *   npx tsx scripts/telegram-webhook.ts delete
 *
 * Reads TELEGRAM_BOT_TOKEN (and optional TELEGRAM_WEBHOOK_SECRET) from .env.
 */
import { readFileSync } from "node:fs";

// Minimal .env loader so this runs without extra deps.
function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env — rely on real env */
  }
}
loadEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}
const API = `https://api.telegram.org/bot${token}`;

async function main() {
  const [cmd, url] = process.argv.slice(2);

  if (cmd === "set") {
    if (!url) {
      console.error("Usage: telegram-webhook.ts set <https-base-url>");
      process.exit(1);
    }
    const body: Record<string, unknown> = {
      url: `${url.replace(/\/$/, "")}/api/telegram`,
      allowed_updates: ["message", "edited_message"],
      drop_pending_updates: true,
    };
    if (process.env.TELEGRAM_WEBHOOK_SECRET) {
      body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
    }
    const r = await fetch(`${API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((x) => x.json());
    console.log(JSON.stringify(r, null, 2));
    return;
  }

  if (cmd === "delete") {
    const r = await fetch(`${API}/deleteWebhook?drop_pending_updates=true`).then((x) => x.json());
    console.log(JSON.stringify(r, null, 2));
    return;
  }

  // default: info
  const r = await fetch(`${API}/getWebhookInfo`).then((x) => x.json());
  console.log(JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
