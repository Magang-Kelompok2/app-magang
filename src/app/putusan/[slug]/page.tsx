"use client";

import "pdfjs-dist/web/pdf_viewer.css";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  FileText,
  X,
  Scale,
  Gavel,
  BookOpen,
  Landmark,
  Coins,
  User,
  Users,
  Calendar,
  Globe,
  ChevronRight,
  Search,
  Download,
  ChevronLeft,
} from "lucide-react";

interface PutusanRow {
  nomor_putusan_pp: string;
  nomor_putusan_pk?: string;
  amar_putusan: string;
  jenis_pajak?: string;
  jenis_sengketa?: string[];
  upaya_hukum?: string;
  pengadilan?: string;
  tahun_pajak?: string | number;
  tanggal_putusan?: string;
  negara_lawan_transaksi?: string;
  nilai_sengketa?: string | number;
  pemohon?: string;
  terbanding?: string;
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
  alasan_putusan?: string;
  alasan_keputusan?: string;
  amar_detail?: string;
  nama_file?: string;
}

type TabKey = "ringkasan" | "argumen" | "pertimbangan" | "amar";


// ── Safe display helpers ──────────────────────────────────────────────────────

function display(value: string | number | undefined | null, fallback = "-"): string {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
}

function getDisplayNomor(row: Pick<PutusanRow, "nomor_putusan_pk" | "nomor_putusan_pp">) {
  return display(row.nomor_putusan_pk ?? row.nomor_putusan_pp);
}

function getPartyLabels(hasPk: boolean) {
  return hasPk
    ? {
        primary: "Pemohon Peninjauan Kembali",
        secondary: "Termohon Peninjauan Kembali",
        nomor: "Nomor Putusan PK",
      }
    : {
        primary: "Pemohon Banding",
        secondary: "Terbanding",
        nomor: "Nomor Putusan",
      };
}

function getStatusConfig(amar: string) {
  const l = (amar ?? "").toLowerCase();

  if (l.includes("seluruh") || (l.includes("kabul") && !l.includes("sebagian"))) {
    return { color: "#059669", bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.35)", badgeBg: "rgba(5,150,105,0.14)" };
  }
  if (l.includes("sebagian")) {
    return { color: "#D97706", bg: "rgba(217,119,6,0.10)", border: "rgba(217,119,6,0.35)", badgeBg: "rgba(217,119,6,0.14)" };
  }
  if (l.includes("tolak") || l.includes("menolak")) {
    return { color: "#DC2626", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.35)", badgeBg: "rgba(220,38,38,0.14)" };
  }
  if (l.includes("tidak") || l.includes("diterima")) {
    return { color: "#64748B", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.35)", badgeBg: "rgba(100,116,139,0.14)" };
  }
  if (l.includes("membatalkan") || l.includes("batal")) {
    return { color: "#0E7490", bg: "rgba(14,116,144,0.10)", border: "rgba(14,116,144,0.35)", badgeBg: "rgba(14,116,144,0.14)" };
  }
  return { color: "#B45309", bg: "rgba(180,83,9,0.10)", border: "rgba(180,83,9,0.35)", badgeBg: "rgba(180,83,9,0.14)" };
}

