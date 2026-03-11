"use client";

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Source {
  nomor: string;
  jenis_pajak: string;
  amar: string;
  tahun: string;
  skor: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: string; // ISO — supaya bisa di-JSON.stringify
}

export interface ChatSession {
  id: string;
  title: string;        // pesan user pertama, truncated
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ChatCtx {
  activeId: string;
  messages: ChatMessage[];
  loading: boolean;
  history: ChatSession[];
  send: (text: string) => Promise<void>;
  newChat: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  clearActive: () => Promise<void>;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_HISTORY  = "kapha_history_v2";
const LS_ACTIVE   = "kapha_active_v2";
const MAX_HISTORY = 50;
const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

const WELCOME_MSG = (id: string): ChatMessage => ({
  id,
  role: "assistant",
  content:
    "Halo! Saya KAPHA, konsultan pajak AI kamu. Tanya apa saja soal putusan pengadilan pajak — transfer pricing, P3B, BUT, PPh Badan, atau isu perpajakan lintas negara lainnya.",
  timestamp: new Date().toISOString(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }
function trunc(s: string, n = 52) { return s.length <= n ? s : s.slice(0, n) + "…"; }

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
}
function lsDel(key: string) {
  try { localStorage.removeItem(key); } catch { }
}

// ── Context ───────────────────────────────────────────────────────────────────
const ChatContext = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeId,  setActiveId]  = useState<string>(() => uid());
  const [messages,  setMessages]  = useState<ChatMessage[]>(() => [WELCOME_MSG(uid())]);
  const [loading,   setLoading]   = useState(false);
  const [history,   setHistory]   = useState<ChatSession[]>([]);
  const [hydrated,  setHydrated]  = useState(false);

  // Ref agar callback async selalu baca nilai terkini
  const activeIdRef  = useRef(activeId);
  const messagesRef  = useRef(messages);
  useEffect(() => { activeIdRef.current  = activeId;  }, [activeId]);
  useEffect(() => { messagesRef.current  = messages;  }, [messages]);

  // ── Hydrate dari localStorage (sekali, saat mount) ───────────────────────
  useEffect(() => {
    const savedHistory = lsGet<ChatSession[]>(LS_HISTORY, []);
    setHistory(savedHistory);

    const savedActive = lsGet<ChatSession | null>(LS_ACTIVE, null);
    if (savedActive && savedActive.messages.length > 1) {
      setActiveId(savedActive.id);
      setMessages(savedActive.messages);
    }
    setHydrated(true);
  }, []);

  // ── Auto-save setiap kali ada perubahan messages ─────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    const userMsgs = messages.filter((m) => m.role === "user");
    if (userMsgs.length === 0) return;

    const sess: ChatSession = {
      id:        activeId,
      title:     trunc(userMsgs[0].content),
      messages,
      createdAt: messages[0]?.timestamp ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    lsSet(LS_ACTIVE, sess);

    setHistory((prev) => {
      const idx  = prev.findIndex((s) => s.id === activeId);
      const next = idx >= 0
        ? prev.map((s, i) => i === idx ? sess : s)
        : [sess, ...prev];
      const trimmed = next.slice(0, MAX_HISTORY);
      lsSet(LS_HISTORY, trimmed);
      return trimmed;
    });
  }, [messages, activeId, hydrated]);

  // ── SEND ──────────────────────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = {
      id: uid(), role: "user", content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: msg, session_id: activeIdRef.current }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id:        uid(),
          role:      "assistant",
          content:   data.error ? `⚠️ Error: ${data.error}` : data.answer,
          sources:   data.sources ?? [],
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(), role: "assistant",
          content:   "⚠️ Gagal terhubung ke server. Pastikan FastAPI sudah berjalan.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // ── NEW CHAT ──────────────────────────────────────────────────────────────
  const newChat = useCallback(() => {
    const newId = uid();
    setActiveId(newId);
    setMessages([WELCOME_MSG(uid())]);
    lsDel(LS_ACTIVE);
  }, []);

  // ── LOAD SESSION ──────────────────────────────────────────────────────────
  const loadSession = useCallback((id: string) => {
    setHistory((prev) => {
      const sess = prev.find((s) => s.id === id);
      if (!sess) return prev;
      setActiveId(sess.id);
      setMessages(sess.messages);
      lsSet(LS_ACTIVE, sess);
      return prev;
    });
  }, []);

  // ── DELETE SESSION ────────────────────────────────────────────────────────
  const deleteSession = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((s) => s.id !== id);
      lsSet(LS_HISTORY, next);
      return next;
    });
    if (id === activeIdRef.current) {
      // kalau yang dihapus aktif → cek apakah ada sesi lain
      setHistory((prev) => {
        const others = prev.filter((s) => s.id !== id);
        if (others.length > 0) {
          const first = others[0];
          setActiveId(first.id);
          setMessages(first.messages);
          lsSet(LS_ACTIVE, first);
        } else {
          const newId = uid();
          setActiveId(newId);
          setMessages([WELCOME_MSG(uid())]);
          lsDel(LS_ACTIVE);
        }
        return others;
      });
    }
  }, []);

  // ── CLEAR ACTIVE (hapus chat + server cache) ──────────────────────────────
  const clearActive = useCallback(async () => {
    try {
      await fetch(`${FASTAPI_URL}/session/${activeIdRef.current}`, { method: "DELETE" });
    } catch { }
    deleteSession(activeIdRef.current);
  }, [deleteSession]);

  return (
    <ChatContext.Provider value={{
      activeId, messages, loading, history,
      send, newChat, loadSession, deleteSession, clearActive,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used inside <ChatProvider>");
  return ctx;
}