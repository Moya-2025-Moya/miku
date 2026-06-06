"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage { id: string; sender: "me" | "them"; body: string; time: string; }
interface ResponseOption { tone: string; draft: string; }
interface AnalysisResult {
  vibe_read: string;
  reality_check: string;
  response_options: ResponseOption[];
  verdict: string;
  confidence: string;
  language?: string;
}
interface FollowUp { role: "user" | "assistant"; text: string; }

type Conf = "low" | "medium" | "high";
interface DemoPattern { label: string; detail: string; confidence: Conf; count: number; }
interface PastRead { verdict: string; confidence: Conf; when: string; }
interface DemoProfile {
  id: string;
  name: string;
  relationship: string;
  blurb: string;
  messages: ChatMessage[];
  patterns: DemoPattern[];
  history: PastRead[];
}

// ─── Demo library (per-relationship — the "memory" is real, just mocked) ───────

const PROFILES: DemoProfile[] = [
  {
    id: "jordan",
    name: "Jordan",
    relationship: "Friend",
    blurb: "“Maybe” is doing a lot of work here.",
    messages: [
      { id: "j1", sender: "them", body: "hey are you free this weekend?",                           time: "2:14 PM" },
      { id: "j2", sender: "me",   body: "yeah should be! what did you have in mind?",                time: "2:15 PM" },
      { id: "j3", sender: "them", body: "idk maybe hang? haven't seen you in a while",               time: "2:16 PM" },
      { id: "j4", sender: "me",   body: "for sure, saturday works",                                  time: "2:17 PM" },
      { id: "j5", sender: "them", body: "oh actually i might have something saturday, let me check", time: "2:30 PM" },
      { id: "j6", sender: "them", body: "yeah probably can't do saturday. sunday maybe?",            time: "2:31 PM" },
      { id: "j7", sender: "me",   body: "sunday works too",                                          time: "2:32 PM" },
      { id: "j8", sender: "them", body: "cool i'll let you know",                                    time: "3:45 PM" },
    ],
    patterns: [
      { label: "Won't commit to a plan", detail: "Floats a hang, then walks back the specific day — 4 times now.", confidence: "high",   count: 4 },
      { label: "Goes vague when pinned", detail: "Switches to “maybe / i’ll let you know” the moment a day is set.", confidence: "medium", count: 3 },
      { label: "Reaches out, then stalls", detail: "Initiates warmly but lets it fizzle without closing the loop.",  confidence: "low",    count: 2 },
    ],
    history: [
      { verdict: "“I’ll let you know” is a no with a smile.",     confidence: "high",   when: "now" },
      { verdict: "They want credit for asking, not the plan.",    confidence: "medium", when: "last week" },
      { verdict: "Not flaky about you — flaky about commitment.", confidence: "medium", when: "2 weeks ago" },
    ],
  },
  {
    id: "sarah",
    name: "Sarah",
    relationship: "Coworker",
    blurb: "“Just circling back 🙂” — the smile is a weapon.",
    messages: [
      { id: "s1", sender: "them", body: "Just circling back on the deck — did you get a chance? 🙂",    time: "9:02 AM" },
      { id: "s2", sender: "me",   body: "morning! yep sending it over by noon",                         time: "9:14 AM" },
      { id: "s3", sender: "them", body: "Great, because I told leadership it’d be ready first thing.",   time: "9:15 AM" },
      { id: "s4", sender: "them", body: "No worries though! Whatever works for you 🙂",                  time: "9:15 AM" },
      { id: "s5", sender: "me",   body: "noon should be fine",                                           time: "9:20 AM" },
      { id: "s6", sender: "them", body: "Perfect. I’ll just let them know there’s a delay on your end.", time: "9:21 AM" },
    ],
    patterns: [
      { label: "Weaponized politeness", detail: "Smiley + “no worries” paired with a deadline she invented.", confidence: "high",   count: 5 },
      { label: "Builds a paper trail",  detail: "Frames things so any slip lands as “your end.”",            confidence: "high",   count: 3 },
      { label: "Manufactures urgency",  detail: "Cites leadership / timelines that weren’t actually agreed.",  confidence: "medium", count: 2 },
    ],
    history: [
      { verdict: "“No worries” is on the record so the worry is yours.", confidence: "high", when: "now" },
      { verdict: "She’s not asking — she’s documenting.",                confidence: "high", when: "3 days ago" },
    ],
  },
  {
    id: "alex",
    name: "Alex",
    relationship: "Dating",
    blurb: "Warm at midnight, gone by morning.",
    messages: [
      { id: "a1", sender: "them", body: "had such a good time the other night 🥹", time: "11:48 PM" },
      { id: "a2", sender: "me",   body: "me too!! we should do it again soon",      time: "11:50 PM" },
      { id: "a3", sender: "them", body: "for sure 💛",                              time: "11:51 PM" },
      { id: "a4", sender: "me",   body: "free this thurs?",                         time: "9:30 AM" },
      { id: "a5", sender: "them", body: "ahh this week’s kinda crazy, lemme see",   time: "1:12 PM" },
      { id: "a6", sender: "them", body: "miss your face tho",                       time: "12:06 AM" },
    ],
    patterns: [
      { label: "Breadcrumbing", detail: "Affection late at night, evasive about actual plans by day.",   confidence: "high",   count: 4 },
      { label: "Warm words, no dates", detail: "“We should” / “miss you” never resolves to a real time.", confidence: "high",   count: 3 },
      { label: "Resets the clock", detail: "Goes cold, then revives with a low-effort sweet text.",        confidence: "medium", count: 2 },
    ],
    history: [
      { verdict: "“Miss your face” at midnight isn’t a plan — it’s a placeholder.", confidence: "high",   when: "now" },
      { verdict: "Into the feeling of you, not the logistics of you.",             confidence: "medium", when: "5 days ago" },
    ],
  },
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  ink: "#1c1917", ink2: "#57534e", ink3: "#8b857e",
  line: "#ece7df", line2: "#f3efe8",
  surface: "#ffffff", canvas: "#f6f2ec", sidebar: "#fbf8f3",
  teal: "#0f766e", tealDk: "#0b5c55", tealSoft: "#e6f2f0",
  coral: "#e07a59", coralSoft: "#fbeee8",
  amber: "#d9a441",
};

