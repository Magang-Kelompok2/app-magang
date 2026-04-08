"use client";

import "react-pdf/dist/Page/TextLayer.css";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  FileText,
  X,
  Scale,
  BookOpen,
  Landmark,
  Coins,
  User,
  Users,
  Calendar,
  Globe,
} from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
// ── Types ─────────────────────────────────────────────────────────────────────
interface PutusanRow {
  nomor_putusan_pp: string;
  amar_putusan: string;
  jenis_pajak?: string;
  upaya_hukum?: string;
  pengadilan?: string;
  tahun_pajak?: string | number;
  tanggal_putusan?: string;
  negara_lawan_transaksi?: string;
  nilai_sengketa?: string | number;
  pemohon?: string;
  terbanding?: string;
  hakim_ketua?: string;
  hakim_anggota?: string | string[];
  // Ringkasan
  preview_sengketa?: string;
  objek_sengketa?: string;
  pos_koreksi?: string;
  // Argumen
  argumen_pemohon?: string;
  argumen_terbanding?: string;
  dasar_hukum_fiskus?: string;
  alat_bukti?: string;
  // Pertimbangan
  pertimbangan_hakim?: string;
  // Amar
  alasan_putusan?: string;
  amar_detail?: string;
  nama_file?: string;
}

type TabKey = "ringkasan" | "argumen" | "pertimbangan" | "amar";

// ── Helpers ───────────────────────────────────────────────────────────────────
function amarStyle(amar: string) {
  const l = (amar ?? "").toLowerCase();
  if (l.includes("tolak") || l.includes("menolak"))
    return {
      badge: "bg-[#ffacac] text-red-600 border-red-300",
      big: "text-red-600",
    };
  if (l.includes("kabul") || l.includes("menerima"))
    return {
      badge: "bg-emerald-100 text-emerald-700 border-emerald-300",
      big: "text-emerald-600",
    };
  if (l.includes("batal"))
    return {
      badge: "bg-purple-100 text-purple-700 border-purple-300",
      big: "text-purple-600",
    };
  return {
    badge: "bg-amber-100 text-amber-700 border-amber-300",
    big: "text-amber-600",
  };
}

