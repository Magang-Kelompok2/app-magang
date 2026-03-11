"use client";

import { useRef, useEffect, useState } from "react";
import { Send, ChevronDown, ChevronRight, FileText, ExternalLink } from "lucide-react";
import { useChatContext, ChatMessage, Source } from "../context/ChatContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
function amarStyle(amar: string) {
  const l = amar.toLowerCase();
  if (l.includes("tolak") || l.includes("menolak"))
    return { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" };
  if (l.includes("kabul") || l.includes("menerima"))
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  if (l.includes("batal") || l.includes("membatalkan"))
    return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" };
  return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
}

// ── SourceCard ────────────────────────────────────────────────────────────────
function SourceCard({ s }: { s: Source }) {
  const style = amarStyle(s.amar);
  return (
    <a href={`/putusan/${encodeURIComponent(s.nomor)}`} target="_blank" rel="noopener noreferrer"
      className="block bg-white border border-[var(--pajak-border)] rounded-xl p-3.5 hover:border-[var(--pajak-primary)] hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText size={13} className="text-[var(--pajak-primary)] shrink-0 mt-0.5" />
          <span className="text-xs font-bold text-[var(--pajak-primary)] font-mono truncate">{s.nomor}</span>
        </div>
        <ExternalLink size={12} className="text-gray-300 group-hover:text-[var(--pajak-primary)] shrink-0 transition-colors" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[s.jenis_pajak, s.tahun].map((v) => (
          <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--pajak-light)] text-gray-500 font-semibold border border-[var(--pajak-border)]">{v}</span>
        ))}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${style.bg} ${style.text} ${style.border}`}>{s.amar}</span>
      </div>
      <div className="mt-1.5 text-right">
        <span className="text-[10px] text-gray-400">Relevansi {Math.round(s.skor * 100)}%</span>
      </div>
    </a>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const [showSources, setShowSources] = useState(false);
  const time = new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black mt-0.5
        ${isUser ? "bg-[var(--pajak-primary)] text-white" : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"}`}
        style={{ fontFamily: "var(--font-coolvetica)" }}>
        {isUser ? "K" : "AI"}
      </div>

      <div className={`max-w-[78%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? "bg-[var(--pajak-primary)] text-white rounded-tr-sm"
            : "bg-white border border-[var(--pajak-border)] text-gray-800 rounded-tl-sm shadow-sm"}`}
          style={{ fontFamily: "var(--font-montserrat)" }}>
          {msg.content}
        </div>

        {msg.sources && msg.sources.length > 0 && (
          <div className="w-full">
            <button onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[var(--pajak-primary)] transition-colors py-1">
              {showSources ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span className="font-semibold">{msg.sources.length} putusan referensi</span>
            </button>
            {showSources && (
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {msg.sources.map((s) => <SourceCard key={s.nomor} s={s} />)}
              </div>
            )}
          </div>
        )}

        <span className="text-[10px] text-gray-400">{time}</span>
      </div>
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-black text-white"
        style={{ fontFamily: "var(--font-coolvetica)" }}>AI</div>
      <div className="px-4 py-3 bg-white border border-[var(--pajak-border)] rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── Suggestions ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Putusan transfer pricing yang dikabulkan hakim?",
  "Sengketa P3B terkait beneficial ownership?",
  "Kasus BUT yang menang di Mahkamah Agung?",
  "Koreksi royalti fiskus yang dibatalkan pengadilan?",
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChatInterface() {
  const { messages, loading, send } = useChatContext();
  const [input, setInput]           = useState("");
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const hasUserMsg                  = messages.some((m) => m.role === "user");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    send(msg);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.map((m) => <Bubble key={m.id} msg={m} />)}
        {loading && <TypingIndicator />}

        {!hasUserMsg && !loading && (
          <div className="pt-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"
              style={{ fontFamily: "var(--font-montserrat)" }}>Coba tanya:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => handleSend(s)}
                  className="text-left text-sm px-4 py-3 bg-white border border-[var(--pajak-border)] rounded-xl hover:border-[var(--pajak-primary)] hover:shadow-sm transition-all text-gray-600 hover:text-[var(--pajak-primary)]"
                  style={{ fontFamily: "var(--font-montserrat)" }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-6 pb-6 pt-3 border-t border-[var(--pajak-border)]">
        <div className="flex gap-3 items-end bg-white border border-[var(--pajak-border)] rounded-2xl px-4 py-2.5 focus-within:border-[var(--pajak-primary)] focus-within:ring-2 focus-within:ring-[var(--pajak-primary)]/20 transition-all shadow-sm">
          <textarea ref={textareaRef} rows={1} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Tanya soal putusan pajak, TP, P3B, BUT…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none py-1 min-h-[1.75rem] max-h-40"
            style={{ fontFamily: "var(--font-montserrat)" }} />
          <button onClick={() => handleSend()} disabled={!input.trim() || loading}
            className="shrink-0 w-9 h-9 rounded-xl bg-[var(--pajak-primary)] hover:brightness-110 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-all mb-0.5">
            <Send size={15} className="text-white" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2" style={{ fontFamily: "var(--font-montserrat)" }}>
          Enter untuk kirim · Shift+Enter untuk baris baru
        </p>
      </div>
    </div>
  );
}