const MIKU = "/miku-cutout.png";

// ─── Icons (one consistent line set — no emoji) ────────────────────────────────

const PATHS: Record<string, string> = {
  back:    "M15 18l-6-6 6-6",
  close:   "M6 6l12 12M18 6L6 18",
  send:    "M12 20V5M6 11l6-6 6 6",
  copy:    "M9 9h9v9H9zM5 15V6a1 1 0 011-1h8",
  share:   "M12 16V4M8 8l4-4 4 4M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6",
  spark:   "M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z",
  eye:     "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z",
  lens:    "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-3.6-3.6",
  reply:   "M21 11.5a8 8 0 01-11.6 7.1L4 20l1.4-5.3A8 8 0 1121 11.5z",
  bolt:    "M13 2L5 13h6l-1 9 9-12h-6l1-8z",
  memory:  "M12 8v4l2.5 2M12 4a8 8 0 100 16 8 8 0 000-16z",
  plus:    "M12 5v14M5 12h14",
  check:   "M20 6L9 17l-5-5",
  chevron: "M9 6l6 6-6 6",
};

function Icon({ name, size = 18, stroke = 1.8, fill = false, style }: { name: string; size?: number; stroke?: number; fill?: boolean; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

function ConfDots({ level, on = C.teal }: { level: string; on?: string }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span style={{ display: "inline-flex", gap: 3 }} title={`${level} confidence`}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: 99, background: i <= n ? on : "rgba(0,0,0,0.12)" }} />
      ))}
    </span>
  );
}

