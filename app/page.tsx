"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  sender: "me" | "them";
  body: string;
  time: string;
}

interface ResponseOption {
  tone: string;
  draft: string;
}

interface AnalysisResult {
  vibe_read: string;
  reality_check: string;
  response_options: ResponseOption[];
  verdict: string;
  confidence: string;
  language?: string;
}

interface FollowUp {
  role: "user" | "assistant";
  text: string;
}

interface Profile {
  id: string;
  name: string;
  relationship_type?: string | null;
  avatar_emoji?: string | null;
  tagline?: string;
}

// Seed library so the homepage looks alive before Supabase has data / when it's
// not configured. Real profiles from the API are merged on top by name.
const DEMO_PROFILES: Profile[] = [
  { id: "demo-jordan", name: "Jordan", relationship_type: "friend",   avatar_emoji: "🙂", tagline: "Keeps rescheduling — what's the read?" },
  { id: "demo-sarah",  name: "Sarah",  relationship_type: "coworker", avatar_emoji: "💼", tagline: "Passive-aggressive Slack energy" },
  { id: "demo-alex",   name: "Alex",   relationship_type: "dating",   avatar_emoji: "💘", tagline: "Hot and cold since last week" },
];

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

// ─── Demo conversation ────────────────────────────────────────────────────────

