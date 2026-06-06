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

// ─── Demo conversation ────────────────────────────────────────────────────────

const DEMO: ChatMessage[] = [
  { id: "1", sender: "them", body: "hey are you free this weekend?", time: "2:14 PM" },
  { id: "2", sender: "me",   body: "yeah should be! what did you have in mind?", time: "2:15 PM" },
  { id: "3", sender: "them", body: "idk maybe hang? haven't seen you in a while", time: "2:16 PM" },
  { id: "4", sender: "me",   body: "for sure, saturday works", time: "2:17 PM" },
  { id: "5", sender: "them", body: "oh actually i might have something saturday, let me check", time: "2:30 PM" },
  { id: "6", sender: "them", body: "yeah probably can't do saturday. sunday maybe?", time: "2:31 PM" },
  { id: "7", sender: "me",   body: "sunday works too", time: "2:32 PM" },
  { id: "8", sender: "them", body: "cool i'll let you know", time: "3:45 PM" },
];

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  teal:   "#0f766e",
  tealBg: "#f0fdf4",
  coral:  "#e8896b",
  cream:  "#fbf6ef",
  gray:   "#e8e8e8",
  text:   "#1a1a1a",
  muted:  "#6b7280",
};

// ─── Confidence pill ──────────────────────────────────────────────────────────

