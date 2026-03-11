"use client";

import Navbar from "../../components/Navbar";
import ChatInterface from "../../components/ChatInterface";
import ChatHistorySidebar from "../../components/ChatHistorySidebar";
import PanduanModal from "../../components/PanduanModal";
import { ChatProvider } from "../../context/ChatContext";

export default function AppPage() {
  return (
    <ChatProvider>
      <div
        className="min-h-screen bg-[var(--pajak-light)]"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        <Navbar />

        <main
          className="max-w-[1440px] mx-auto px-8 pt-8 pb-0 flex flex-col"
          style={{ height: "calc(100vh - 64px)" }}
        >
          {/* Header */}
          <header className="mb-5 shrink-0 flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-4xl text-[#000000] mb-1"
                style={{ fontFamily: "var(--font-coolvetica)" }}
              >
                KAPHA · Konsultan Pajak AI
              </h1>
              <p className="text-base text-[#555555]">
                Tanya soal putusan pajak — Transfer Pricing, P3B, BUT, PPh 26, PPh Badan
              </p>
            </div>
            <div className="shrink-0 mt-1.5">
              <PanduanModal />
            </div>
          </header>

          {/* Body: sidebar + chat */}
          <div className="flex-1 min-h-0 flex gap-0 rounded-2xl border border-[var(--pajak-border)] shadow-[0px_4px_20px_var(--pajak-shadow)] overflow-hidden mb-8">
            <ChatHistorySidebar />
            <div className="flex-1 min-w-0 bg-white flex flex-col">
              <ChatInterface />
            </div>
          </div>
        </main>
      </div>
    </ChatProvider>
  );
}