const DEMO: ChatMessage[] = [
  { id: "1", sender: "them", body: "hey are you free this weekend?",                          time: "2:14 PM" },
  { id: "2", sender: "me",   body: "yeah should be! what did you have in mind?",              time: "2:15 PM" },
  { id: "3", sender: "them", body: "idk maybe hang? haven't seen you in a while",             time: "2:16 PM" },
  { id: "4", sender: "me",   body: "for sure, saturday works",                                time: "2:17 PM" },
  { id: "5", sender: "them", body: "oh actually i might have something saturday, let me check", time: "2:30 PM" },
  { id: "6", sender: "them", body: "yeah probably can't do saturday. sunday maybe?",          time: "2:31 PM" },
  { id: "7", sender: "me",   body: "sunday works too",                                        time: "2:32 PM" },
  { id: "8", sender: "them", body: "cool i'll let you know",                                  time: "3:45 PM" },
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  teal:     "#0f766e",
  tealDark: "#065f46",
  tealBg:   "#f0fdf4",
  coral:    "#e8896b",
  cream:    "#fbf6ef",
  gray:     "#ececec",
  text:     "#111827",
  sub:      "#374151",
  muted:    "#6b7280",
  purple:   "#7c3aed",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toneColor(tone: string): string {
  const t = tone.toLowerCase();
  if (t.includes("casual"))   return C.teal;
  if (t.includes("direct"))   return C.coral;
  if (t.includes("boundary")) return C.purple;
  return C.teal;
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatusBar() {
  const [time, setTime] = useState("9:41");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    setTime(fmt());
    const t = setInterval(() => setTime(fmt()), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ height: 44, padding: "0 22px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{time}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <circle cx="8" cy="11" r="1.2" fill={C.text} />
          <path d="M4.8 7.8a4.5 4.5 0 0 1 6.4 0" stroke={C.text} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M2.2 5.1a8 8 0 0 1 11.6 0"    stroke={C.text} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {/* battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke={C.text} strokeWidth="1" />
          <rect x="2" y="2" width="16" height="8" rx="1.5" fill={C.text} />
          <path d="M22.5 4.5v3a1.5 1.5 0 0 0 0-3z" fill={C.text} opacity="0.45" />
        </svg>
      </div>
    </div>
  );
}

function ConfidenceBar({ level }: { level: string }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ width: 22, height: 5, borderRadius: 99, background: i <= n ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)" }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "capitalize" }}>
        {level}
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [view, setView]                   = useState<"home" | "chat">("home");
  const [profiles, setProfiles]           = useState<Profile[]>(DEMO_PROFILES);
  const [active, setActive]               = useState<Profile | null>(null);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [analysis, setAnalysis]           = useState<AnalysisResult | null>(null);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [loading, setLoading]             = useState(false);
  const [followUps, setFollowUps]         = useState<FollowUp[]>([]);
  const [chatInput, setChatInput]         = useState("");
  const [chatLoading, setChatLoading]     = useState(false);
  const [copiedVerdict, setCopiedVerdict] = useState(false);
  const [copiedDraft, setCopiedDraft]     = useState<number | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const chatEndRef                        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hdr = { "Content-Type": "application/json", "x-user-id": "demo-user" };
    (async () => {
      try {
        const res = await fetch("/api/profiles", { headers: hdr });
        const list = await res.json();
        let real: Profile[] = Array.isArray(list) ? list : [];

        // Ensure a real "Jordan" so the headline demo archives/learns for real.
        if (!real.some((p) => p.name === "Jordan")) {
          const created = await fetch("/api/profiles", {
            method:  "POST",
            headers: hdr,
            body:    JSON.stringify({ name: "Jordan", relationship_type: "friend", avatar_emoji: "🙂" }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          if (created?.id) real = [created, ...real];
        }

        // Merge in any demo relationships not already backed by a real profile.
        const names = new Set(real.map((p) => p.name));
        const merged = [...real, ...DEMO_PROFILES.filter((d) => !names.has(d.name))];
        setProfiles(merged.length ? merged : DEMO_PROFILES);
      } catch {
        setProfiles(DEMO_PROFILES);
      }
    })();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [followUps]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  function openChat(p: Profile) {
    setActive(p);
    setSelected(new Set());
    setAnalysis(null);
    setError(null);
    setPanelOpen(false);
    setFollowUps([]);
    setView("chat");
  }

  function goHome() {
    setView("home");
    setPanelOpen(false);
    setSelected(new Set());
  }

  async function analyze() {
    const msgs = DEMO.filter((m) => selected.has(m.id));
    if (!msgs.length) return;
    setLoading(true);
    setError(null);
    try {
      // Only archive/learn against a real (Supabase-backed) profile; seeded
      // demo cards fall back to stateless analysis.
      const realId = active && isUuid(active.id) ? active.id : null;
      const body: Record<string, unknown> = {
        messages: msgs.map((m) => ({ sender: m.sender, body: m.body })),
        ...(realId ? { profile_id: realId, archive: true } : {}),
      };
      const res  = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed. Please try again.");
        setAnalysis(null);
        setPanelOpen(true);
        return;
      }
      setAnalysis(data);
      setFollowUps([]);
      setPanelOpen(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setAnalysis(null);
      setPanelOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function sendFollowUp() {
    if (!chatInput.trim() || !analysis) return;
    const text    = chatInput.trim();
    setChatInput("");
    const updated = [...followUps, { role: "user" as const, text }];
    setFollowUps(updated);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages:         updated.map((m) => ({ role: m.role, content: m.text })),
          analysis_context: analysis,
          stream:           true,
        }),
      });
      if (!res.ok || !res.body) {
        let msg = "Something went wrong. Please try again.";
        try { msg = (await res.json()).error ?? msg; } catch {}
        setFollowUps((prev) => [...prev, { role: "assistant", text: msg }]);
        return;
      }

      // Stream the reply into a single assistant bubble as tokens arrive.
      setFollowUps((prev) => [...prev, { role: "assistant", text: "" }]);
      const setLast = (text: string) =>
        setFollowUps((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", text };
          return copy;
        });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.text) { acc += payload.text; setLast(acc); }
          else if (payload.error && !acc) setLast("Something went wrong. Please try again.");
        }
      }
      if (!acc) setLast("No response received.");
    } catch {
      setFollowUps((prev) => [...prev, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  function copyVerdict() {
    if (!analysis?.verdict) return;
    navigator.clipboard.writeText(analysis.verdict);
    setCopiedVerdict(true);
    setTimeout(() => setCopiedVerdict(false), 2000);
  }

  function copyDraft(i: number, draft: string) {
    navigator.clipboard.writeText(draft);
    setCopiedDraft(i);
    setTimeout(() => setCopiedDraft(null), 2000);
  }

  // group spacing helpers
  function prevSender(idx: number) { return idx > 0 ? DEMO[idx - 1].sender : null; }
  function nextSender(idx: number) { return idx < DEMO.length - 1 ? DEMO[idx + 1].sender : null; }

  // ─── Render ────────────────────────────────────────────────────────────────

  // Relationship library landing page (#8).
  if (view === "home") {
    return (
      <div className="sr-root">
        {/* Branding strip */}
        <div style={{ marginBottom: 26, textAlign: "center" }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 600, color: C.teal, letterSpacing: "-0.02em" }}>
            ScreenRead
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            by Miku · powered by Claude
          </div>
        </div>

        <div className="sr-home">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, color: C.text }}>
              Your relationships
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {profiles.length} {profiles.length === 1 ? "person" : "people"}
            </div>
          </div>

          <div className="sr-cards">
            {profiles.map((p) => {
              const initial = p.name.charAt(0).toUpperCase();
              return (
                <button key={p.id} className="sr-card" onClick={() => openChat(p)}>
                  <div
                    style={{
                      width:          48,
                      height:         48,
                      borderRadius:   "50%",
                      background:     `linear-gradient(135deg, ${C.teal} 0%, ${C.coral} 100%)`,
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      color:          "#fff",
                      fontWeight:     700,
                      fontSize:       20,
                      flexShrink:     0,
                    }}
                  >
                    {p.avatar_emoji || initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15.5, color: C.text }}>{p.name}</span>
                      {p.relationship_type && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: C.teal, background: `${C.teal}12`, padding: "2px 8px", borderRadius: 99, textTransform: "capitalize" }}>
                          {p.relationship_type}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.tagline ?? "Tap to read your conversation"}
                    </div>
                  </div>
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M1 1l6 6-6 6" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => openChat({ id: "demo-new", name: "New chat", relationship_type: null, avatar_emoji: "✦" })}
            style={{
              marginTop:    16,
              padding:      "14px 18px",
              borderRadius: 16,
              border:       `1.5px dashed ${C.teal}55`,
              background:   "transparent",
              color:        C.teal,
              fontSize:     14,
              fontWeight:   600,
              cursor:       "pointer",
              fontFamily:   "Inter, sans-serif",
            }}
          >
            + New relationship / import a screenshot
          </button>
        </div>
      </div>
    );
  }

  const activeName    = active?.name ?? "Jordan";
  const activeInitial = activeName.charAt(0).toUpperCase();

  return (
    <div className="sr-root">

      {/* Branding strip */}
      <div style={{ marginBottom: 22, textAlign: "center" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, color: C.teal, letterSpacing: "-0.02em" }}>
          ScreenRead
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
          by Miku · powered by Claude
        </div>
      </div>

      {/* Phone + panel row */}
      <div className="sr-stage">

        {/* ── Phone shell ──────────────────────────────────────────────── */}
        <div
          className="sr-phone"
          style={{
            background:    "#fff",
            borderRadius:  44,
            overflow:      "hidden",
            boxShadow:     "0 32px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.06)",
            border:        "1px solid rgba(0,0,0,0.07)",
            display:       "flex",
            flexDirection: "column",
            position:      "relative",
          }}
        >
          <StatusBar />

          {/* Chat header */}
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              padding:      "10px 16px",
              borderBottom: "1px solid #f3f3f3",
              background:   "#fff",
              gap:          10,
              flexShrink:   0,
            }}
          >
            <button onClick={goHome} title="Back to relationships" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}>
              <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
                <path d="M9 1L1 8.5 9 16" stroke={C.teal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Avatar with online dot */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width:          40,
                  height:         40,
                  borderRadius:   "50%",
                  background:     `linear-gradient(135deg, ${C.teal} 0%, #14b8a6 100%)`,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          "#fff",
                  fontWeight:     700,
                  fontSize:       17,
                }}
              >
                {active?.avatar_emoji || activeInitial}
              </div>
              <div
                style={{
                  position:     "absolute",
                  bottom:       1,
                  right:        1,
                  width:        11,
                  height:       11,
                  borderRadius: "50%",
                  background:   "#22c55e",
                  border:       "2.5px solid #fff",
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.text, lineHeight: 1.2 }}>{activeName}</div>
              <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 500, marginTop: 1 }}>Active now</div>
            </div>

            {/* Miku orb */}
            <div
              onClick={() => selected.size > 0 ? analyze() : setPanelOpen((v) => !v)}
              className={selected.size > 0 ? "pulse" : "breathe"}
              title={selected.size > 0 ? "Ask Miku" : "Open panel"}
              style={{
                width:          40,
                height:         40,
                borderRadius:   "50%",
                background:     `linear-gradient(135deg, ${C.teal} 0%, ${C.coral} 100%)`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                cursor:         "pointer",
                fontSize:       17,
                flexShrink:     0,
                color:          "#fff",
                boxShadow:      `0 3px 12px ${C.teal}44`,
              }}
            >
              ✦
            </div>
          </div>

          {/* Thread */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 82px", display: "flex", flexDirection: "column" }}>
            {DEMO.map((msg, idx) => {
              const isMe      = msg.sender === "me";
              const isSel     = selected.has(msg.id);
              const isFirst   = prevSender(idx) !== msg.sender;
              const isLast    = nextSender(idx) !== msg.sender;

              return (
                <div
                  key={msg.id}
                  onClick={() => toggle(msg.id)}
                  style={{
                    display:       "flex",
                    flexDirection: "column",
                    alignItems:    isMe ? "flex-end" : "flex-start",
                    cursor:        "pointer",
                    marginTop:     isFirst ? 8 : 2,
                    marginBottom:  isLast ? 2 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* checkmark left of "them" bubble */}
                    {!isMe && isSel && (
                      <div
                        className="check-pop"
                        style={{
                          width:          18,
                          height:         18,
                          borderRadius:   "50%",
                          background:     C.teal,
                          display:        "flex",
                          alignItems:     "center",
                          justifyContent: "center",
                          fontSize:       10,
                          color:          "#fff",
                          flexShrink:     0,
                        }}
                      >
                        ✓
                      </div>
                    )}

                    <div
                      style={{
                        maxWidth:     "76%",
                        padding:      "9px 14px",
                        borderRadius: isMe
                          ? `18px 18px ${isLast ? 5 : 18}px 18px`
                          : `18px 18px 18px ${isLast ? 5 : 18}px`,
                        background:   isSel
                          ? (isMe ? C.tealDark : "#dcfce7")
                          : (isMe ? C.teal     : C.gray),
                        color:        isMe ? "#fff" : C.text,
                        fontSize:     14.5,
                        lineHeight:   1.45,
                        transform:    isSel ? "scale(0.975)" : "scale(1)",
                        transition:   "all 0.15s ease",
                        userSelect:   "none",
                        boxShadow:    "0 1px 2px rgba(0,0,0,0.06)",
                      }}
                    >
                      {msg.body}
                    </div>

                    {/* checkmark right of "me" bubble */}
                    {isMe && isSel && (
                      <div
                        className="check-pop"
                        style={{
                          width:          18,
                          height:         18,
                          borderRadius:   "50%",
                          background:     "#dcfce7",
                          display:        "flex",
                          alignItems:     "center",
                          justifyContent: "center",
                          fontSize:       10,
                          color:          C.teal,
                          flexShrink:     0,
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Timestamp — only after last in group */}
                  {isLast && (
                    <span
                      style={{
                        fontSize:   10,
                        color:      C.muted,
                        marginTop:  3,
                        ...(isMe ? { marginRight: 5 } : { marginLeft: 5 }),
                      } as React.CSSProperties}
                    >
                      {msg.time}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating "Ask Miku" bar */}
          {selected.size > 0 && (
            <div
              className="fade-up"
              onClick={analyze}
              style={{
                position:       "absolute",
                bottom:         20,
                left:           14,
                right:          14,
                background:     `linear-gradient(135deg, ${C.teal} 0%, #0d9488 100%)`,
                borderRadius:   22,
                padding:        "13px 18px",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                boxShadow:      `0 8px 28px ${C.teal}55`,
                cursor:         "pointer",
                zIndex:         20,
              }}
            >
              <div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>Ask Miku</div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 }}>
                  {selected.size} message{selected.size !== 1 ? "s" : ""} selected
                </div>
              </div>
              {loading ? (
                <span
                  className="spin"
                  style={{ width: 24, height: 24, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }}
                />
              ) : (
                <div
                  style={{
                    width:          40,
                    height:         40,
                    borderRadius:   "50%",
                    background:     "rgba(255,255,255,0.2)",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontSize:       18,
                    color:          "#fff",
                  }}
                >
                  ✦
                </div>
              )}
            </div>
          )}

          {/* Home indicator */}
          <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", flexShrink: 0 }}>
            <div style={{ width: 100, height: 4, borderRadius: 99, background: "rgba(0,0,0,0.14)" }} />
          </div>
        </div>

        {/* ── Analysis panel ───────────────────────────────────────────── */}
        {panelOpen && (
          <div
            className="slide-in sr-panel"
            style={{
              overflowY:     "auto",
              background:    C.cream,
              borderRadius:  30,
              border:        "1px solid rgba(0,0,0,0.05)",
              boxShadow:     "0 28px 56px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.05)",
              flexShrink:    0,
              display:       "flex",
              flexDirection: "column",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                display:       "flex",
                alignItems:    "center",
                padding:       "18px 20px 14px",
                borderBottom:  "1px solid rgba(15,118,110,0.1)",
                position:      "sticky",
                top:           0,
                background:    C.cream,
                zIndex:        5,
              }}
            >
              <div
                style={{
                  width:          40,
                  height:         40,
                  borderRadius:   "50%",
                  background:     `linear-gradient(135deg, ${C.teal} 0%, ${C.coral} 100%)`,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          "#fff",
                  fontSize:       18,
                  marginRight:    12,
                  boxShadow:      `0 4px 14px ${C.teal}44`,
                  flexShrink:     0,
                }}
              >
                ✦
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 18, color: C.text, lineHeight: 1.2 }}>
                  Miku
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Social read · Claude</div>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                style={{
                  width:          30,
                  height:         30,
                  borderRadius:   "50%",
                  background:     "rgba(0,0,0,0.07)",
                  border:         "none",
                  cursor:         "pointer",
                  fontSize:       18,
                  color:          C.muted,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            {error ? (
              <div style={{ padding: "14px 14px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="fade-up" style={{ background: "#fff", borderRadius: 18, padding: "18px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${C.coral}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      ⚠
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.coral }}>
                      Error
                    </span>
                  </div>
                  <p style={{ fontFamily: "Fraunces, serif", fontSize: 15, lineHeight: 1.6, color: C.text, margin: "0 0 16px" }}>
                    {error}
                  </p>
                  <button
                    onClick={() => setError(null)}
                    style={{ padding: "9px 20px", borderRadius: 99, background: C.teal, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : analysis ? (
              <div style={{ padding: "14px 14px 28px", display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Vibe read */}
                <div
                  className="fade-up"
                  style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", animationDelay: "0.04s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                    <span style={{ fontSize: 15 }}>👁</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.teal }}>
                      Vibe read
                    </span>
                  </div>
                  <p style={{ fontFamily: "Fraunces, serif", fontSize: 14.5, lineHeight: 1.65, color: C.text, margin: 0 }}>
                    {analysis.vibe_read}
                  </p>
                </div>

                {/* Reality check */}
                <div
                  className="fade-up"
                  style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", animationDelay: "0.09s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                    <span style={{ fontSize: 15 }}>🔍</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.coral }}>
                      Reality check
                    </span>
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: C.sub, margin: 0 }}>
                    {analysis.reality_check}
                  </p>
                </div>

                {/* Reply drafts */}
                {analysis.response_options?.length > 0 && (
                  <div
                    className="fade-up"
                    style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", animationDelay: "0.14s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                      <span style={{ fontSize: 15 }}>💬</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
                        Reply drafts
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {analysis.response_options.map((opt, i) => {
                        const tc = toneColor(opt.tone);
                        const done = copiedDraft === i;
                        return (
                          <div
                            key={i}
                            className="fade-up"
                            onClick={() => copyDraft(i, opt.draft)}
                            style={{
                              borderLeft:     `3px solid ${tc}`,
                              borderRadius:   "0 12px 12px 0",
                              padding:        "10px 12px",
                              background:     `${tc}09`,
                              cursor:         "pointer",
                              animationDelay: `${0.16 + i * 0.05}s`,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: tc, textTransform: "capitalize", letterSpacing: "0.04em" }}>
                                {opt.tone}
                              </span>
                              <span style={{ fontSize: 10, color: done ? "#16a34a" : C.muted, fontWeight: done ? 600 : 400, transition: "color 0.2s" }}>
                                {done ? "✓ copied" : "copy"}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.5, color: C.text }}>
                              {opt.draft}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Verdict */}
                <div
                  className="fade-up"
                  onClick={copyVerdict}
                  style={{
                    borderRadius:   20,
                    padding:        "18px 18px",
                    background:     `linear-gradient(140deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
                    cursor:         "pointer",
                    animationDelay: "0.19s",
                    boxShadow:      `0 10px 28px ${C.teal}45`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>⚡</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                      Verdict
                    </span>
                  </div>
                  <p style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, color: "#fff", lineHeight: 1.35, margin: "0 0 14px" }}>
                    {analysis.verdict}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <ConfidenceBar level={analysis.confidence} />
                    <span style={{ fontSize: 11, color: copiedVerdict ? "#86efac" : "rgba(255,255,255,0.45)", fontWeight: copiedVerdict ? 600 : 400, transition: "color 0.2s" }}>
                      {copiedVerdict ? "✓ copied" : "tap to copy"}
                    </span>
                  </div>
                </div>

                {/* Follow-up chat */}
                <div
                  className="fade-up"
                  style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", animationDelay: "0.24s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <span style={{ fontSize: 15 }}>✦</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
                      Ask a follow-up
                    </span>
                  </div>

                  {followUps.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
                      {followUps.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            alignSelf:    m.role === "user" ? "flex-end" : "flex-start",
                            maxWidth:     "90%",
                            background:   m.role === "user" ? C.teal : C.cream,
                            color:        m.role === "user" ? "#fff" : C.text,
                            borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                            padding:      "8px 12px",
                            fontSize:     13,
                            lineHeight:   1.5,
                          }}
                        >
                          {m.text}
                        </div>
                      ))}
                      {chatLoading && (
                        <div style={{ alignSelf: "flex-start", color: C.muted, padding: "4px 10px", fontSize: 20, letterSpacing: 2 }}>
                          ···
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}

                  {/* Chat input */}
                  <div
                    style={{
                      display:      "flex",
                      gap:          8,
                      background:   "#f7f7f7",
                      borderRadius: 14,
                      padding:      "4px 4px 4px 14px",
                      border:       `1px solid ${C.teal}1a`,
                    }}
                  >
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendFollowUp()}
                      placeholder="What do you think this means?"
                      disabled={chatLoading}
                      style={{
                        flex:       1,
                        border:     "none",
                        outline:    "none",
                        fontSize:   13,
                        background: "transparent",
                        color:      C.text,
                        fontFamily: "Inter, sans-serif",
                        padding:    "8px 0",
                      }}
                    />
                    <button
                      onClick={sendFollowUp}
                      disabled={chatLoading || !chatInput.trim()}
                      style={{
                        width:          34,
                        height:         34,
                        borderRadius:   10,
                        background:     chatInput.trim() ? C.teal : "#e5e7eb",
                        color:          "#fff",
                        border:         "none",
                        cursor:         chatInput.trim() ? "pointer" : "default",
                        fontSize:       16,
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        flexShrink:     0,
                        transition:     "background 0.2s",
                      }}
                    >
                      ↑
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* Empty state */
              <div
                style={{
                  flex:           1,
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  padding:        "52px 32px",
                  textAlign:      "center",
                  gap:            16,
                }}
              >
                <div
                  className="breathe"
                  style={{
                    width:          68,
                    height:         68,
                    borderRadius:   "50%",
                    background:     `linear-gradient(135deg, ${C.teal}1a 0%, ${C.coral}1a 100%)`,
                    border:         `1.5px solid ${C.teal}22`,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontSize:       28,
                    color:          C.teal,
                  }}
                >
                  ✦
                </div>
                <div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, color: C.text, marginBottom: 8 }}>
                    Ready to read
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7, color: C.muted, maxWidth: 220, margin: "0 auto" }}>
                    Tap messages in the chat, then hit <strong style={{ color: C.teal }}>Ask Miku</strong> to get the read.
                  </div>
                </div>
                <div
                  style={{
                    marginTop:    4,
                    fontSize:     11,
                    color:        C.muted,
                    opacity:      0.6,
                    padding:      "5px 12px",
                    background:   "rgba(0,0,0,0.04)",
                    borderRadius: 99,
                  }}
                >
                  Powered by Claude extended thinking
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
