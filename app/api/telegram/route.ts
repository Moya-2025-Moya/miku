import { NextRequest, NextResponse } from "next/server";
import {
  sendMessage,
  sendTyping,
  downloadFileBase64,
  esc,
  type TgUpdate,
  type TgMessage,
} from "@/lib/telegram";
import { extractImport, type ImportArgs } from "@/lib/services/import";
import { runBotAnalysis } from "@/lib/services/bot-analysis";

// Analysis + a few paced messages; allow headroom (Telegram retries on timeout).
export const maxDuration = 60;

const WELCOME = [
  "👋 <b>Hey, I'm Miku.</b>",
  "",
  "Forward me a message someone left you — or paste the chat, or send a screenshot — and I'll tell you what they're actually saying and how you could reply.",
  "",
  "If I'm missing context, I'll just ask. 🔮",
].join("\n");

// ── Lightweight per-chat threading ───────────────────────────────────────────
// When Miku asks a clarifying question we stash the original messages so the
// user's next reply feeds back into the read. In-memory (Fluid Compute keeps
// instances warm across a back-and-forth); falls back gracefully on a cold hit.
type Pending = { messages: { sender: string; body: string }[]; at: number };
const pending = new Map<number, Pending>();
const PENDING_TTL = 10 * 60 * 1000;

function takePending(chatId: number): Pending | null {
  const p = pending.get(chatId);
  pending.delete(chatId);
  if (!p || Date.now() - p.at > PENDING_TTL) return null;
  return p;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function beat(chatId: number) {
  await sendTyping(chatId);
  await sleep(650);
}

// Turn whatever the user sent (typed, forwarded, or a screenshot) into the
// {sender, body}[] shape the engine expects. Reuses the import service for
// transcript parsing + OCR; falls back to a single message.
async function toMessages(
  input: ImportArgs,
  forwardName?: string
): Promise<{ sender: string; body: string }[]> {
  try {
    const extracted = await extractImport(input);
    if (extracted.messages.length) return extracted.messages;
  } catch (e) {
    console.error("extractImport failed, falling back to raw text", e);
  }
  if (input.text) return [{ sender: forwardName ?? "Them", body: input.text }];
  return [];
}

function forwardSenderName(msg: TgMessage): string | undefined {
  const o = msg.forward_origin;
  if (!o) return undefined;
  return (
    o.sender_user?.first_name ?? o.sender_user?.username ?? o.sender_user_name ?? o.chat?.title
  );
}

// Deliver the read like a friend texting: a few short messages, not one wall.
async function deliverAnalysis(
  chatId: number,
  a: Awaited<ReturnType<typeof runBotAnalysis>>
) {
  if (a.vibe_read) {
    await sendMessage(chatId, esc(a.vibe_read));
    await beat(chatId);
  }
  if (a.reality_check) {
    await sendMessage(chatId, esc(a.reality_check));
    await beat(chatId);
  }

  const opts = a.response_options.filter((o) => o.draft);
  if (opts.length) {
    const lead = a.language === "zh" ? "你可以这样回 👇" : "here's a few ways you could reply 👇";
    await sendMessage(chatId, lead);
    for (const o of opts) {
      // Tone as a small label; the draft stays plain so it's easy to copy.
      await sendMessage(chatId, `<i>${esc(o.tone)}</i>\n${esc(o.draft)}`);
      await sleep(450);
    }
    await beat(chatId);
  }

  if (a.verdict) await sendMessage(chatId, `⚖️ ${esc(a.verdict)}`);
}

async function handleMessage(msg: TgMessage) {
  const chatId = msg.chat.id;
  const text = msg.text ?? msg.caption;

  if (text && /^\/(start|help)\b/.test(text.trim())) {
    pending.delete(chatId);
    await sendMessage(chatId, WELCOME);
    return;
  }

  // Build engine input from a photo (OCR) and/or text.
  const input: ImportArgs = {};
  if (msg.photo?.length) {
    const largest = msg.photo[msg.photo.length - 1];
    try {
      input.image = await downloadFileBase64(largest.file_id);
    } catch (e) {
      console.error("photo download failed", e);
    }
  }
  if (text) input.text = text;

  if (!input.text && !input.image) {
    await sendMessage(chatId, WELCOME);
    return;
  }

  await sendTyping(chatId);

  try {
    const prior = takePending(chatId);
    let baseMessages: { sender: string; body: string }[];
    let extraContext: string | undefined;

    if (prior) {
      // The user is answering Miku's clarifying question.
      baseMessages = prior.messages;
      extraContext = input.text ?? "(sent an image)";
    } else {
      baseMessages = await toMessages(input, forwardSenderName(msg));
      if (!baseMessages.length) {
        await sendMessage(
          chatId,
          "I couldn't find a message in that. Paste the text, forward it, or send a clear screenshot of the chat."
        );
        return;
      }
    }

    const analysis = await runBotAnalysis(baseMessages, extraContext);

    if (analysis.needs_context && analysis.clarifying_question) {
      pending.set(chatId, { messages: baseMessages, at: Date.now() });
      await sendMessage(chatId, esc(analysis.clarifying_question));
      return;
    }

    await deliverAnalysis(chatId, analysis);
  } catch (e) {
    console.error("analysis failed", e);
    await sendMessage(chatId, "Something went wrong reading that. Mind trying again?");
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message ?? update.edited_message;
  if (msg) await handleMessage(msg).catch((e) => console.error("handler error", e));
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, bot: "miku-telegram" });
}
