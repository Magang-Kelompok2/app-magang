"use client";

import { useState } from "react";
import { X, BookOpen, ChevronDown, ChevronRight } from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "cara-kerja",
    title: "Cara Kerja KAPHA",
    icon: "⚙️",
    content: (
      <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          KAPHA bukan search engine biasa. Dia mencari putusan yang paling mirip
          secara <strong>semantik</strong> — bukan by kata kunci atau filter tahun.
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1.5">
          <p className="font-bold text-blue-800 text-xs uppercase tracking-wider mb-2">Alur Kerja</p>
          {[
            "Pertanyaan kamu diubah jadi vektor (representasi matematis maknanya)",
            "Sistem mencari 5 putusan paling mirip di database PostgreSQL",
            "Putusan relevan (skor ≥ 40%) dikirim ke Llama 3 sebagai konteks",
            "Llama 3 merangkum dan menjawab berdasarkan data tersebut",
            "Nomor putusan divalidasi — jika tidak ada di DB, muncul peringatan ⚠️",
          ].map((step, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-gray-700">{step}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-gray-800">Konsekuensinya:</p>
          <p>• KAPHA <strong>tidak bisa filter by tahun</strong> atau nama perusahaan secara langsung</p>
          <p>• Semakin spesifik isu hukumnya, semakin baik hasil retrievalnya</p>
          <p>• Pertanyaan terlalu umum → retrieval campur-campur → jawaban tidak fokus</p>
        </div>
      </div>
    ),
  },
  {
    id: "jenis-pertanyaan",
    title: "Jenis Pertanyaan",
    icon: "💬",
    content: (
      <div className="space-y-5 text-sm text-gray-700">

        {/* Topik */}
        <div>
          <p className="font-bold text-gray-800 mb-2">1. Pertanyaan Topik (Retrieval Baru)</p>
          <p className="mb-3 text-gray-600">Untuk mencari putusan berdasarkan isu hukum. Paling sering dipakai.</p>
          <div className="rounded-xl overflow-hidden border border-gray-200 text-xs">
            <div className="grid grid-cols-2">
              <div className="bg-red-600 text-white font-bold px-3 py-2">❌ Kurang Tepat</div>
              <div className="bg-green-700 text-white font-bold px-3 py-2">✅ Lebih Baik</div>
            </div>
            {[
              ["Cari putusan tahun 2023 royalti", "Koreksi PPh 26 atas royalti ke afiliasi Singapura — dasar hukum DJP"],
              ["Cari putusan transfer pricing", "Koreksi TP metode TNMM yang dikabulkan hakim"],
              ["Putusan tentang pajak", "Sengketa Beneficial Owner atas bunga pinjaman ke Belanda — DJP kalah"],
              ["Cari putusan P3B terbaru", "Kasus treaty shopping di mana tarif P3B tidak diakui hakim"],
            ].map(([bad, good], i) => (
              <div key={i} className={`grid grid-cols-2 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <div className="px-3 py-2 border-r border-gray-200 text-red-700 italic">{bad}</div>
                <div className="px-3 py-2 text-green-800">{good}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up */}
        <div>
          <p className="font-bold text-gray-800 mb-2">2. Follow-up (Perdalam Hasil Sebelumnya)</p>
          <p className="mb-3 text-gray-600">
            Setelah KAPHA jawab, langsung gali lebih dalam tanpa ketik ulang topik.
            Sistem otomatis pakai data yang sama.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
            <p className="font-bold text-amber-800 text-xs uppercase tracking-wider mb-2">Frasa Trigger</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-amber-900">
              {[
                '"Dari daftar tersebut..."',
                '"Dari putusan tadi..."',
                '"Apa alasan utama..."',
                '"Dokumen apa yang..."',
                '"Kenapa hakim / DJP..."',
                '"Jelaskan lebih dalam..."',
                '"Yang nomor [1-5]..."',
                '"Putusan yang kalah..."',
              ].map((f, i) => (
                <div key={i} className="bg-amber-100 rounded px-2 py-1">{f}</div>
              ))}
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-200 text-xs">
            <div className="grid grid-cols-2">
              <div className="bg-red-600 text-white font-bold px-3 py-2">❌ Kurang Tepat</div>
              <div className="bg-green-700 text-white font-bold px-3 py-2">✅ Lebih Baik</div>
            </div>
            {[
              ["Kenapa 2 bisa menang?", "Dari putusan tadi, kenapa yang nomor 2 bisa menang?"],
              ["Dokumen apa yang kuat?", "Dari daftar tersebut, dokumen apa yang dianggap hakim paling kuat?"],
              ["Apa alasan DJP koreksi?", "Apa alasan utama DJP melakukan koreksi di putusan-putusan tadi?"],
            ].map(([bad, good], i) => (
              <div key={i} className={`grid grid-cols-2 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <div className="px-3 py-2 border-r border-gray-200 text-red-700 italic">{bad}</div>
                <div className="px-3 py-2 text-green-800">{good}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compare */}
        <div>
          <p className="font-bold text-gray-800 mb-2">3. Compare Mode</p>
          <p className="mb-3 text-gray-600">Bandingkan dua putusan atau lebih dari hasil pencarian sebelumnya.</p>
          <div className="rounded-xl overflow-hidden border border-gray-200 text-xs">
            <div className="grid grid-cols-2">
              <div className="bg-red-600 text-white font-bold px-3 py-2">❌ Kurang Tepat</div>
              <div className="bg-green-700 text-white font-bold px-3 py-2">✅ Lebih Baik</div>
            </div>
            {[
              ["Bedakan putusan 1 dan 3", "Bandingkan putusan 1 dan 3 — apa perbedaan argumen hakimnya?"],
              ["Compare semua", "Bandingkan semua putusan tadi, mana yang paling kuat posisi WP-nya?"],
            ].map(([bad, good], i) => (
              <div key={i} className={`grid grid-cols-2 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <div className="px-3 py-2 border-r border-gray-200 text-red-700 italic">{bad}</div>
                <div className="px-3 py-2 text-green-800">{good}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "kata-kunci",
    title: "Kata Kunci Efektif",
    icon: "🔑",
    content: (
      <div className="space-y-4 text-sm">
        {[
          {
            topik: "Transfer Pricing",
            color: "bg-purple-50 border-purple-200",
            badge: "bg-purple-100 text-purple-800",
            keywords: ["TNMM", "CUP", "RPM", "arm's length", "hubungan istimewa", "koreksi HPP", "data pembanding", "comparables"],
          },
          {
            topik: "P3B / Tax Treaty",
            color: "bg-blue-50 border-blue-200",
            badge: "bg-blue-100 text-blue-800",
            keywords: ["beneficial owner", "treaty shopping", "tarif P3B", "SKD", "DGT form", "withholding tax", "anti-avoidance"],
          },
          {
            topik: "BUT (Permanent Establishment)",
            color: "bg-orange-50 border-orange-200",
            badge: "bg-orange-100 text-orange-800",
            keywords: ["bentuk usaha tetap", "time test", "atribusi laba", "BUT konstruksi", "jasa teknis", "agen"],
          },
          {
            topik: "PPh Pasal 26",
            color: "bg-green-50 border-green-200",
            badge: "bg-green-100 text-green-800",
            keywords: ["royalti", "bunga pinjaman", "dividen", "management fee", "tarif 20%", "tarif 10%"],
          },
        ].map(({ topik, color, badge, keywords }) => (
          <div key={topik} className={`rounded-xl border p-3 ${color}`}>
            <p className="font-bold text-gray-800 mb-2">{topik}</p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((k) => (
                <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge}`}>{k}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "batasan",
    title: "Batasan & Peringatan",
    icon: "⚠️",
    content: (
      <div className="space-y-4 text-sm">
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <div className="grid grid-cols-2">
            <div className="bg-green-700 text-white font-bold px-3 py-2 text-xs">✅ Bisa</div>
            <div className="bg-gray-600 text-white font-bold px-3 py-2 text-xs">⛔ Tidak Bisa / Hati-hati</div>
          </div>
          {[
            ["Cari by topik / isu hukum", "Filter by tahun → gunakan topik saja"],
            ["Follow-up di sesi yang sama", "Follow-up setelah halaman di-refresh"],
            ["Bandingkan 2+ putusan dari sesi sama", "Bandingkan putusan dari sesi berbeda"],
            ["Analisis pola putusan", "Minta nomor putusan spesifik yang tidak ada di DB"],
          ].map(([bisa, tidak], i) => (
            <div key={i} className={`grid grid-cols-2 text-xs ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
              <div className="px-3 py-2 border-r border-gray-200 text-green-800">{bisa}</div>
              <div className="px-3 py-2 text-gray-600">{tidak}</div>
            </div>
          ))}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-bold text-red-700 mb-2">⚠️ Peringatan Halusinasi</p>
          <p className="text-gray-700 mb-2">
            Jika muncul peringatan di bawah jawaban, artinya KAPHA menyebut
            nomor putusan yang <strong>tidak ada di database</strong>.
          </p>
          <div className="bg-red-100 rounded-lg px-3 py-2 font-mono text-xs text-red-800">
            ⚠️ Peringatan Validasi: 1 nomor tidak ditemukan<br />
            &nbsp;&nbsp;• 345/B/PK/PJK/2023
          </div>
          <p className="text-gray-600 text-xs mt-2">
            Analisis umum biasanya masih valid, tapi verifikasi ke SIPP MA
            sebelum digunakan untuk pekerjaan nyata.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "contoh-sesi",
    title: "Contoh Sesi Ideal",
    icon: "🎯",
    content: (
      <div className="space-y-3 text-sm text-gray-700">
        <p className="text-gray-500 italic">Topik: Sengketa Beneficial Owner atas Bunga Pinjaman</p>
        {[
          { step: 1, label: "Buka topik", msg: "Putusan sengketa beneficial owner atas pembayaran bunga ke Belanda — DJP menang" },
          { step: 2, label: "Gali alasan", msg: "Dari daftar tersebut, apa alasan utama hakim menerima argumen DJP?" },
          { step: 3, label: "Fokus satu putusan", msg: "Jelaskan lebih dalam yang nomor 2 — apa yang membuat posisi WP lemah?" },
          { step: 4, label: "Bandingkan", msg: "Bandingkan putusan 1 dan 3 dari sisi kelengkapan dokumen yang diajukan WP" },
          { step: 5, label: "Kesimpulan praktis", msg: "Dari putusan-putusan tadi, dokumen apa yang wajib disiapkan WP untuk menang?" },
        ].map(({ step, label, msg }) => (
          <div key={step} className="flex gap-3">
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-[var(--pajak-primary)] text-white text-xs font-bold flex items-center justify-center">
                {step}
              </div>
              {step < 5 && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>
            <div className="pb-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <div className="bg-gray-100 rounded-xl px-3 py-2 text-gray-800 text-xs italic">
                "{msg}"
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

// ── Accordion Item ─────────────────────────────────────────────────────────────
function AccordionItem({ section, isOpen, onToggle }: {
  section: typeof SECTIONS[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-[var(--pajak-border)] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{section.icon}</span>
          <span className="font-semibold text-sm text-gray-800" style={{ fontFamily: "var(--font-montserrat)" }}>
            {section.title}
          </span>
        </div>
        {isOpen
          ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
          : <ChevronRight size={16} className="text-gray-400 shrink-0" />
        }
      </button>
      {isOpen && (
        <div className="px-4 py-4 border-t border-[var(--pajak-border)] bg-white">
          {section.content}
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function PanduanModal() {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("cara-kerja");

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--pajak-primary)] border border-[var(--pajak-primary)]/30 bg-[var(--pajak-primary)]/5 hover:bg-[var(--pajak-primary)]/10 px-3 py-1.5 rounded-lg transition-colors"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        <BookOpen size={13} />
        Panduan Prompting
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Modal */}
          <div
            className="bg-[var(--pajak-light)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-[var(--pajak-border)]">
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: "var(--font-coolvetica)", fontSize: "1.25rem" }}>
                  Panduan Prompting KAPHA
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Cara bertanya yang tepat untuk hasil yang akurat</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Quick tips bar */}
            <div className="shrink-0 px-6 py-3 bg-blue-50 border-b border-blue-100">
              <p className="text-xs text-blue-800">
                <strong>💡 Tips cepat:</strong> Pertanyaan 15–40 kata paling akurat · Gunakan istilah teknis (TNMM, BO, SKD) · Satu sesi = satu topik
              </p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {SECTIONS.map((section) => (
                <AccordionItem
                  key={section.id}
                  section={section}
                  isOpen={openSection === section.id}
                  onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-3 bg-white border-t border-[var(--pajak-border)] text-center">
              <p className="text-[11px] text-gray-400">
                KAPHA menggunakan Llama 3 + pgvector · Selalu verifikasi ke SIPP MA untuk keperluan profesional
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}