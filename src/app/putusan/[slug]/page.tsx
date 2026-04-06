"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Scale,
  BookOpen,
  Landmark,
  Coins,
  User,
  Users,
  Calendar,
  Globe,
  ChevronRight,
} from "lucide-react";
import Navbar from "../../../components/Navbar";

interface PutusanRow {
  nomor_putusan_pp: string;
  nomor_putusan_pk?: string;
  amar_putusan: string;
  jenis_pajak?: string;
  upaya_hukum?: string;
  pengadilan?: string;
  tahun_pajak?: string | number;
  tanggal_putusan?: string;
  negara_lawan_transaksi?: string;
  nilai_sengketa?: string | number;
  pemohon?: string;
  termohon?: string;
  hakim_ketua?: string;
  hakim_anggota?: string | string[];
  preview_sengketa?: string;
  objek_sengketa?: string;
  pos_koreksi?: string;
  argumen_pemohon?: string;
  argumen_terbanding?: string;
  dasar_hukum_fiskus?: string;
  alat_bukti?: string;
  pertimbangan_hakim?: string;
  alasan_keputusan?: string;
  amar_detail?: string;
}

type TabKey = "ringkasan" | "argumen" | "pertimbangan" | "amar";

// ── Status color system — sama persis dengan grafik dashboard ─────────────────
function getStatusConfig(amar: string) {
  const l = (amar ?? "").toLowerCase();

  if (l.includes("seluruh") || (l.includes("kabul") && !l.includes("sebagian")))
    return {
      color: "#10B981",
      bg: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.25)",
      badgeBg: "rgba(16,185,129,0.12)",
      badgeText: "#065f46",
      label: "Mengabulkan Seluruhnya",
    };

  if (l.includes("sebagian"))
    return {
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.25)",
      badgeBg: "rgba(245,158,11,0.12)",
      badgeText: "#78350f",
      label: "Mengabulkan Sebagian",
    };

  if (l.includes("tolak") || l.includes("menolak"))
    return {
      color: "#EF4444",
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.25)",
      badgeBg: "rgba(239,68,68,0.12)",
      badgeText: "#7f1d1d",
      label: "Menolak",
    };

  if (l.includes("tidak") || l.includes("diterima"))
    return {
      color: "#6B7280",
      bg: "rgba(107,114,128,0.08)",
      border: "rgba(107,114,128,0.25)",
      badgeBg: "rgba(107,114,128,0.12)",
      badgeText: "#1f2937",
      label: "Tidak Diterima",
    };

  if (l.includes("membatalkan") || l.includes("batal"))
    return {
      color: "#8B5CF6",
      bg: "rgba(139,92,246,0.08)",
      border: "rgba(139,92,246,0.25)",
      badgeBg: "rgba(139,92,246,0.12)",
      badgeText: "#4c1d95",
      label: "Membatalkan",
    };

  // Lain-lain → sky blue
  return {
    color: "#0EA5E9",
    bg: "rgba(14,165,233,0.08)",
    border: "rgba(14,165,233,0.25)",
    badgeBg: "rgba(14,165,233,0.12)",
    badgeText: "#0c4a6e",
    label: amar || "Lain-lain",
  };
}

