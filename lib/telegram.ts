// Thin Telegram Bot API client + types. Platform-agnostic engine lives in
// lib/services; this file is only the transport between Telegram and that engine.

const API = "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

// ── Inbound update shapes (only the fields we use) ───────────────────────────
export interface TgPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
}

export interface TgMessage {
  message_id: number;
  from?: { id: number; first_name?: string; username?: string };
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  // Present when the user forwarded a message; origin carries the real sender.
  forward_origin?: {
    type: string;
    sender_user?: { first_name?: string; username?: string };
    sender_user_name?: string;
    chat?: { title?: string };
  };
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
}

// ── Outbound calls ───────────────────────────────────────────────────────────
async function call(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Telegram ${method} failed: ${res.status} ${detail}`);
  }
  return res;
}

export function sendMessage(chatId: number, text: string) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

// "typing…" indicator while the (multi-second) analysis runs.
export function sendTyping(chatId: number) {
  return call("sendChatAction", { chat_id: chatId, action: "typing" });
}

// Resolve a file_id to a downloadable URL, then fetch it as base64. Used for the
// screenshot → OCR path, which reuses the existing import service.
export async function downloadFileBase64(
  fileId: string
): Promise<{ data: string; media_type: "image/jpeg" | "image/png" }> {
  const meta = await fetch(`${API}/bot${token()}/getFile?file_id=${fileId}`).then((r) =>
    r.json()
  );
  const path: string | undefined = meta?.result?.file_path;
  if (!path) throw new Error("Could not resolve Telegram file path");
  const buf = await fetch(`${API}/file/bot${token()}/${path}`).then((r) => r.arrayBuffer());
  const data = Buffer.from(buf).toString("base64");
  const media_type = path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return { data, media_type };
}

// HTML-escape model output before embedding in a parse_mode:"HTML" message.
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
