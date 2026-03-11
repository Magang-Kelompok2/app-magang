"use client";

import { useState } from "react";
import { Plus, MessageSquare, Trash2, Clock } from "lucide-react";
import { useChatContext, ChatSession } from "../context/ChatContext";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  if (h < 24) return `${h} jam lalu`;
  if (d < 7)  return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function SessionItem({
  sess, isActive, onLoad, onDelete,
}: {
  sess: ChatSession;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const msgCount = sess.messages.filter((m) => m.role === "user").length;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all
        ${isActive
          ? "bg-[var(--pajak-primary)]/10 border border-[var(--pajak-primary)]/20"
          : "hover:bg-gray-100 border border-transparent"}`}
      onClick={onLoad}
    >
      {/* Icon */}
      <MessageSquare
        size={14}
        className={`shrink-0 mt-0.5 ${isActive ? "text-[var(--pajak-primary)]" : "text-gray-400"}`}
      />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-snug truncate
          ${isActive ? "text-[var(--pajak-primary)]" : "text-gray-700"}`}
          style={{ fontFamily: "var(--font-montserrat)" }}>
          {sess.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={9} className="text-gray-400" />
          <span className="text-[10px] text-gray-400">{relativeTime(sess.updatedAt)}</span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[10px] text-gray-400">{msgCount} pesan</span>
        </div>
      </div>

      {/* Delete button */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 w-5 h-5 rounded-md hover:bg-red-100 flex items-center justify-center transition-colors"
        >
          <Trash2 size={11} className="text-red-400" />
        </button>
      )}
    </div>
  );
}

export default function ChatHistorySidebar() {
  const { activeId, history, newChat, loadSession, deleteSession, clearActive } = useChatContext();
  const [confirmClear, setConfirmClear] = useState(false);

  // Kelompokkan per hari
  const grouped: { label: string; items: ChatSession[] }[] = [];
  const now   = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  history.forEach((sess) => {
    const d = new Date(sess.updatedAt).toDateString();
    const label = d === today ? "Hari ini" : d === yesterday ? "Kemarin" : relativeTime(sess.updatedAt).includes("hari") ? relativeTime(sess.updatedAt) : new Date(sess.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long" });
    const existing = grouped.find((g) => g.label === label);
    if (existing) existing.items.push(sess);
    else grouped.push({ label, items: [sess] });
  });

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-[var(--pajak-border)] h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[var(--pajak-border)]">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3"
          style={{ fontFamily: "var(--font-montserrat)" }}>
          Riwayat Chat
        </p>

        {/* New chat */}
        <button
          onClick={newChat}
          className="w-full flex items-center justify-center gap-2 bg-[var(--pajak-primary)] hover:brightness-110 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          <Plus size={13} />
          Chat Baru
        </button>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-8 gap-2 text-center px-4">
            <MessageSquare size={24} className="text-gray-200" />
            <p className="text-xs text-gray-400" style={{ fontFamily: "var(--font-montserrat)" }}>
              Belum ada riwayat chat.
              <br />Mulai percakapan baru!
            </p>
          </div>
        ) : (
          grouped.map(({ label, items }) => (
            <div key={label} className="mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5"
                style={{ fontFamily: "var(--font-montserrat)" }}>
                {label}
              </p>
              {items.map((sess) => (
                <SessionItem
                  key={sess.id}
                  sess={sess}
                  isActive={sess.id === activeId}
                  onLoad={() => loadSession(sess.id)}
                  onDelete={() => deleteSession(sess.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer — clear active */}
      <div className="shrink-0 px-3 py-3 border-t border-[var(--pajak-border)]">
        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-all"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            <Trash2 size={11} />
            Hapus chat sekarang
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-red-500 font-semibold" style={{ fontFamily: "var(--font-montserrat)" }}>
              Yakin hapus?
            </span>
            <div className="flex gap-1.5">
              <button onClick={async () => { await clearActive(); setConfirmClear(false); }}
                className="text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md transition-colors">
                Ya
              </button>
              <button onClick={() => setConfirmClear(false)}
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 px-1">
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}