"use client";

import { useState } from "react";
import { X, BookOpen } from "lucide-react";

const mono = "font-mono text-[11px]";
const label = `text-[10px] font-bold uppercase tracking-widest text-gray-400`;

// ── Tip card ──────────────────────────────────────────────────────────────────
function Tip({ bad, good }: { bad: string; good: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-red-700 leading-snug">
        <span className="block text-[10px] font-bold text-red-400 mb-1">Hindari</span>
        {bad}
      </div>
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-emerald-800 leading-snug">
        <span className="block text-[10px] font-bold text-emerald-500 mb-1">Lebih baik</span>
        {good}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className={label}>{title}</p>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PanduanModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"cara-kerja" | "tips" | "sesi">("cara-kerja");

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "cara-kerja", label: "Cara Kerja" },
    { id: "tips", label: "Tips Prompting" },
    { id: "sesi", label: "Follow-up & Compare" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--pajak-primary)] border border-[var(--pajak-primary)]/30 bg-[var(--pajak-primary)]/5 hover:bg-[var(--pajak-primary)]/10 px-3 py-1.5 rounded-lg transition-colors"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        <BookOpen size={13} />
        Panduan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--pajak-border)]">
              <div>
                <h2 className="font-bold text-gray-900 text-base" style={{ fontFamily: "var(--font-coolvetica)", fontSize: "1.15rem" }}>
                  Panduan KAPHA
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">1.615 putusan · Transfer Pricing · P3B · BUT · PPh 26 · PPh Badan</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex gap-1 px-6 pt-4 pb-0">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all ${
                    tab === t.id
                      ? "bg-[var(--pajak-primary)] text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {tab === "cara-kerja" && (
                <>
                  <Section title="Pipeline Retrieval">
                    <div className="space-y-1.5">
                      {[
                        ["1", "Pertanyaan kamu diperluas secara semantik", "expand_query()"],
                        ["2", "Diubah jadi vektor angka", "BAAI/bge-m3"],
                        ["3", "Cari 10 putusan terdekat di database", "pgvector cosine"],
                        ["4", "Diurutkan ulang berdasarkan relevansi", "CrossEncoder reranker"],
                        ["5", "Top 5 dikirim ke LLM sebagai konteks", "GPT-4o / Llama 3"],
                        ["6", "Nomor putusan di jawaban divalidasi ke DB", "anti-halusinasi"],
                      ].map(([num, desc, badge]) => (
                        <div key={num} className="flex items-center gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--pajak-primary)]/10 text-[var(--pajak-primary)] text-[10px] font-black flex items-center justify-center">
                            {num}
                          </span>
                          <span className="text-sm text-gray-700 flex-1">{desc}</span>
                          <span className={`${mono} bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md shrink-0`}>{badge}</span>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Konsekuensi yang perlu kamu tahu">
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex gap-2.5">
                        <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <p>KAPHA <strong className="text-gray-800">tidak bisa filter by tahun</strong> — pencarian berbasis makna, bukan metadata. Kalau mau hasil dari tahun tertentu, sebut konteksnya di kalimat.</p>
                      </div>
                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                        <p>Pertanyaan terlalu umum (<em>"cari putusan transfer pricing"</em>) → retrieval melebar → jawaban tidak fokus.</p>
                      </div>
                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                        <p>Kalau ada ikon <strong className="text-red-600">⚠️ Peringatan Validasi</strong> di bawah jawaban, artinya nomor putusan yang disebut tidak ada di database — jangan langsung dipercaya.</p>
                      </div>
                    </div>
                  </Section>

                  <Section title="Topik yang dikuasai KAPHA">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Transfer Pricing", "P3B / Tax Treaty", "Bentuk Usaha Tetap",
                        "PPh Pasal 26", "PPh Badan", "Beneficial Ownership",
                        "TNMM / CUP / RPM", "Treaty Shopping", "Arm's Length Principle",
                      ].map((t) => (
                        <span
                          key={t}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--pajak-light)] border border-[var(--pajak-border)] text-gray-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Section>
                </>
              )}

              {tab === "tips" && (
                <>
                  <Section title="Prinsip dasar">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Makin spesifik isu hukumnya, makin tajam hasil retrieval-nya. Targetkan <strong className="text-gray-800">15–40 kata</strong>, pakai istilah teknis, dan satu pertanyaan = satu fokus.
                    </p>
                  </Section>

                  <Section title="Contoh perbaikan">
                    <div className="space-y-2.5">
                      <Tip
                        bad="Cari putusan transfer pricing tahun 2023"
                        good="Koreksi TP metode TNMM yang dibatalkan hakim — data pembanding dianggap tidak sebanding"
                      />
                      <Tip
                        bad="Putusan P3B terbaru"
                        good="Sengketa beneficial owner atas bunga pinjaman ke Belanda — DJP kalah di MA"
                      />
                      <Tip
                        bad="Cari putusan PPh 26 royalti"
                        good="Koreksi PPh 26 atas royalti ke afiliasi Singapura — DJP menggunakan pasal 26 bukan P3B"
                      />
                      <Tip
                        bad="Kasus BUT"
                        good="BUT konstruksi yang melebihi time test 183 hari — atribusi laba dipertahankan hakim"
                      />
                    </div>
                  </Section>

                  <Section title="Kata kunci yang memperkuat retrieval">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { topik: "Transfer Pricing", words: ["TNMM", "CUP", "RPM", "arm's length", "hubungan istimewa", "data pembanding"], color: "border-purple-100 bg-purple-50 text-purple-800" },
                        { topik: "P3B / Treaty", words: ["beneficial owner", "treaty shopping", "SKD / DGT Form", "tarif P3B", "withholding tax"], color: "border-blue-100 bg-blue-50 text-blue-800" },
                        { topik: "BUT", words: ["time test", "183 hari", "atribusi laba", "agen", "jasa teknis"], color: "border-orange-100 bg-orange-50 text-orange-800" },
                        { topik: "PPh 26", words: ["royalti", "dividen", "management fee", "tarif 20%", "tarif P3B"], color: "border-green-100 bg-green-50 text-green-800" },
                      ].map(({ topik, words, color }) => (
                        <div key={topik} className={`rounded-xl border p-2.5 ${color}`}>
                          <p className="font-bold mb-1.5">{topik}</p>
                          <div className="flex flex-wrap gap-1">
                            {words.map((w) => (
                              <span key={w} className="bg-white/60 px-1.5 py-0.5 rounded font-medium">{w}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                </>
              )}

              {tab === "sesi" && (
                <>
                  <Section title="Cara kerja sesi">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Setiap kali kamu tanya topik baru, KAPHA menyimpan hasilnya sebagai{" "}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] text-gray-700">[1] [2] [3]...</code>.
                      Selama kamu di sesi yang sama, pertanyaan berikutnya bisa merujuk ke nomor itu
                      tanpa perlu ketik ulang topiknya.
                    </p>
                  </Section>

                  <Section title="Follow-up — gali lebih dalam">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Frasa ini akan dikenali sebagai follow-up dari hasil sebelumnya:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "dari daftar tersebut…",
                          "dari putusan tadi…",
                          "yang nomor 2…",
                          "jelaskan lebih dalam…",
                          "apa alasan hakim…",
                          "dokumen apa yang…",
                          "kenapa DJP…",
                          "bandingkan putusan 1 dan 3",
                        ].map((f) => (
                          <span key={f} className="text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Section>

                  <Section title="Contoh alur satu topik">
                    <div className="space-y-2">
                      {[
                        { step: "Buka topik", msg: "Putusan TP metode TNMM yang dibatalkan hakim — WP menang" },
                        { step: "Gali", msg: "Dari daftar tersebut, apa alasan utama hakim menolak argumen DJP?" },
                        { step: "Fokus satu", msg: "Jelaskan lebih dalam yang nomor 2 — kelemahan posisi WP apa?" },
                        { step: "Bandingkan", msg: "Bandingkan putusan 1 dan 3 dari sisi kelengkapan dokumen yang diajukan WP" },
                        { step: "Kesimpulan", msg: "Dari putusan tadi, dokumen apa yang paling sering jadi penentu?" },
                      ].map(({ step, msg }, i) => (
                        <div key={step} className="flex gap-3 items-start">
                          <div className="shrink-0 flex flex-col items-center">
                            <span className="w-6 h-6 rounded-full bg-[var(--pajak-primary)] text-white text-[10px] font-black flex items-center justify-center">
                              {i + 1}
                            </span>
                            {i < 4 && <div className="w-px flex-1 min-h-[12px] bg-gray-200 my-1" />}
                          </div>
                          <div className="pb-2">
                            <span className={`${label} block mb-1`}>{step}</span>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 italic">
                              "{msg}"
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Yang perlu diingat">
                    <div className="space-y-1.5 text-sm text-gray-600">
                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5" />
                        <p>Follow-up hanya berjalan di <strong className="text-gray-800">sesi yang sama</strong> — kalau halaman di-refresh atau pindah sesi, cache hilang.</p>
                      </div>
                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5" />
                        <p>Kalau kamu menyebut kata topik baru (misal: <em>"P3B"</em>, <em>"transfer pricing"</em>), KAPHA otomatis anggap itu pertanyaan baru dan retrieval ulang.</p>
                      </div>
                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5" />
                        <p>Compare mode aktif kalau kamu pakai kata: <em>"bandingkan"</em>, <em>"compare"</em>, <em>"vs"</em>, atau <em>"bedakan"</em>.</p>
                      </div>
                    </div>
                  </Section>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-3 border-t border-[var(--pajak-border)]">
              <p className="text-[10px] text-gray-400 text-center">
                BGE-M3 embedding · CrossEncoder reranker · Selalu verifikasi ke SIPP MA sebelum digunakan secara profesional
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