function getSengketaColor(s: string): { bg: string; border: string; text: string } {
  const lower = s.toLowerCase();
  if (lower.includes("transfer pricing"))
    return { bg: "#EFF6FF", border: "#93C5FD", text: "#1D4ED8" };
  if (lower.includes("tax treaty") || lower.includes("but"))
    return { bg: "#FFF7ED", border: "#FDBA74", text: "#C2410C" };
  if (lower.includes("ppn"))
    return { bg: "#F0FDF4", border: "#6EE7B7", text: "#065F46" };
  if (lower.includes("pph badan") || (lower.includes("pph") && lower.includes("badan")))
    return { bg: "#FEFCE8", border: "#FDE047", text: "#854D0E" };
  if (lower.includes("pph pasal"))
    return { bg: "#F5F3FF", border: "#C4B5FD", text: "#5B21B6" };
  if (lower.includes("pph orang") || lower.includes("pribadi"))
    return { bg: "#FDF4FF", border: "#E879F9", text: "#86198F" };
  if (lower.includes("bea masuk") || lower.includes("cukai"))
    return { bg: "#FFF1F2", border: "#FDA4AF", text: "#BE123C" };
  if (lower.includes("pajak bumi") || lower.includes("pbb"))
    return { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" };
  return { bg: "#F8FAFC", border: "#CBD5E1", text: "#475569" };
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
  if (val == null || val === "" || String(val).trim().toLowerCase() === "null") return "-";
  const num = typeof val === "number" ? val : parseInt(String(val).replace(/\D/g, ""), 10);
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

// ── Sub-components ────────────────────────────────────────────────────────────

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
      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: `${color}0d`,
        borderTop: "1px solid rgba(0,0,0,0.07)",
        borderRight: "1px solid rgba(0,0,0,0.07)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        borderLeft: `3px solid ${color}`,
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
          {value}
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  label,
  value,
  accent = "#0C81E4",
}: {
  label: string;
  value?: string;
  accent?: string;
}) {
  const shown = display(value);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
        <p
          className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {label}
        </p>
      </div>
      <p
        className={`text-[14px] leading-relaxed ${shown === "-" ? "text-gray-400 italic" : "text-gray-700"}`}
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {shown}
      </p>
    </div>
  );
}

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
  const shown = display(name);
  return (
    <div
      className="rounded-2xl border-2 p-5 flex items-start gap-4"
      style={{ background: `${color}12`, borderColor: `${color}50` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}25` }}
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
          className={`text-[14px] font-semibold leading-snug ${shown === "-" ? "text-gray-400 italic" : "text-gray-900"}`}
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {shown}
        </p>
      </div>
    </div>
  );
}

// ── PDF Modal ─────────────────────────────────────────────────────────────────

function PdfModal({ namaFile, onClose }: { namaFile: string; onClose: () => void }) {
  const blobUrlRef = useRef<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchInfo, setMatchInfo] = useState<{ current: number; total: number } | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerDivRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventBusRef = useRef<any>(null);
  const viewerSetup = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pdf/${encodeURIComponent(namaFile)}`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch((err) => console.error("Failed to load PDF:", err));
    return () => {
      cancelled = true;
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, [namaFile]);

  useEffect(() => {
    if (!blobUrl || viewerSetup.current || !containerRef.current || !viewerDivRef.current) return;
    viewerSetup.current = true;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).pdfjsLib = pdfjs;

        const pdfjsViewer = await import("pdfjs-dist/web/pdf_viewer.mjs");

        const eventBus = new pdfjsViewer.EventBus();
        eventBusRef.current = eventBus;
        const linkService = new pdfjsViewer.PDFLinkService({ eventBus });
        const findController = new pdfjsViewer.PDFFindController({ linkService, eventBus });

        const pdfViewer = new pdfjsViewer.PDFViewer({
          container: containerRef.current!,
          viewer: viewerDivRef.current!,
          eventBus,
          linkService,
          findController,
          textLayerMode: 2,
        });
        linkService.setViewer(pdfViewer);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventBus.on("updatefindmatchescount", ({ matchesCount }: any) => {
          setMatchInfo({ current: matchesCount.current, total: matchesCount.total });
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventBus.on("updatefindcontrolstate", ({ state, matchesCount }: any) => {
          if (matchesCount) {
            setMatchInfo({ current: matchesCount.current, total: matchesCount.total });
          } else if (state === 3) {
            setMatchInfo({ current: 0, total: 0 });
          }
        });

        const loadingTask = pdfjs.getDocument(blobUrl);
        const pdfDocument = await loadingTask.promise;
        pdfViewer.setDocument(pdfDocument);
        linkService.setDocument(pdfDocument, null);
        setViewerReady(true);
      } catch (err) {
        console.error("Failed to setup PDF viewer:", err);
      }
    })();
  }, [blobUrl]);

  const execFind = (type: "find" | "findagain", findPrevious = false) => {
    if (!eventBusRef.current || !searchTerm.trim()) return;
    eventBusRef.current.dispatch("find", {
      query: searchTerm.trim(),
      highlightAll: true,
      caseSensitive: false,
      phraseSearch: true,
      findPrevious,
      type: type === "findagain" ? "again" : "",
    });
  };

  return (
    <div className="fixed h-full inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <style>{`
        .textLayer .highlight { background-color: rgba(250, 204, 21, 0.45) !important; border-radius: 2px; }
        .textLayer .highlight.selected { background-color: rgba(234, 88, 12, 0.55) !important; }
        .pdfViewer .page { margin: 12px auto !important; box-shadow: 0 2px 8px rgba(0,0,0,0.18); border-radius: 2px; }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b shrink-0">
          <div className="min-w-0 flex-1">
            <span className="text-sm text-gray-700 truncate block max-w-[400px]">{namaFile}</span>
          </div>
          <div className="flex items-center gap-2">
            {blobUrl && (
              <a
                href={blobUrl}
                download={namaFile}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download size={13} />
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-gray-800 hover:bg-red-500 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b bg-white shrink-0">
          <div className="relative min-w-[260px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); execFind("find"); } }}
              placeholder="Cari kata di PDF..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-(--pajak-primary) focus:bg-white"
            />
          </div>
          <button
            onClick={() => execFind("find")}
            disabled={!viewerReady}
            className="rounded-xl bg-(--pajak-primary) px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Cari
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => execFind("findagain", true)}
              disabled={!matchInfo || matchInfo.total === 0}
              className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {matchInfo == null
                ? "—"
                : matchInfo.total === 0
                  ? "Tidak ada hasil"
                  : `${matchInfo.current}/${matchInfo.total} hasil`}
            </span>
            <button
              onClick={() => execFind("findagain", false)}
              disabled={!matchInfo || matchInfo.total === 0}
              className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-gray-100 overflow-hidden">
          {!blobUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">Memuat PDF...</div>
          )}
          <div ref={containerRef} className="absolute inset-0 overflow-auto">
            <div ref={viewerDivRef} className="pdfViewer" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab Content Components ────────────────────────────────────────────────────

function RingkasanTab({ d }: { d: PutusanRow }) {
  const hakimAnggota = parseHakim(d.hakim_anggota);
  const pihakLawan = d.terbanding || d.termohon;
  const labels = getPartyLabels(Boolean(d.nomor_putusan_pk));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PartyCard role={labels.primary} name={d.pemohon} color="#EF4444" icon={<User size={16} />} />
        <PartyCard role={labels.secondary} name={pihakLawan} color="#10B981" icon={<User size={16} />} />
      </div>

      {d.preview_sengketa && (
        <SectionCard label="Preview Sengketa" value={d.preview_sengketa} accent="#0C81E4" />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard label="Objek Sengketa" value={d.objek_sengketa} accent="#11C4D4" />
        <SectionCard label="Pos Koreksi" value={d.pos_koreksi} accent="#F59E0B" />
      </div>

      {(d.hakim_ketua || hakimAnggota.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#0C4E8C]" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>
              Majelis Hakim
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {d.hakim_ketua && (
              <div className="flex items-center gap-3 border-2 border-red-200 bg-red-50 rounded-xl px-4 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                  <User size={12} className="text-red-600" />
                </div>
                <div>
                  <p className="text-[9px] uppercase text-red-600 font-bold tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>Ketua</p>
                  <p className="text-[12px] font-semibold text-gray-800" style={{ fontFamily: "var(--font-montserrat)" }}>{d.hakim_ketua}</p>
                </div>
              </div>
            )}
            {hakimAnggota.map((h, i) => (
              <div key={i} className="flex items-center gap-3 border-2 border-emerald-200 bg-emerald-50 rounded-xl px-4 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Users size={12} className="text-emerald-700" />
                </div>
                <div>
                  <p className="text-[9px] uppercase text-emerald-700 font-bold tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>Anggota</p>
                  <p className="text-[12px] font-semibold text-gray-800" style={{ fontFamily: "var(--font-montserrat)" }}>{h}</p>
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
  const pihakLawan = d.terbanding || d.termohon;
  const labels = getPartyLabels(Boolean(d.nomor_putusan_pk));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border-2 border-red-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
              <User size={13} className="text-white" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-red-600 tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>{labels.primary}</p>
              <p className="text-[11px] font-semibold text-gray-700" style={{ fontFamily: "var(--font-montserrat)" }}>{display(d.pemohon)}</p>
            </div>
          </div>
          <div className="h-px bg-red-100 mb-4" />
          <p className={`text-[14px] leading-relaxed ${!d.argumen_pemohon ? "text-gray-400 italic" : "text-gray-600"}`} style={{ fontFamily: "var(--font-montserrat)" }}>
            {display(d.argumen_pemohon)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-emerald-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <User size={13} className="text-white" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-emerald-700 tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>{labels.secondary}</p>
              <p className="text-[11px] font-semibold text-gray-700" style={{ fontFamily: "var(--font-montserrat)" }}>{display(pihakLawan)}</p>
            </div>
          </div>
          <div className="h-px bg-emerald-100 mb-4" />
          <p className={`text-[14px] leading-relaxed ${!d.argumen_terbanding ? "text-gray-400 italic" : "text-gray-600"}`} style={{ fontFamily: "var(--font-montserrat)" }}>
            {display(d.argumen_terbanding)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard label="Dasar Hukum Fiskus" value={d.dasar_hukum_fiskus} accent="#8B5CF6" />
        <SectionCard label="Alat Bukti" value={d.alat_bukti} accent="#F59E0B" />
      </div>
    </div>
  );
}

function PertimbanganTab({ d }: { d: PutusanRow }) {
  const shown = display(d.pertimbangan_hakim);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 rounded-full bg-[#0C81E4]" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>
          Pertimbangan Majelis Hakim
        </p>
      </div>
      <p
        className={`text-[14px] leading-relaxed ${shown === "-" ? "text-gray-400 italic" : "text-gray-700"}`}
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {shown}
      </p>
    </div>
  );
}

function AmarTab({
  d,
  statusConfig,
}: {
  d: PutusanRow;
  statusConfig: ReturnType<typeof getStatusConfig>;
}) {
  const alasanPutusan = d.alasan_putusan || d.alasan_keputusan;
  const labels = getPartyLabels(Boolean(d.nomor_putusan_pk));

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border-2 p-6 flex items-center gap-5"
        style={{ background: statusConfig.bg, borderColor: statusConfig.border }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: statusConfig.color + "20" }}
        >
          <Gavel size={24} style={{ color: statusConfig.color }} />
        </div>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: statusConfig.color + "99", fontFamily: "var(--font-montserrat)" }}
          >
            Status Putusan Akhir
          </p>
          <p
            className="text-3xl font-extrabold leading-none tracking-wide"
            style={{ color: statusConfig.color, fontFamily: "var(--font-montserrat)" }}
          >
            {(d.amar_putusan ?? "").toUpperCase()}
          </p>
          <p
            className="text-xs mt-1.5"
            style={{ color: statusConfig.color + "aa", fontFamily: "var(--font-montserrat)" }}
          >
            {labels.primary} {display(d.pemohon)} {(d.amar_putusan ?? "").toLowerCase()}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard label="Alasan Putusan" value={alasanPutusan} accent={statusConfig.color} />
        <SectionCard label="Amar Putusan" value={d.amar_detail} accent={statusConfig.color} />
      </div>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "argumen", label: "Argumen Para Pihak" },
  { key: "pertimbangan", label: "Pertimbangan Hukum" },
  { key: "amar", label: "Amar Putusan" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

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
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const statusConfig = data ? getStatusConfig(data.amar_putusan) : null;
  const nomorDisplay = data ? getDisplayNomor(data) : "-";
  const pihakLawan = data?.terbanding || data?.termohon;
  const labels = getPartyLabels(Boolean(data?.nomor_putusan_pk));

  return (
    <div className="min-h-dvh bg-(--pajak-light)">
      {showPdf && data?.nama_file && (
        <PdfModal namaFile={data.nama_file} onClose={() => setShowPdf(false)} />
      )}

      <div className="max-w-360 mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
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

        {/* Loading */}
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
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-montserrat)" }}>
              Memuat putusan...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center">
            <p className="text-red-600 text-xl mb-1" style={{ fontFamily: "var(--font-coolvetica)" }}>
              Putusan tidak ditemukan
            </p>
            <p className="text-red-400 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>{error}</p>
          </div>
        )}

        {data && statusConfig && !loading && (
          <>
            {/* Header card */}
            <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-8 mb-6">
              <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
                <div className="min-w-0 max-w-220">
                  <p
                    className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    {labels.nomor}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mt-1">
                    <h1
                      className="text-[#0C4E8C] leading-tight wrap-break-word"
                      style={{ fontFamily: "var(--font-coolvetica)", fontSize: "clamp(1.55rem, 3vw, 2.25rem)" }}
                    >
                      {nomorDisplay}
                    </h1>
                    <span
                      className="text-sm px-4 py-1.5 rounded-full font-bold border shrink-0"
                      style={{
                        backgroundColor: statusConfig.badgeBg,
                        color: statusConfig.color,
                        borderColor: statusConfig.border,
                        fontFamily: "var(--font-montserrat)",
                      }}
                    >
                      {data.amar_putusan}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setShowPdf(true)}
                    disabled={!data.nama_file}
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#0C81E4", color: "white", fontFamily: "var(--font-montserrat)" }}
                  >
                    <FileText size={12} />
                    Lihat PDF
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-100 mb-4" />

              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
                {[
                  { label: labels.primary, value: display(data.pemohon) },
                  { label: labels.secondary, value: display(pihakLawan) },
                  { label: "Tahun Pajak", value: display(data.tahun_pajak) },
                  { label: "Tanggal Putusan", value: formatDate(data.tanggal_putusan) },
                  { label: "Negara Lawan", value: display(data.negara_lawan_transaksi) },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl bg-gray-100 border border-gray-200 px-4 py-4">
                    <p
                      className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      {m.label}
                    </p>
                    <p
                      className={`text-[13px] font-semibold leading-relaxed wrap-break-word ${m.value === "-" ? "text-gray-400 italic" : "text-gray-800"}`}
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="h-px bg-gray-100 my-4" />

              {/* Info pills */}
              <div className={`grid gap-3 ${data.negara_lawan_transaksi ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"}`}>
                <InfoPill icon={<Coins size={14} />} label="Jenis Pajak" value={display(data.jenis_pajak)} color="#0C81E4" />
                <InfoPill icon={<BookOpen size={14} />} label="Upaya Hukum" value={display(data.upaya_hukum)} color="#11C4D4" />
                <InfoPill icon={<Landmark size={14} />} label="Pengadilan" value={display(data.pengadilan)} color="#059669" />
                <InfoPill icon={<Scale size={14} />} label="Nilai Sengketa" value={formatCurrency(data.nilai_sengketa)} color="#DC2626" />
                <InfoPill icon={<Calendar size={14} />} label="Tanggal Putusan" value={formatDate(data.tanggal_putusan)} color="#7C3AED" />
                {data.negara_lawan_transaksi && (
                  <InfoPill icon={<Globe size={14} />} label="Negara Lawan" value={display(data.negara_lawan_transaksi)} color="#BE185D" />
                )}
              </div>

              {Array.isArray(data.jenis_sengketa) && data.jenis_sengketa.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                    Jenis Sengketa
                  </span>
                  {data.jenis_sengketa.map((s) => {
                    const c = getSengketaColor(s);
                    return (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-full text-[11px] font-semibold border"
                        style={{ background: c.bg, borderColor: c.border, color: c.text, fontFamily: "var(--font-montserrat)" }}
                      >
                        {s}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tabs card */}
            <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100 px-8 overflow-x-auto">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="group relative shrink-0 pb-4 pt-5 px-1 mr-8 text-sm font-semibold whitespace-nowrap transition-all duration-200 hover:text-[#0C81E4]"
                      style={{
                        color: isActive ? "#0C81E4" : "#9ca3af",
                        fontFamily: "var(--font-montserrat)",
                      }}
                    >
                      {tab.label}
                      <span
                        className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all duration-300 origin-center ${
                          isActive
                            ? "opacity-100 scale-x-100"
                            : "opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100"
                        }`}
                        style={{ backgroundColor: "#0C81E4" }}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="p-8">
                {activeTab === "ringkasan" && <RingkasanTab d={data} />}
                {activeTab === "argumen" && <ArgumenTab d={data} />}
                {activeTab === "pertimbangan" && <PertimbanganTab d={data} />}
                {activeTab === "amar" && <AmarTab d={data} statusConfig={statusConfig} />}
              </div>
            </div>

            {/* Back button */}
            <div className="flex justify-center mt-6 mb-2">
              <button
                onClick={() => router.push('/dashboard')}
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
