"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";
import ChatInterface from "../../components/ChatInterface";
import ChatHistorySidebar from "../../components/ChatHistorySidebar";
import PanduanModal from "../../components/PanduanModal";
import { ChatProvider } from "../../context/ChatContext";
import { MessageSquare } from "lucide-react";

export default function AppPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ChatProvider>
      <div
        className="flex flex-col"
        style={{
          height: "100dvh",
          fontFamily: "var(--font-montserrat)",
          background: "var(--pajak-light)",
        }}
      >
        <Navbar />

        <div
          className="flex flex-1 min-h-0"
          style={{ height: "calc(100dvh - 64px)" }}
        >
          {/* ── Sidebar ── */}
          <ChatHistorySidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />

          {/* ── Main ── */}
          <main className="flex-1 min-w-0 flex flex-col bg-white">
            {/* Slim top bar */}
            <div
              className="shrink-0 flex items-center justify-between px-6 py-3"
              style={{ borderBottom: "1px solid var(--pajak-border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--pajak-primary), var(--pajak-secondary))",
                  }}
                >
                  <MessageSquare size={15} className="text-white" />
                </div>
                <div>
                  <h1
                    className="text-base text-gray-900 leading-none"
                    style={{ fontFamily: "var(--font-coolvetica)" }}
                  >
                    KAPHA · AI Konsultan Pajak
                  </h1>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Transfer Pricing · P3B · BUT · PPh 26 · PPh Badan
                  </p>
                </div>
              </div>
              <PanduanModal />
            </div>

            {/* Chat area — fills remaining height */}
            <div className="flex-1 min-h-0">
              <ChatInterface />
            </div>
          </main>
        </div>
      </div>
    </ChatProvider>
  );
}
