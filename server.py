"""
ScreenRead · Miku backend
Run:  python server.py
Requires: pip install anthropic fastapi uvicorn
Set:  ANTHROPIC_API_KEY in env (or .env file)
"""

import os, json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import anthropic

# ── Client ──────────────────────────────────────────────────────────────────
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

app = FastAPI(title="ScreenRead · Miku")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # fine for local hackathon demo
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Jordan relationship context (pre-baked for demo) ─────────────────────────
JORDAN_PROFILE = """
Relationship: Jordan — close friend / potential romantic interest, known 3 months.
Past pattern: This is the second time this month Jordan confirmed plans then
pulled back with short replies. Last instance: a cinema trip two weeks ago,
similar sequence (enthusiastic → "might be busy" → reassurance to "not worry").
No direct confrontation has happened. User tends to immediately reassure Jordan.
"""

SYSTEM_PROMPT = """You are Miku — an emotionally intelligent AI embedded inside a messaging app called ScreenRead (by Zymix). You help users understand social dynamics in their conversations.

You are warm, direct, and non-judgmental. You read subtext carefully. You never catastrophise and you never dismiss concerns. Your tone is like a perceptive, honest best friend — not a therapist.

When asked to analyse messages you ALWAYS respond with valid JSON matching this exact schema:
{
  "pattern": "one sentence about the observed pattern in this relationship",
  "vibe_read": "2-3 sentences. What is the other person actually communicating — tone, intent, subtext.",
  "reality_check": {
    "facts": "what the messages literally say",
    "story": "the interpretation or assumption the user may be running",
    "verdict": "2 sentences. Is the reaction proportionate? What's ambiguous?"
  },
  "response_options": [
    { "tone": "Casual",          "text": "draft reply" },
    { "tone": "Direct",         "text": "draft reply" },
    { "tone": "Boundary-setting","text": "draft reply" }
  ],
  "shareable_verdict": "one punchy, screenshot-worthy summary sentence",
  "confidence": "low | medium | high"
}

Return ONLY the JSON object — no markdown fences, no preamble.
"""

FOLLOWUP_SYSTEM = """You are Miku — an emotionally intelligent AI reading between the lines of a chat conversation for the user.

You've already completed an analysis. The user is now asking a follow-up question. Be warm, concise (2-4 sentences max), and use plain HTML for emphasis — <b>bold</b> and <i>italic</i> only. No bullet lists. Speak as a perceptive friend, not a therapist. Never overclaim; acknowledge ambiguity. Address the user's specific question directly.

Relationship context:
""" + JORDAN_PROFILE


# ── Request models ────────────────────────────────────────────────────────────
class Message(BaseModel):
    who: str   # "in" | "out"
    t: str
    text: str

class AnalyzeRequest(BaseModel):
    messages: list[Message]        # full convo for context
    selected_indices: list[int]    # which ones the user picked

class ChatRequest(BaseModel):
    question: str
    prior_analysis: Optional[str] = None   # JSON string of the last analysis


# ── /analyze ─────────────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    selected = [req.messages[i] for i in req.selected_indices]
    all_msgs = req.messages

    # Build readable transcript
    def label(who): return "Jordan" if who == "in" else "You"
    full_transcript = "\n".join(f"[{m.t}] {label(m.who)}: {m.text}" for m in all_msgs)
    selected_text   = "\n".join(f"{label(m.who)}: {m.text}" for m in selected)

    user_content = f"""Relationship context:
{JORDAN_PROFILE}

Full conversation (for context):
{full_transcript}

Messages the user selected for analysis:
{selected_text}

Analyse these selected messages and return the JSON object."""

    resp = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1200,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    # Extract text block
    text = next((b.text for b in resp.content if hasattr(b, "text")), "{}")

    # Validate it's JSON
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Fallback — strip any accidental fences
        import re
        cleaned = re.sub(r"```[a-z]*\n?", "", text).strip()
        data = json.loads(cleaned)

    return data


# ── /chat ─────────────────────────────────────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest):
    messages = [{"role": "user", "content": req.question}]
    if req.prior_analysis:
        messages = [
            {"role": "user",      "content": f"Here is the analysis you just gave me:\n{req.prior_analysis}"},
            {"role": "assistant", "content": "Got it — I remember the analysis. What's on your mind?"},
            {"role": "user",      "content": req.question},
        ]

    resp = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=300,
        thinking={"type": "adaptive"},
        system=FOLLOWUP_SYSTEM,
        messages=messages,
    )

    text = next((b.text for b in resp.content if hasattr(b, "text")), "I'm here — say more?")
    return {"reply": text}


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