function ConfidencePill({ level }: { level: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    high:   { bg: "#d1fae5", fg: "#065f46" },
    medium: { bg: "#fef3c7", fg: "#92400e" },
    low:    { bg: "#fee2e2", fg: "#991b1b" },
  };
  const c = colors[level] ?? colors.medium;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: c.bg,
        color: c.fg,
      }}
    >
      {level} confidence
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [profileId, setProfileId]     = useState<string | null>(null);
  const [analysis, setAnalysis]       = useState<AnalysisResult | null>(null);
  const [panelOpen, setPanelOpen]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [followUps, setFollowUps]     = useState<FollowUp[]>([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [copied, setCopied]           = useState(false);
  const chatEndRef                    = useRef<HTMLDivElement>(null);

  // ── Init Jordan profile (if Supabase configured) ─────────────────────────
  useEffect(() => {
    fetch("/api/profiles", { headers: { "x-user-id": "demo-user" } })
      .then((r) => r.json())
      .then((profiles: { name: string; id: string }[]) => {
        const jordan = profiles.find((p) => p.name === "Jordan");
        if (jordan) return setProfileId(jordan.id);
        return fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": "demo-user" },
          body: JSON.stringify({ name: "Jordan", relationship_type: "friend" }),
        })
          .then((r) => r.json())
          .then((p: { id: string }) => setProfileId(p.id));
      })
      .catch(() => {/* stateless mode */});
  }, []);

  // ── Scroll follow-up chat to bottom ──────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [followUps]);

  // ── Toggle message selection ──────────────────────────────────────────────
  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Run analysis ──────────────────────────────────────────────────────────
  async function analyze() {
    const msgs = DEMO.filter((m) => selected.has(m.id));
    if (!msgs.length) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        messages: msgs.map((m) => ({ sender: m.sender, body: m.body })),
        ...(profileId ? { profile_id: profileId, archive: true } : {}),
      };
      const res  = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      setAnalysis(data);
      setFollowUps([]);
      setPanelOpen(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Send follow-up ────────────────────────────────────────────────────────
  async function sendFollowUp() {
    if (!chatInput.trim() || !analysis) return;
    const userText  = chatInput.trim();
    setChatInput("");
    const updated: FollowUp[] = [...followUps, { role: "user", text: userText }];
    setFollowUps(updated);
    setChatLoading(true);
    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages:         updated.map((m) => ({ role: m.role, content: m.text })),
          analysis_context: analysis,
        }),
      });
      const data = await res.json();
      setFollowUps((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Copy verdict ──────────────────────────────────────────────────────────
  function copyVerdict() {
    if (!analysis?.verdict) return;
    navigator.clipboard.writeText(analysis.verdict);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", gap: 0, alignItems: "flex-start", justifyContent: "center", width: "100%" }}>

      {/* ── Phone shell ─────────────────────────────────────────────────── */}
      <div
        style={{
          width:        375,
          minHeight:    700,
          background:   "#fff",
          borderRadius: 24,
          overflow:     "hidden",
          boxShadow:    "0 8px 40px rgba(0,0,0,0.14)",
          display:      "flex",
          flexDirection:"column",
          position:     "relative",
          flexShrink:   0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            padding:        "14px 16px",
            borderBottom:   "1px solid #f0f0f0",
            background:     "#fff",
            position:       "sticky",
            top:            0,
            zIndex:         10,
            gap:            10,
          }}
        >
          <span style={{ fontSize: 22, cursor: "pointer", color: C.teal }}>‹</span>

          <div
            style={{
              width:        40,
              height:       40,
              borderRadius: "50%",
              background:   C.teal,
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
              color:        "#fff",
              fontWeight:   600,
              fontSize:     16,
              flexShrink:   0,
            }}
          >
            J
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>Jordan</div>
            <div style={{ fontSize: 11, color: C.muted }}>tap messages to select</div>
          </div>

          {/* Miku orb */}
          <div
            onClick={() => {
              if (selected.size > 0) analyze();
              else setPanelOpen((v) => !v);
            }}
            className="breathe"
            title="Ask Miku"
            style={{
              width:          38,
              height:         38,
              borderRadius:   "50%",
              background:     `linear-gradient(135deg, ${C.teal}, ${C.coral})`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              cursor:         "pointer",
              fontSize:       18,
              flexShrink:     0,
              boxShadow:      `0 2px 12px ${C.teal}44`,
            }}
          >
            ✦
          </div>
        </div>

        {/* Chat thread */}
        <div
          style={{
            flex:       1,
            overflowY:  "auto",
            padding:    "12px 14px 80px",
            display:    "flex",
            flexDirection:"column",
            gap:        6,
          }}
        >
          {DEMO.map((msg) => {
            const isMe   = msg.sender === "me";
            const isSel  = selected.has(msg.id);
            return (
              <div
                key={msg.id}
                onClick={() => toggle(msg.id)}
                style={{
                  display:       "flex",
                  flexDirection: "column",
                  alignItems:    isMe ? "flex-end" : "flex-start",
                  cursor:        "pointer",
                }}
              >
                <div
                  style={{
                    maxWidth:     "72%",
                    padding:      "9px 13px",
                    borderRadius: isMe
                      ? "18px 18px 4px 18px"
                      : "18px 18px 18px 4px",
                    background:   isSel
                      ? (isMe ? "#0a5c56" : "#d1fae5")
                      : (isMe ? C.teal : C.gray),
                    color:        isMe ? "#fff" : C.text,
                    fontSize:     14,
                    lineHeight:   1.45,
                    outline:      isSel ? `2px solid ${C.teal}` : "none",
                    outlineOffset:2,
                    transform:    isSel ? "scale(0.97)" : "scale(1)",
                    transition:   "all 0.15s ease",
                    userSelect:   "none",
                  }}
                >
                  {msg.body}
                </div>
                <span style={{ fontSize: 10, color: C.muted, marginTop: 2, marginLeft: 4, marginRight: 4 }}>
                  {msg.time}
                </span>
              </div>
            );
          })}
        </div>

        {/* Floating "Ask Miku" bar */}
        {selected.size > 0 && (
          <div
            className="fade-up"
            style={{
              position:       "absolute",
              bottom:         16,
              left:           16,
              right:          16,
              background:     C.teal,
              borderRadius:   16,
              padding:        "12px 16px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              boxShadow:      "0 4px 20px rgba(15,118,110,0.4)",
              cursor:         "pointer",
              zIndex:         20,
            }}
            onClick={analyze}
          >
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>
              {selected.size} message{selected.size !== 1 ? "s" : ""} selected
            </span>
            {loading ? (
              <span
                className="spin"
                style={{
                  width:  20, height: 20,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius:   "50%",
                  display:        "inline-block",
                }}
              />
            ) : (
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                Ask Miku ✦
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Analysis panel ──────────────────────────────────────────────── */}
      {panelOpen && (
        <div
          className="slide-in"
          style={{
            width:        360,
            maxHeight:    760,
            overflowY:    "auto",
            background:   C.cream,
            borderRadius: 24,
            marginLeft:   16,
            boxShadow:    "0 8px 40px rgba(0,0,0,0.12)",
            flexShrink:   0,
            display:      "flex",
            flexDirection:"column",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display:       "flex",
              alignItems:    "center",
              padding:       "16px 20px 12px",
              borderBottom:  `1px solid ${C.teal}22`,
              position:      "sticky",
              top:           0,
              background:    C.cream,
              zIndex:        5,
            }}
          >
            <div
              style={{
                width:          36,
                height:         36,
                borderRadius:   "50%",
                background:     `linear-gradient(135deg, ${C.teal}, ${C.coral})`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                color:          "#fff",
                fontSize:       16,
                marginRight:    10,
              }}
            >
              ✦
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 16, color: C.text }}>
                Miku
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>ScreenRead</div>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              style={{
                background:   "none",
                border:       "none",
                fontSize:     20,
                color:        C.muted,
                cursor:       "pointer",
                lineHeight:   1,
                padding:      "4px 6px",
                borderRadius: 8,
              }}
            >
              ×
            </button>
          </div>

          {analysis ? (
            <div style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Vibe read */}
              <section className="fade-up" style={{ animationDelay: "0.04s" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.teal, marginBottom: 6 }}>
                  Vibe read
                </div>
                <p style={{ fontFamily: "Fraunces, serif", fontSize: 15, lineHeight: 1.6, color: C.text }}>
                  {analysis.vibe_read}
                </p>
              </section>

              {/* Reality check */}
              <section className="fade-up" style={{ animationDelay: "0.08s" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.coral, marginBottom: 6 }}>
                  Reality check
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: C.text }}>
                  {analysis.reality_check}
                </p>
              </section>

              {/* Response options */}
              {analysis.response_options?.length > 0 && (
                <section className="fade-up" style={{ animationDelay: "0.12s" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>
                    Reply drafts
                  </div>
                  <div className="card-stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {analysis.response_options.map((opt, i) => (
                      <div
                        key={i}
                        className="fade-up"
                        onClick={() => navigator.clipboard.writeText(opt.draft)}
                        title="Click to copy"
                        style={{
                          background:   "#fff",
                          border:       `1px solid ${C.teal}22`,
                          borderRadius: 12,
                          padding:      "11px 14px",
                          cursor:       "pointer",
                          transition:   "box-shadow 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 12px ${C.teal}22`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                        }}
                      >
                        <div
                          style={{
                            display:      "inline-block",
                            fontSize:     10,
                            fontWeight:   600,
                            background:   C.tealBg,
                            color:        C.teal,
                            borderRadius: 99,
                            padding:      "2px 8px",
                            marginBottom: 6,
                            textTransform:"capitalize",
                          }}
                        >
                          {opt.tone}
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.5, color: C.text }}>
                          {opt.draft}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Verdict */}
              <section
                className="fade-up"
                style={{
                  animationDelay: "0.16s",
                  background:     C.teal,
                  borderRadius:   16,
                  padding:        "14px 16px",
                  cursor:         "pointer",
                }}
                onClick={copyVerdict}
                title="Click to copy verdict"
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
                  Verdict
                </div>
                <p style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>
                  {analysis.verdict}
                </p>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <ConfidencePill level={analysis.confidence} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                    {copied ? "✓ copied" : "tap to copy"}
                  </span>
                </div>
              </section>

              {/* Follow-up chat */}
              <section className="fade-up" style={{ animationDelay: "0.20s" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>
                  Ask a follow-up
                </div>

                {followUps.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {followUps.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          alignSelf:    m.role === "user" ? "flex-end" : "flex-start",
                          maxWidth:     "88%",
                          background:   m.role === "user" ? C.teal : "#fff",
                          color:        m.role === "user" ? "#fff" : C.text,
                          borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          padding:      "8px 12px",
                          fontSize:     13,
                          lineHeight:   1.5,
                          border:       m.role === "assistant" ? `1px solid ${C.teal}22` : "none",
                        }}
                      >
                        {m.text}
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ alignSelf: "flex-start", fontSize: 20, color: C.muted, padding: "4px 12px" }}>
                        ···
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendFollowUp()}
                    placeholder="Ask anything…"
                    disabled={chatLoading}
                    style={{
                      flex:         1,
                      padding:      "10px 14px",
                      borderRadius: 12,
                      border:       `1px solid ${C.teal}33`,
                      outline:      "none",
                      fontSize:     13,
                      background:   "#fff",
                      color:        C.text,
                      fontFamily:   "Inter, sans-serif",
                    }}
                  />
                  <button
                    onClick={sendFollowUp}
                    disabled={chatLoading || !chatInput.trim()}
                    style={{
                      padding:      "10px 14px",
                      borderRadius: 12,
                      background:   C.teal,
                      color:        "#fff",
                      border:       "none",
                      cursor:       chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                      fontSize:     16,
                      opacity:      chatLoading || !chatInput.trim() ? 0.5 : 1,
                      transition:   "opacity 0.15s",
                    }}
                  >
                    ↑
                  </button>
                </div>
              </section>

            </div>
          ) : (
            <div
              style={{
                flex:           1,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                padding:        40,
                color:          C.muted,
                textAlign:      "center",
                gap:            12,
              }}
            >
              <div style={{ fontSize: 36 }} className="breathe">✦</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, color: C.text }}>
                Nothing to read yet
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Tap messages in the chat, then press <strong>Ask Miku</strong>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