function parseHakim(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatCurrency(val?: string | number): string {
  if (val == null || val === "") return "-";
  const num =
    typeof val === "number"
      ? val
      : parseInt(String(val).replace(/\D/g, ""), 10);
  if (isNaN(num)) return String(val);
  return "Rp " + num.toLocaleString("id-ID");
}

function formatDate(raw?: string): string {
  if (!raw) return "-";
  try {
    return new Date(raw).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

// ── Small components ──────────────────────────────────────────────────────────
function InfoPill({
  icon,
  label,
  value,
  color = "#0C81E4",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 border border-[var(--pajak-border)] shadow-sm">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}22` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex flex-col leading-tight">
        <span
          className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {label}
        </span>
        <span
          className="text-[13px] text-black"
          style={{ fontFamily: "var(--font-coolvetica)" }}
        >
          {value || "-"}
        </span>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--pajak-border)] p-4 shadow-sm">
      <p
        className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {label}
      </p>
      <p
        className="text-[13px] text-gray-800 leading-relaxed"
        style={{ fontFamily: "var(--font-coolvetica)" }}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function PartyCard({
  role,
  name,
  color,
}: {
  role: string;
  name?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--pajak-border)] px-5 py-4 flex items-center gap-3 shadow-sm">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}22` }}
      >
        <User size={14} style={{ color }} />
      </div>
      <div>
        <p
          className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {role}
        </p>
        <p
          className="text-[13px] text-black"
          style={{ fontFamily: "var(--font-coolvetica)" }}
        >
          {name || "-"}
        </p>
      </div>
    </div>
  );
}

// Only the PdfModal component shown — the rest of the page is unchanged

function PdfModal({ namaFile, onClose }: { namaFile: string; onClose: () => void }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfMod, setPdfMod] = useState<any>(null);
  // BUG-07 FIX: Use ref to track the URL for cleanup, avoiding stale closure
  const blobUrlRef = useRef<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("react-pdf").then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"; // ← ubah ini
      if (!cancelled) setPdfMod(mod);
    });

    fetch(`/api/pdf/${encodeURIComponent(namaFile)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url; // store in ref
        setBlobUrl(url);
      })
      .catch((err) => {
        console.error("Failed to load PDF:", err);
      });

    return () => {
      cancelled = true;
      // BUG-07 FIX: Revoke via ref — always has the current URL value
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [namaFile]);

  const { Document, Page } = pdfMod ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <span className="text-sm text-gray-700 truncate max-w-[400px]">{namaFile}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
        {/* body */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center bg-gray-100 p-4 gap-4">
          {!Document || !blobUrl ? (
            <div className="flex items-center justify-center h-40 text-gray-400">Memuat PDF…</div>
          ) : (
            <Document
              file={blobUrl}
              onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <Page
  key={i + 1}
  pageNumber={i + 1}
  width={800}
  className="shadow-md mb-2"
  renderAnnotationLayer={false}
/>
              ))}
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab contents ──────────────────────────────────────────────────────────────
function RingkasanTab({ d }: { d: PutusanRow }) {
  const hakimAnggota = parseHakim(d.hakim_anggota);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PartyCard role="Pemohon Banding" name={d.pemohon} color="#FF0000" />
        <PartyCard role="Terbanding" name={d.terbanding} color="#4FE7AF" />
      </div>
      <Card label="Preview Sengketa" value={d.preview_sengketa} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card label="Objek Sengketa" value={d.objek_sengketa} />
        <Card label="Pos Koreksi" value={d.pos_koreksi} />
      </div>
      {(d.hakim_ketua || hakimAnggota.length > 0) && (
        <div>
          <p
            className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Majelis Hakim
          </p>
          <div className="flex flex-wrap gap-3">
            {d.hakim_ketua && (
              <div className="flex items-center gap-3 bg-white rounded-full border border-[var(--pajak-border)] px-4 py-2.5 shadow-sm">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                  <User size={12} className="text-red-500" />
                </div>
                <div>
                  <p
                    className="text-[9px] uppercase text-gray-400 font-semibold"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    Hakim Ketua
                  </p>
                  <p
                    className="text-[12px] text-black"
                    style={{ fontFamily: "var(--font-coolvetica)" }}
                  >
                    {d.hakim_ketua}
                  </p>
                </div>
              </div>
            )}
            {hakimAnggota.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white rounded-full border border-[var(--pajak-border)] px-4 py-2.5 shadow-sm"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Users size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p
                    className="text-[9px] uppercase text-gray-400 font-semibold"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    Hakim Anggota
                  </p>
                  <p
                    className="text-[12px] text-black"
                    style={{ fontFamily: "var(--font-coolvetica)" }}
                  >
                    {h}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArgumenTab({ d }: { d: PutusanRow }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[var(--pajak-border)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
              <User size={12} className="text-red-500" />
            </div>
            <p
              className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Pemohon Banding
            </p>
          </div>
          <p
            className="text-sm text-gray-800 leading-relaxed"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {d.argumen_pemohon || "-"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--pajak-border)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <User size={12} className="text-emerald-600" />
            </div>
            <p
              className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Terbanding
            </p>
          </div>
          <p
            className="text-sm text-gray-800 leading-relaxed"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {d.argumen_terbanding || "-"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card label="Dasar Hukum Fiskus" value={d.dasar_hukum_fiskus} />
        <Card label="Alat Bukti" value={d.alat_bukti} />
      </div>
    </div>
  );
}

function PertimbanganTab({ d }: { d: PutusanRow }) {
  return (
    <Card label="Pertimbangan Majelis Hakim" value={d.pertimbangan_hakim} />
  );
}

function AmarTab({ d }: { d: PutusanRow }) {
  const style = amarStyle(d.amar_putusan);
  return (
    <div className="space-y-4">
      <div
        className="bg-white rounded-2xl border-2 p-6 shadow-sm"
        style={{
          borderColor: d.amar_putusan?.toLowerCase().includes("tolak")
            ? "#ffacac"
            : d.amar_putusan?.toLowerCase().includes("kabul")
              ? "#6ee7b7"
              : "#fcd34d",
        }}
      >
        <p
          className="text-[10px] uppercase font-semibold text-gray-400 tracking-widest mb-1"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Status Putusan Akhir
        </p>
        <p
          className={`text-5xl ${style.big} leading-none`}
          style={{ fontFamily: "var(--font-coolvetica)" }}
        >
          {(d.amar_putusan ?? "").toUpperCase()}
        </p>
        <p
          className="text-xs text-gray-400 mt-2"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Permohonan Banding {d.pemohon ?? ""}{" "}
          {(d.amar_putusan ?? "").toLowerCase()} seluruhnya
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card label="Alasan Putusan" value={d.alasan_putusan} />
        <Card label="Amar Putusan" value={d.amar_detail} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS: { key: TabKey; label: string }[] = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "argumen", label: "Argumen Para Pihak" },
  { key: "pertimbangan", label: "Pertimbangan Hukum" },
  { key: "amar", label: "Amar Putusan" },
];

export default function PutusanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = decodeURIComponent(params.slug as string);

  const [data, setData] = useState<PutusanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("ringkasan");
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/putusan/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        console.log("DATA:", d);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const aStyle = data ? amarStyle(data.amar_putusan) : null;

  return (
    <div className="bg-[#eee] min-h-screen">
      {/* PDF Modal */}
      {showPdf && data?.nama_file && (
        <PdfModal namaFile={data.nama_file} onClose={() => setShowPdf(false)} />
      )}

      {/* Navbar */}
      <header className="bg-[#0C4E8C] px-14 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-[6px] flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-3 h-3 bg-[#0C4E8C] rounded-sm" />
              <div className="flex flex-col gap-0.5">
                <div className="w-3 h-[5.5px] bg-[#0C81E4]" />
                <div className="w-3 h-[5.5px] bg-[#4FE7AF]" />
              </div>
            </div>
          </div>
          <span
            className="text-white text-sm"
            style={{ fontFamily: "var(--font-coolvetica)" }}
          >
            Sistem Informasi Analisis Putusan Pajak
          </span>
        </div>
        <nav className="flex gap-2">
          {["Dashboard", "App", "About"].map((item) => (
            <a
              key={item}
              href={item === "App" ? "/app" : `/${item.toLowerCase()}`}
              className="text-white/75 text-sm font-semibold px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {item}
            </a>
          ))}
        </nav>
      </header>

      <div className="max-w-[1232px] mx-auto px-8 py-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-white border border-[var(--pajak-border)] rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-[var(--pajak-primary)] transition-colors mb-5 shadow-sm"
          style={{ fontFamily: "var(--font-coolvetica)" }}
        >
          <ArrowLeft size={13} /> Kembali
        </button>

        {/* Loading */}
        {loading && (
          <div
            className="flex items-center justify-center gap-2 py-24 text-gray-400"
            style={{ fontFamily: "var(--font-coolvetica)" }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[var(--pajak-primary)] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
            <span className="ml-2">Memuat putusan…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p
              className="text-red-600 text-lg"
              style={{ fontFamily: "var(--font-coolvetica)" }}
            >
              ⚠️ Putusan tidak ditemukan
            </p>
            <p
              className="text-red-400 text-sm mt-1"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Content */}
        {data && !loading && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h1
                  className="text-[#0C4E8C] text-4xl leading-tight"
                  style={{ fontFamily: "var(--font-coolvetica)" }}
                >
                  {data.nomor_putusan_pp}
                </h1>
                <div className="flex items-center gap-3 flex-wrap mt-3">
                  <span
                    className={`text-sm px-5 py-1.5 rounded-full border font-bold ${aStyle?.badge}`}
                    style={{ fontFamily: "var(--font-coolvetica)" }}
                  >
                    {data.amar_putusan}
                  </span>
                  {data.tanggal_putusan && (
                    <span
                      className="flex items-center gap-1 text-xs text-gray-400"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      <Calendar size={11} />
                      {formatDate(data.tanggal_putusan)}
                    </span>
                  )}
                  {data.negara_lawan_transaksi && (
                    <span
                      className="flex items-center gap-1 text-xs text-gray-400"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      <Globe size={11} />
                      {data.negara_lawan_transaksi}
                    </span>
                  )}
                </div>
              </div>

              {/* PDF button */}
              <button
                onClick={() => setShowPdf(true)}
                disabled={!data.nama_file}
                className="flex items-center gap-1.5 bg-[var(--pajak-primary)] text-white text-xs px-4 py-2.5 rounded-lg hover:brightness-110 transition-all shadow-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: "var(--font-coolvetica)" }}
              >
                <FileText size={12} />
                Lihat PDF
              </button>
            </div>

            {/* Meta row */}
            <div
              className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-1"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {data.pemohon && (
                <>
                  <span className="font-semibold uppercase tracking-wide text-gray-400">
                    Pemohon:
                  </span>
                  <span>{data.pemohon}</span>
                  <span className="text-gray-300">·</span>
                </>
              )}
              {data.terbanding && (
                <>
                  <span className="font-semibold uppercase tracking-wide text-gray-400">
                    Terbanding:
                  </span>
                  <span>{data.terbanding}</span>
                  <span className="text-gray-300">·</span>
                </>
              )}
              {data.tahun_pajak && (
                <>
                  <span className="font-semibold uppercase tracking-wide text-gray-400">
                    Tahun Pajak:
                  </span>
                  <span>{data.tahun_pajak}</span>
                </>
              )}
            </div>

            <div className="h-px bg-[var(--pajak-border)] my-5" />

            {/* Info pills */}
            <div className="flex flex-wrap gap-3 mb-6">
              {data.jenis_pajak && (
                <InfoPill
                  icon={<Coins size={13} />}
                  label="Jenis Pajak"
                  value={data.jenis_pajak}
                  color="#0C81E4"
                />
              )}
              {data.upaya_hukum && (
                <InfoPill
                  icon={<BookOpen size={13} />}
                  label="Upaya Hukum"
                  value={data.upaya_hukum}
                  color="#11C4D4"
                />
              )}
              {data.pengadilan && (
                <InfoPill
                  icon={<Landmark size={13} />}
                  label="Pengadilan"
                  value={data.pengadilan}
                  color="#4FE7AF"
                />
              )}
              {data.nilai_sengketa && (
                <InfoPill
                  icon={<Scale size={13} />}
                  label="Nilai Sengketa"
                  value={formatCurrency(data.nilai_sengketa)}
                  color="#FFB700"
                />
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-[var(--pajak-border)] mb-6">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 text-base whitespace-nowrap transition-colors ${activeTab === tab.key ? "text-[var(--pajak-primary)] border-b-2 border-[var(--pajak-primary)] -mb-px" : "text-gray-500 hover:text-gray-800"}`}
                  style={{ fontFamily: "var(--font-coolvetica)" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "ringkasan" && <RingkasanTab d={data} />}
            {activeTab === "argumen" && <ArgumenTab d={data} />}
            {activeTab === "pertimbangan" && <PertimbanganTab d={data} />}
            {activeTab === "amar" && <AmarTab d={data} />}

            <div className="flex justify-center mt-10 mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 bg-white border border-[var(--pajak-border)] rounded-lg px-5 py-2.5 text-sm text-gray-700 hover:border-[var(--pajak-primary)] transition-colors shadow-sm"
                style={{ fontFamily: "var(--font-coolvetica)" }}
              >
                <ArrowLeft size={13} /> Kembali ke Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