function MikuBadge({ size = 40 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#fff", border: `1.5px solid ${C.line}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MIKU} alt="Miku" width={size} height={size} style={{ width: "118%", height: "118%", objectFit: "cover", objectPosition: "center 30%" }} />
    </div>
  );
}

// ─── Streaming helpers (progressive reveal of the JSON analysis) ────────────────

function extractJsonString(buf: string, field: string): string | undefined {
  const at = buf.indexOf(`"${field}"`);
  if (at === -1) return undefined;
  let i = at + field.length + 2;
  while (i < buf.length && buf[i] !== ":") i++;
  i++;
  while (i < buf.length && /\s/.test(buf[i]!)) i++;
  if (buf[i] !== '"') return undefined;
  i++;
  let out = "";
  while (i < buf.length) {
    const c = buf[i]!;
    if (c === "\\") { const nx = buf[i + 1]; if (nx === undefined) break; out += ({ n: "\n", t: "\t", r: "\r" } as Record<string, string>)[nx] ?? nx; i += 2; continue; }
    if (c === '"') return out;
    out += c; i++;
  }
  return out;
}
function parsePartialAnalysis(buf: string): AnalysisResult {
  return {
    vibe_read:     extractJsonString(buf, "vibe_read") ?? "",
    reality_check: extractJsonString(buf, "reality_check") ?? "",
    response_options: [],
    verdict:       extractJsonString(buf, "verdict") ?? "",
    confidence:    extractJsonString(buf, "confidence") ?? "low",
    language:      extractJsonString(buf, "language") ?? "en",
  };
}

