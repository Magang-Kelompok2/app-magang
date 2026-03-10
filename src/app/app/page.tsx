import ChatInterface from "../../components/ChatInterface";
import Navbar from "../../components/Navbar";

export const metadata = {
  title: "KAPHA · Konsultan Pajak AI",
  description: "Tanya soal putusan pengadilan pajak, transfer pricing, dan P3B.",
};

export default function AppPage() {
  return (
    <div
      className="min-h-screen bg-[var(--pajak-light)] pb-0"
      style={{ fontFamily: "var(--font-montserrat)" }}
    >
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-8 pt-8 pb-0 flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
        {/* Header — sama persis dengan DashboardPage */}
        <header className="mb-6 shrink-0">
          <h1
            className="text-4xl text-[#000000] mb-2"
            style={{ fontFamily: "var(--font-coolvetica)" }}
          >
            KAPHA · Konsultan Pajak AI
          </h1>
          <h3 className="text-lg text-[#333333]">
            Tanya soal putusan pajak — Transfer Pricing, P3B, BUT, PPh 26, PPh Badan
          </h3>
        </header>

        {/* Chat card — mengikuti style card di dashboard */}
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-[var(--pajak-border)] shadow-[0px_4px_20px_var(--pajak-shadow)] overflow-hidden flex flex-col mb-8">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}