function parseHakim(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function formatCurrency(val?: string | number): string {
  if (val == null || val === "") return "-";
  const num =
    typeof val === "number" ? val : parseInt(String(val).replace(/\D/g, ""), 10);
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

// ── Info Pill ─────────────────────────────────────────────────────────────────
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
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
      style={{
        background: `${color}0d`,
        borderColor: `${color}30`,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex flex-col leading-tight">
        <span
          className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
          style={{ color: `${color}99`, fontFamily: "var(--font-montserrat)" }}
        >
          {label}
        </span>
        <span
          className="text-[13px] font-semibold text-gray-800"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {value || "-"}
        </span>
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  label,
  value,
  accent = "#0C81E4",
}: {
  label: string;
  value?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-1 h-4 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <p
          className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-[13px] text-gray-700 leading-relaxed"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {value || "-"}
      </p>
    </div>
  );
}

// ── Party Card ────────────────────────────────────────────────────────────────
function PartyCard({
  role,
  name,
  color,
  icon,
}: {
  role: string;
  name?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-5 flex items-start gap-4"
      style={{
        background: `${color}06`,
        borderColor: `${color}20`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}15` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-1"
          style={{ color: `${color}99`, fontFamily: "var(--font-montserrat)" }}
        >
          {role}
        </p>
        <p
          className="text-[14px] font-semibold text-gray-900 leading-snug"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {name || "-"}
        </p>
      </div>
    </div>
  );
}

// ── Tab: Ringkasan ────────────────────────────────────────────────────────────
function RingkasanTab({ d }: { d: PutusanRow }) {
  const hakimAnggota = parseHakim(d.hakim_anggota);

  return (
    <div className="space-y-4">
      {/* Pihak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PartyCard
          role="Pemohon Banding"
          name={d.pemohon}
          color="#EF4444"
          icon={<User size={16} />}
        />
        <PartyCard
          role="Terbanding"
          name={d.termohon}
          color="#10B981"
          icon={<User size={16} />}
        />
      </div>

      {/* Preview */}
      {d.preview_sengketa && (
        <SectionCard
          label="Preview Sengketa"
          value={d.preview_sengketa}
          accent="#0C81E4"
        />
      )}

      {/* Objek & Pos Koreksi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard
          label="Objek Sengketa"
          value={d.objek_sengketa}
          accent="#11C4D4"
        />
        <SectionCard
          label="Pos Koreksi"
          value={d.pos_koreksi}
          accent="#F59E0B"
        />
      </div>

      {/* Majelis Hakim */}
      {(d.hakim_ketua || hakimAnggota.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#0C4E8C]" />
            <p
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Majelis Hakim
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {d.hakim_ketua && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                  <User size={12} className="text-red-500" />
                </div>
                <div>
                  <p
                    className="text-[9px] uppercase text-red-400 font-bold tracking-widest"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    Ketua
                  </p>
                  <p
                    className="text-[12px] font-semibold text-gray-800"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    {d.hakim_ketua}
                  </p>
                </div>
              </div>
            )}
            {hakimAnggota.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Users size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p
                    className="text-[9px] uppercase text-emerald-500 font-bold tracking-widest"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    Anggota
                  </p>
                  <p
                    className="text-[12px] font-semibold text-gray-800"
                    style={{ fontFamily: "var(--font-montserrat)" }}
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

// ── Tab: Argumen ──────────────────────────────────────────────────────────────
function ArgumenTab({ d }: { d: PutusanRow }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pemohon */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
              <User size={13} className="text-red-500" />
            </div>
            <div>
              <p
                className="text-[9px] uppercase font-bold text-red-400 tracking-widest"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Pemohon Banding
              </p>
              <p
                className="text-[11px] font-semibold text-gray-700"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                {d.pemohon || "-"}
              </p>
            </div>
          </div>
          <div className="h-px bg-gray-100 mb-4" />
          <p
            className="text-[13px] text-gray-600 leading-relaxed"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {d.argumen_pemohon || "-"}
          </p>
        </div>

        {/* Terbanding */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <User size={13} className="text-emerald-600" />
            </div>
            <div>
              <p
                className="text-[9px] uppercase font-bold text-emerald-500 tracking-widest"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Terbanding
              </p>
              <p
                className="text-[11px] font-semibold text-gray-700"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                {d.termohon || "-"}
              </p>
            </div>
          </div>
          <div className="h-px bg-gray-100 mb-4" />
          <p
            className="text-[13px] text-gray-600 leading-relaxed"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {d.argumen_terbanding || "-"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard
          label="Dasar Hukum Fiskus"
          value={d.dasar_hukum_fiskus}
          accent="#8B5CF6"
        />
        <SectionCard label="Alat Bukti" value={d.alat_bukti} accent="#F59E0B" />
      </div>
    </div>
  );
}

// ── Tab: Pertimbangan ─────────────────────────────────────────────────────────
function PertimbanganTab({ d }: { d: PutusanRow }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 rounded-full bg-[#0C81E4]" />
        <p
          className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Pertimbangan Majelis Hakim
        </p>
      </div>
      <p
        className="text-[13px] text-gray-700 leading-relaxed"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {d.pertimbangan_hakim || "-"}
      </p>
    </div>
  );
}

// ── Tab: Amar ─────────────────────────────────────────────────────────────────
function AmarTab({
  d,
  statusConfig,
}: {
  d: PutusanRow;
  statusConfig: ReturnType<typeof getStatusConfig>;
}) {
  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className="rounded-2xl border-2 p-6 flex items-center gap-5"
        style={{
          background: statusConfig.bg,
          borderColor: statusConfig.border,
        }}
      >
        {/* Icon circle */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: statusConfig.color + "20" }}
        >
          <Scale size={24} style={{ color: statusConfig.color }} />
        </div>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{
              color: statusConfig.color + "99",
              fontFamily: "var(--font-montserrat)",
            }}
          >
            Status Putusan Akhir
          </p>
          <p
            className="text-3xl font-black leading-none"
            style={{
              color: statusConfig.color,
              fontFamily: "var(--font-coolvetica)",
            }}
          >
            {(d.amar_putusan ?? "").toUpperCase()}
          </p>
          <p
            className="text-xs mt-1.5"
            style={{
              color: statusConfig.color + "aa",
              fontFamily: "var(--font-montserrat)",
            }}
          >
            Permohonan Banding {d.pemohon ?? ""}{" "}
            {(d.amar_putusan ?? "").toLowerCase()} seluruhnya
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard
          label="Alasan Putusan"
          value={d.alasan_keputusan}
          accent={statusConfig.color}
        />
        <SectionCard
          label="Amar Putusan"
          value={d.amar_detail}
          accent={statusConfig.color}
        />
      </div>
    </div>
  );
}

// ── TABS CONFIG ───────────────────────────────────────────────────────────────
const TABS: { key: TabKey; label: string }[] = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "argumen", label: "Argumen Para Pihak" },
  { key: "pertimbangan", label: "Pertimbangan Hukum" },
  { key: "amar", label: "Amar Putusan" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PutusanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = decodeURIComponent(params.slug as string);

  const [data, setData] = useState<PutusanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("ringkasan");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/putusan/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const statusConfig = data ? getStatusConfig(data.amar_putusan) : null;
  const nomorDisplay = data?.nomor_putusan_pp || data?.nomor_putusan_pk || "-";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F6F9" }}>
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-8 py-7">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C81E4] transition-colors font-medium"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
          <ChevronRight size={12} className="text-gray-300" />
          <span
            className="text-sm text-gray-400 truncate max-w-xs"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {nomorDisplay}
          </span>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-[#0C81E4] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p
              className="text-sm text-gray-400"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Memuat putusan…
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center">
            <p
              className="text-red-600 text-xl mb-1"
              style={{ fontFamily: "var(--font-coolvetica)" }}
            >
              ⚠️ Putusan tidak ditemukan
            </p>
            <p
              className="text-red-400 text-sm"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {error}
            </p>
          </div>
        )}

        {/* ── Content ── */}
        {data && statusConfig && !loading && (
          <>
            {/* ── Hero Header ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7 mb-5">
              {/* Top row: nomor + PDF btn */}
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    Nomor Putusan
                  </p>
                  <h1
                    className="text-[#0C4E8C] leading-tight break-all"
                    style={{
                      fontFamily: "var(--font-coolvetica)",
                      fontSize: "clamp(1.4rem, 3vw, 2.1rem)",
                    }}
                  >
                    {nomorDisplay}
                  </h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status badge */}
                  <span
                    className="text-sm px-4 py-1.5 rounded-full font-bold border"
                    style={{
                      backgroundColor: statusConfig.badgeBg,
                      color: statusConfig.color,
                      borderColor: statusConfig.border,
                      fontFamily: "var(--font-montserrat)",
                    }}
                  >
                    {data.amar_putusan}
                  </span>

                  {/* PDF button */}
                  <a
                    href={`/pdf/${encodeURIComponent(nomorDisplay)}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
                    style={{
                      backgroundColor: "#0C81E4",
                      color: "white",
                      fontFamily: "var(--font-montserrat)",
                    }}
                  >
                    <FileText size={12} />
                    Lihat PDF
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mb-4" />

              {/* Meta info row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: "Pemohon Banding", value: data.pemohon },
                  { label: "Terbanding", value: data.termohon },
                  { label: "Tahun Pajak", value: data.tahun_pajak?.toString() },
                  {
                    label: "Tanggal Putusan",
                    value: formatDate(data.tanggal_putusan),
                  },
                  {
                    label: "Negara Lawan",
                    value: data.negara_lawan_transaksi,
                  },
                ]
                  .filter((m) => m.value)
                  .map((m) => (
                    <div key={m.label}>
                      <p
                        className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {m.label}
                      </p>
                      <p
                        className="text-[12px] font-semibold text-gray-800 leading-snug"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {m.value || "-"}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 my-4" />

              {/* Info Pills — di dalam hero card */}
              <div className="flex flex-wrap gap-2.5">
                {data.jenis_pajak && (
                  <InfoPill icon={<Coins size={14} />} label="Jenis Pajak" value={data.jenis_pajak} color="#0C81E4" />
                )}
                {data.upaya_hukum && (
                  <InfoPill icon={<BookOpen size={14} />} label="Upaya Hukum" value={data.upaya_hukum} color="#11C4D4" />
                )}
                {data.pengadilan && (
                  <InfoPill icon={<Landmark size={14} />} label="Pengadilan" value={data.pengadilan} color="#4FE7AF" />
                )}
                {data.nilai_sengketa && (
                  <InfoPill icon={<Scale size={14} />} label="Nilai Sengketa" value={formatCurrency(data.nilai_sengketa)} color="#F59E0B" />
                )}
                {data.negara_lawan_transaksi && (
                  <InfoPill icon={<Globe size={14} />} label="Negara Lawan" value={data.negara_lawan_transaksi} color="#EC4899" />
                )}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Tab nav */}
              <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="relative shrink-0 pb-3.5 pt-4 px-1 mr-6 text-sm font-semibold transition-colors whitespace-nowrap"
                      style={{
                        color: isActive ? "#0C81E4" : "#9ca3af",
                        fontFamily: "var(--font-montserrat)",
                      }}
                    >
                      {tab.label}
                      {isActive && (
                        <span
                          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                          style={{ backgroundColor: "#0C81E4" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeTab === "ringkasan" && <RingkasanTab d={data} />}
                {activeTab === "argumen" && <ArgumenTab d={data} />}
                {activeTab === "pertimbangan" && (
                  <PertimbanganTab d={data} />
                )}
                {activeTab === "amar" && (
                  <AmarTab d={data} statusConfig={statusConfig} />
                )}
              </div>
            </div>

            {/* ── Bottom back ── */}
            <div className="flex justify-center mt-6 mb-2">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:border-[#0C81E4] hover:text-[#0C81E4] transition-all shadow-sm"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                <ArrowLeft size={13} />
                Kembali ke Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}