function avatarBg(id: string): string {
  const map: Record<string, string> = {
    jordan: "linear-gradient(135deg,#0f766e,#14b8a6)",
    sarah:  "linear-gradient(135deg,#7c3aed,#a78bfa)",
    alex:   "linear-gradient(135deg,#e07a59,#f0a58a)",
  };
  return map[id] ?? "linear-gradient(135deg,#0f766e,#e07a59)";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [mview, setMview]                 = useState<"list" | "chat">("list");
  const [active, setActive]               = useState<DemoProfile>(PROFILES[0]);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [analysis, setAnalysis]           = useState<AnalysisResult | null>(null);
  const [tab, setTab]                     = useState<"read" | "memory">("memory");
  const [panelOpen, setPanelOpen]         = useState(false);
  const [shareOpen, setShareOpen]         = useState(false);
  const [loading, setLoading]             = useState(false);
  const [followUps, setFollowUps]         = useState<FollowUp[]>([]);
  const [chatInput, setChatInput]         = useState("");
  const [chatLoading, setChatLoading]     = useState(false);
  const [copied, setCopied]               = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const chatEndRef                        = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [followUps, chatLoading]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setShareOpen(false); setPanelOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  function openConversation(p: DemoProfile) {
    setActive(p); setSelected(new Set()); setAnalysis(null); setError(null);
    setFollowUps([]); setTab("memory"); setPanelOpen(false); setMview("chat");
  }

  function flash(key: string, text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  }

  async function analyze() {
    const msgs = active.messages.filter((m) => selected.has(m.id));
    if (!msgs.length) return;
    setLoading(true); setError(null); setAnalysis(null); setFollowUps([]);
    setTab("read"); setPanelOpen(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs.map((m) => ({ sender: m.sender, body: m.body })), stream: true }),
      });
      if (!res.ok || !res.body) {
        let m = "I couldn’t read that one. Try again?";
        try { m = (await res.json()).error ?? m; } catch {}
        setError(m); return;
      }
      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buffer = "", json = "", first = true; let final: AnalysisResult | null = null;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += dec.decode(value, { stream: true });
        const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.trim(); if (!line.startsWith("data:")) continue;
          const p = JSON.parse(line.slice(5).trim());
          if (p.text) { if (first) { setLoading(false); first = false; } json += p.text; setAnalysis(parsePartialAnalysis(json)); }
          else if (p.done && p.analysis) final = p.analysis as AnalysisResult;
          else if (p.error) { setError(p.error); setAnalysis(null); }
        }
      }
      if (final) setAnalysis(final);
    } catch {
      setError("Network hiccup. Check your connection and try again.");
      setAnalysis(null);
    } finally { setLoading(false); }
  }

  async function sendFollowUp() {
    if (!chatInput.trim() || !analysis) return;
    const text = chatInput.trim(); setChatInput("");
    const updated = [...followUps, { role: "user" as const, text }];
    setFollowUps(updated); setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated.map((m) => ({ role: m.role, content: m.text })), analysis_context: analysis, stream: true }),
      });
      if (!res.ok || !res.body) {
        let m = "Something glitched. One more time?";
        try { m = (await res.json()).error ?? m; } catch {}
        setFollowUps((p) => [...p, { role: "assistant", text: m }]); return;
      }
      setFollowUps((p) => [...p, { role: "assistant", text: "" }]);
      const setLast = (t: string) => setFollowUps((p) => { const c = [...p]; c[c.length - 1] = { role: "assistant", text: t }; return c; });
      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buffer = "", acc = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += dec.decode(value, { stream: true });
        const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.trim(); if (!line.startsWith("data:")) continue;
          const p = JSON.parse(line.slice(5).trim());
          if (p.text) { acc += p.text; setLast(acc); }
          else if (p.error && !acc) setLast("Something glitched. One more time?");
        }
      }
      if (!acc) setLast("…no reply came through.");
    } catch {
      setFollowUps((p) => [...p, { role: "assistant", text: "Network hiccup — try again." }]);
    } finally { setChatLoading(false); }
  }

  const prevSender = (i: number) => (i > 0 ? active.messages[i - 1].sender : null);
  const nextSender = (i: number) => (i < active.messages.length - 1 ? active.messages[i + 1].sender : null);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="sr-app" data-mview={mview} data-panel={panelOpen ? "open" : "closed"}>

      {/* ── Left: conversation list ──────────────────────────────────────── */}
      <aside className="sr-sidebar">
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
          <MikuBadge size={38} />
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>ScreenRead</div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>Miku reads the subtext</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 8px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.ink3 }}>People</span>
          <span style={{ fontSize: 11.5, color: C.ink3 }}>{PROFILES.length}</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 9px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {PROFILES.map((p) => {
            const isActive = active.id === p.id;
            return (
              <button key={p.id} className={`sr-convo${isActive ? " is-active" : ""}`} onClick={() => openConversation(p)} aria-pressed={isActive}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: avatarBg(p.id), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 17 }}>
                  {p.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5, color: C.ink }}>{p.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.teal }}>{p.relationship}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.blurb}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "10px 14px 16px", borderTop: `1px solid ${C.line}` }}>
          <button
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 14px", borderRadius: 12, border: `1.5px dashed ${C.teal}55`, background: "transparent", color: C.teal, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            onClick={() => flash("import", "demo")}
            title="Demo placeholder"
          >
            <Icon name="plus" size={16} /> Add someone · paste / screenshot
          </button>
          {copied === "import" && <div style={{ fontSize: 11, color: C.ink3, textAlign: "center", marginTop: 6 }}>Capture is wired on the backend — UI coming soon.</div>}
          <a
            href="/relationship-library.html"
            style={{ marginTop: 8, width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.surface, color: C.teal, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            <Icon name="memory" size={16} /> Open Memory Library
          </a>
        </div>
      </aside>

      {/* ── Center: chat ─────────────────────────────────────────────────── */}
      <main className="sr-chat">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${C.line}`, background: C.surface, gap: 11, flexShrink: 0 }}>
          <button className="sr-back sr-iconbtn" onClick={() => { setMview("list"); setPanelOpen(false); }} aria-label="Back to people" style={{ width: 30, height: 34, color: C.teal }}>
            <Icon name="back" size={20} />
          </button>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarBg(active.id), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
            {active.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15.5, color: C.ink, lineHeight: 1.15 }}>{active.name}</div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 1 }}>{active.relationship} · {active.patterns.length} patterns learned</div>
          </div>
          <button className="sr-mem-btn sr-iconbtn" onClick={() => { setTab("memory"); setPanelOpen(true); }} aria-label="Open Miku’s memory" style={{ color: C.teal }}>
            <Icon name="memory" size={20} />
          </button>
        </div>

        {/* Thread */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px max(18px, calc((100% - 680px) / 2)) 104px", display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", margin: "2px 0 16px" }}>
            <span style={{ fontSize: 11, color: C.ink3, background: C.line2, padding: "5px 12px", borderRadius: 99 }}>
              Imported conversation · tap messages to pick what Miku reads
            </span>
          </div>
          {active.messages.map((msg, idx) => {
            const isMe = msg.sender === "me", isSel = selected.has(msg.id);
            const isFirst = prevSender(idx) !== msg.sender, isLast = nextSender(idx) !== msg.sender;
            return (
              <button
                key={msg.id}
                onClick={() => toggle(msg.id)}
                aria-pressed={isSel}
                style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", cursor: "pointer", marginTop: isFirst ? 10 : 2, marginBottom: isLast ? 2 : 1, background: "none", border: "none", padding: 0, width: "100%" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: "min(80%, 480px)" }}>
                  {!isMe && isSel && <span className="check-pop" style={{ width: 18, height: 18, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}><Icon name="check" size={11} stroke={3} /></span>}
                  <span style={{
                    padding: "9px 14px", textAlign: "left",
                    borderRadius: isMe ? `18px 18px ${isLast ? 5 : 18}px 18px` : `18px 18px 18px ${isLast ? 5 : 18}px`,
                    background: isSel ? (isMe ? C.tealDk : C.tealSoft) : (isMe ? C.teal : "#fff"),
                    color: isMe ? "#fff" : C.ink, border: isMe ? "none" : `1px solid ${C.line}`,
                    fontSize: 14.5, lineHeight: 1.45, userSelect: "none",
                    boxShadow: isSel ? `0 2px 10px ${C.teal}33` : "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "background 0.15s, box-shadow 0.15s",
                  }}>{msg.body}</span>
                  {isMe && isSel && <span className="check-pop" style={{ width: 18, height: 18, borderRadius: "50%", background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.teal, flexShrink: 0 }}><Icon name="check" size={11} stroke={3} /></span>}
                </span>
                {isLast && <span style={{ fontSize: 10, color: C.ink3, marginTop: 3, ...(isMe ? { marginRight: 6 } : { marginLeft: 6 }) }}>{msg.time}</span>}
              </button>
            );
          })}
        </div>

        {/* Persistent action bar */}
        <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", width: "min(92%, 440px)", zIndex: 20 }}>
          <button
            onClick={analyze}
            disabled={selected.size === 0 || loading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
              padding: "14px 18px", borderRadius: 16,
              background: selected.size > 0 ? `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDk} 100%)` : "#fff",
              color: selected.size > 0 ? "#fff" : C.ink3,
              boxShadow: selected.size > 0 ? `0 10px 30px ${C.teal}44` : "0 2px 10px rgba(0,0,0,0.06)",
              border: selected.size > 0 ? "none" : `1px solid ${C.line}`,
              cursor: selected.size > 0 && !loading ? "pointer" : "default",
              fontSize: 15, fontWeight: 600, transition: "all 0.18s ease",
            }}
          >
            {loading ? <><span className="spin" style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%" }} /> Reading…</>
              : selected.size > 0 ? <><Icon name="spark" size={18} fill /> Ask Miku to read {selected.size}</>
              : <>Select messages to get a read</>}
          </button>
        </div>
      </main>

      {/* ── Right: Miku panel (desktop column / mobile bottom sheet) ──────── */}
      <aside className="sr-aside">
        <div className="sr-sheet-handle" style={{ justifyContent: "center", padding: "8px 0 2px" }}>
          <span style={{ width: 38, height: 4, borderRadius: 99, background: "rgba(0,0,0,0.16)" }} />
        </div>

        {/* Panel header + tabs */}
        <div style={{ position: "sticky", top: 0, background: C.surface, zIndex: 5, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 18px 12px" }}>
            <MikuBadge size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 17, color: C.ink, lineHeight: 1.1 }}>Miku</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>on {active.name} · powered by Claude</div>
            </div>
            <button className="sr-sheet-close sr-iconbtn" onClick={() => setPanelOpen(false)} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </div>
          <div style={{ display: "flex", padding: "0 12px" }}>
            <button className={`sr-tab${tab === "read" ? " is-active" : ""}`} onClick={() => setTab("read")}><Icon name="spark" size={14} fill={tab === "read"} /> Read</button>
            <button className={`sr-tab${tab === "memory" ? " is-active" : ""}`} onClick={() => setTab("memory")}><Icon name="memory" size={14} /> Memory · {active.patterns.length}</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "memory" ? (
            <MemoryView profile={active} />
          ) : (
            <ReadView
              loading={loading} error={error} analysis={analysis}
              onRetry={() => setError(null)}
              copied={copied} flash={flash}
              onShare={() => setShareOpen(true)}
              followUps={followUps} chatLoading={chatLoading} chatEndRef={chatEndRef}
              chatInput={chatInput} setChatInput={setChatInput} sendFollowUp={sendFollowUp}
            />
          )}
        </div>
      </aside>

      {/* Mobile scrim */}
      <div className="sr-scrim" onClick={() => setPanelOpen(false)} aria-hidden="true" />

      {/* Share card */}
      {shareOpen && analysis && (
        <ShareCard analysis={analysis} who={active.name} onClose={() => setShareOpen(false)} copied={copied} flash={flash} />
      )}
    </div>
  );
}

// ─── Memory view — the relationship dossier (the moat, made visible) ────────────

function MemoryView({ profile }: { profile: DemoProfile }) {
  return (
    <div className="fade-in" style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <section>
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.ink3, margin: "0 0 10px" }}>What I’ve noticed</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {profile.patterns.map((p, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{p.label}</span>
                <ConfDots level={p.confidence} />
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.55, color: C.ink2, margin: "5px 0 0" }}>{p.detail}</p>
              <div style={{ fontSize: 10.5, color: C.ink3, marginTop: 7, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: C.coral }} />
                seen {p.count}× · confidence grows each time it repeats
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.ink3, margin: "0 0 10px" }}>Past reads</h3>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {profile.history.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 11, paddingBottom: i === profile.history.length - 1 ? 0 : 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: i === 0 ? C.teal : "rgba(0,0,0,0.18)", marginTop: 4 }} />
                {i !== profile.history.length - 1 && <span style={{ width: 1.5, flex: 1, background: C.line, marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "Fraunces, serif", fontSize: 14, lineHeight: 1.4, color: C.ink, margin: 0 }}>“{h.verdict}”</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                  <ConfDots level={h.confidence} />
                  <span style={{ fontSize: 11, color: C.ink3 }}>{h.when}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p style={{ fontSize: 11.5, lineHeight: 1.6, color: C.ink3, textAlign: "center", margin: "4px 12px 0" }}>
        Every read on {profile.name} sharpens the next one. That’s the whole point.
      </p>
      <a
        href={`/relationship-library.html?person=${encodeURIComponent(profile.name)}`}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 4, padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.surface, color: C.teal, fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}
      >
        <Icon name="memory" size={15} /> Open {profile.name}’s full library
      </a>
    </div>
  );
}

// ─── Read view — current analysis ──────────────────────────────────────────────

function ReadView(props: {
  loading: boolean; error: string | null; analysis: AnalysisResult | null;
  onRetry: () => void; copied: string | null; flash: (k: string, t: string) => void;
  onShare: () => void;
  followUps: FollowUp[]; chatLoading: boolean; chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatInput: string; setChatInput: (v: string) => void; sendFollowUp: () => void;
}) {
  const { loading, error, analysis } = props;

  if (error) {
    return (
      <div className="fade-in" style={{ padding: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.coral, marginBottom: 8 }}>Couldn’t read it</div>
          <p style={{ fontFamily: "Fraunces, serif", fontSize: 15, lineHeight: 1.55, color: C.ink, margin: "0 0 16px" }}>{error}</p>
          <button onClick={props.onRetry} style={{ padding: "9px 20px", borderRadius: 99, background: C.teal, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="fade-in" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.ink3, fontSize: 13 }}>
          <span className="spin" style={{ width: 15, height: 15, border: `2px solid ${C.line}`, borderTopColor: C.teal, borderRadius: "50%" }} /> Miku’s reading…
        </div>
        {[64, 78, 120].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />)}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "44px 30px", textAlign: "center", gap: 14, minHeight: 320 }}>
        <div className="floaty"><MikuBadge size={84} /></div>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Pick the messages that bug you</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: C.ink2, maxWidth: 250 }}>
            Tap the ones you can’t stop re-reading — I’ll tell you what’s actually going on.
          </div>
        </div>
      </div>
    );
  }

  const Card = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
    <div className="fade-up" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "14px 16px", animationDelay: `${delay}s` }}>{children}</div>
  );
  const Label = ({ icon, text, color }: { icon: string; text: string; color: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, color }}>
      <Icon name={icon} size={15} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{text}</span>
    </div>
  );

  return (
    <div style={{ padding: "14px 14px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <Card delay={0.02}>
        <Label icon="eye" text="Vibe read" color={C.teal} />
        <p style={{ fontFamily: "Fraunces, serif", fontSize: 14.5, lineHeight: 1.6, color: C.ink, margin: 0 }}>{analysis.vibe_read || <span className="skeleton" style={{ display: "inline-block", width: "90%", height: 14 }} />}</p>
      </Card>

      <Card delay={0.06}>
        <Label icon="lens" text="Reality check" color={C.coral} />
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: C.ink2, margin: 0 }}>{analysis.reality_check}</p>
      </Card>

      {analysis.response_options?.length > 0 && (
        <Card delay={0.1}>
          <Label icon="reply" text="Replies you can send" color={C.ink2} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analysis.response_options.map((opt, i) => {
              const done = props.copied === `draft-${i}`;
              return (
                <button key={i} onClick={() => props.flash(`draft-${i}`, opt.draft)} style={{ textAlign: "left", borderRadius: "0 12px 12px 0", padding: "10px 12px", background: C.tealSoft + "80", cursor: "pointer", border: "none", borderLeft: `3px solid ${C.teal}`, width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, textTransform: "capitalize", letterSpacing: "0.04em" }}>{opt.tone}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: done ? C.teal : C.ink3, fontWeight: done ? 600 : 500 }}>
                      {done ? <><Icon name="check" size={12} stroke={3} /> copied</> : <><Icon name="copy" size={12} /> copy</>}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: C.ink }}>{opt.draft}</div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Verdict */}
      <div className="fade-up" style={{ borderRadius: 18, padding: 18, background: `linear-gradient(140deg, ${C.teal} 0%, ${C.tealDk} 100%)`, boxShadow: `0 12px 30px ${C.teal}40`, animationDelay: "0.14s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.6)" }}><Icon name="bolt" size={14} fill /><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Verdict</span></span>
          {analysis.verdict && (
            <button onClick={props.onShare} aria-label="Share verdict" style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.16)", border: "none", color: "#fff", borderRadius: 99, padding: "5px 11px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              <Icon name="share" size={13} /> Share
            </button>
          )}
        </div>
        <p style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, color: "#fff", lineHeight: 1.35, margin: "0 0 14px" }}>{analysis.verdict || "…"}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ConfDots level={analysis.confidence} on="rgba(255,255,255,0.9)" />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", textTransform: "capitalize" }}>{analysis.confidence} confidence</span>
          </span>
          <button onClick={() => props.flash("verdict", analysis.verdict)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: props.copied === "verdict" ? "#86efac" : "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {props.copied === "verdict" ? <><Icon name="check" size={12} stroke={3} /> copied</> : <><Icon name="copy" size={12} /> copy</>}
          </button>
        </div>
      </div>

      {/* Follow-up */}
      <Card delay={0.18}>
        <Label icon="spark" text="Ask a follow-up" color={C.ink2} />
        {props.followUps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
            {props.followUps.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%", background: m.role === "user" ? C.teal : C.canvas, color: m.role === "user" ? "#fff" : C.ink, borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px", padding: "8px 12px", fontSize: 13, lineHeight: 1.5 }}>{m.text || "…"}</div>
            ))}
            {props.chatLoading && <div style={{ alignSelf: "flex-start", color: C.ink3, padding: "4px 10px", fontSize: 18 }}>···</div>}
            <div ref={props.chatEndRef} />
          </div>
        )}
        <div style={{ display: "flex", gap: 8, background: C.canvas, borderRadius: 14, padding: "4px 4px 4px 14px", border: `1px solid ${C.line}` }}>
          <input
            value={props.chatInput}
            onChange={(e) => props.setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && props.sendFollowUp()}
            placeholder="“but what if I’m overthinking it?”"
            disabled={props.chatLoading}
            aria-label="Ask Miku a follow-up"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: C.ink, padding: "8px 0" }}
          />
          <button onClick={props.sendFollowUp} disabled={props.chatLoading || !props.chatInput.trim()} aria-label="Send" style={{ width: 34, height: 34, borderRadius: 10, background: props.chatInput.trim() ? C.teal : "#e7e2da", color: "#fff", border: "none", cursor: props.chatInput.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Share card — the viral artifact ────────────────────────────────────────────

function ShareCard({ analysis, who, onClose, copied, flash }: { analysis: AnalysisResult; who: string; onClose: () => void; copied: string | null; flash: (k: string, t: string) => void }) {
  return (
    <div className="fade-in" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(28,25,23,0.55)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fade-up" onClick={(e) => e.stopPropagation()} style={{ width: "min(100%, 380px)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ borderRadius: 24, overflow: "hidden", background: `linear-gradient(150deg, ${C.teal} 0%, ${C.tealDk} 70%, #08433d 100%)`, boxShadow: "0 30px 70px rgba(0,0,0,0.4)", padding: "26px 24px 22px", position: "relative" }}>
          <div style={{ position: "absolute", top: -14, right: -10, opacity: 0.16, pointerEvents: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MIKU} alt="" width={150} height={150} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <MikuBadge size={30} />
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, color: "#fff" }}>ScreenRead</span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>Miku’s verdict</div>
          <p style={{ fontFamily: "Fraunces, serif", fontSize: 25, fontWeight: 600, lineHeight: 1.3, color: "#fff", margin: "0 0 22px" }}>“{analysis.verdict}”</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 14 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>on {who}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <ConfDots level={analysis.confidence} on="rgba(255,255,255,0.9)" />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "capitalize" }}>{analysis.confidence}</span>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => flash("share-copy", `“${analysis.verdict}” — Miku on ${who} · ScreenRead`)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px", borderRadius: 14, border: "none", background: "#fff", color: C.ink, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {copied === "share-copy" ? <><Icon name="check" size={16} stroke={3} /> Copied</> : <><Icon name="copy" size={16} /> Copy verdict</>}
          </button>
          <button onClick={onClose} aria-label="Close" style={{ width: 50, borderRadius: 14, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: "center", margin: 0 }}>Screenshot it. That’s the flex.</p>
      </div>
    </div>
  );
}
