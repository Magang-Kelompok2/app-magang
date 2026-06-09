"use client";

import {
  useState,
  KeyboardEvent,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader,
  Upload,
} from "lucide-react";
import FilterModal from "../../components/FilterModal";
import DecisionCard from "../../components/DecisionCard";

interface PutusanListItem {
  id: number;
  nomor_putusan_pp?: string;
  nomor_putusan_pk?: string;
  pemohon?: string;
  termohon?: string;
  jenis_pajak?: string;
  jenis_sengketa?: string[];
  amar_putusan?: string;
  upaya_hukum?: string;
  tanggal_putusan?: string;
  objek_sengketa?: string;
  preview_sengketa?: string;
}

interface DashboardFilters {
  status: string[];
  jenisPajak: string[];
  jenisSengketa: string[];
  upayaHukum: string[];
  pengadilan: string[];
  tahunPutusan: [number, number];
  tahunPajak: [number, number];
}

interface DashboardStats {
  menolak: number;
  mengabulkan_seluruhnya: number;
  mengabulkan_sebagian: number;
  tidak_dapat_diterima: number;
  membatalkan: number;
  lainnya: number;
}

interface DashboardResponse {
  items?: PutusanListItem[];
  total?: number;
  stats?: Partial<DashboardStats>;
}

const DEFAULT_FILTERS: DashboardFilters = {
  status: [],
  jenisPajak: [],
  jenisSengketa: [],
  upayaHukum: [],
  pengadilan: [],
  tahunPutusan: [2006, 2024],
  tahunPajak: [2006, 2024],
};

const LS_FILTERS_KEY = "kapha_dashboard_filters_v3";
const LS_KEYWORDS_KEY = "kapha_dashboard_keywords_v1";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or SSR */
  }
}

export default function DashboardPage() {
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [data, setData] = useState<PutusanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    menolak: 0,
    mengabulkan_seluruhnya: 0,
    mengabulkan_sebagian: 0,
    tidak_dapat_diterima: 0,
    membatalkan: 0,
    lainnya: 0,
  });
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "success" | "error" | "info" | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemsPerPage = 8;

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage<DashboardFilters>(
      LS_FILTERS_KEY,
      DEFAULT_FILTERS,
    );
    // Guard against stale shape where pengadilan was a string
    const normalizedFilters: DashboardFilters = {
      ...DEFAULT_FILTERS,
      ...saved,
      pengadilan: Array.isArray(saved.pengadilan) ? saved.pengadilan : [],
    };
    const savedKeywords = loadFromStorage<string[]>(LS_KEYWORDS_KEY, []);
    setFilters(normalizedFilters);
    setActiveKeywords(savedKeywords);
    setHydrated(true);
  }, []);

  // Persist filters & keywords whenever they change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(LS_FILTERS_KEY, filters);
  }, [filters, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(LS_KEYWORDS_KEY, activeKeywords);
  }, [activeKeywords, hydrated]);

  const fetchPutusan = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filters.status.join(","),
        jenisPajak: filters.jenisPajak.join(","),
        jenisSengketa: filters.jenisSengketa.join(","),
        upayaHukum: filters.upayaHukum.join(","),
        pengadilan: filters.pengadilan.join(","),
        tahunPutusan: filters.tahunPutusan.join(","),
        tahunPajak: filters.tahunPajak.join(","),
        search: activeKeywords.join(" "),
      });

      const res = await fetch("/api/putusan?" + params.toString(), {
        cache: "no-store",
      });
      const result: DashboardResponse = await res.json();
      setData(Array.isArray(result.items) ? result.items : []);
      setTotalItems(typeof result.total === "number" ? result.total : 0);
      setStats({
        menolak: Number(result.stats?.menolak ?? 0),
        mengabulkan_seluruhnya: Number(
          result.stats?.mengabulkan_seluruhnya ?? 0,
        ),
        mengabulkan_sebagian: Number(result.stats?.mengabulkan_sebagian ?? 0),
        tidak_dapat_diterima: Number(result.stats?.tidak_dapat_diterima ?? 0),
        membatalkan: Number(result.stats?.membatalkan ?? 0),
        lainnya: Number(result.stats?.lainnya ?? 0),
      });
    } catch (error) {
      console.error("Gagal load data dari database:", error);
      setData([]);
      setTotalItems(0);
      setStats({
        menolak: 0,
        mengabulkan_seluruhnya: 0,
        mengabulkan_sebagian: 0,
        tidak_dapat_diterima: 0,
        membatalkan: 0,
        lainnya: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [filters, activeKeywords]);

  // Fetch only after hydration so we use correct persisted state
  useEffect(() => {
    if (!hydrated) return;
    fetchPutusan();
    setCurrentPage(1);
  }, [fetchPutusan, hydrated]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const activeFilterBadges = useMemo(() => {
    const badges: { label: string; onRemove: () => void }[] = [];
    filters.status.forEach((s) =>
      badges.push({
        label: `Status: ${s}`,
        onRemove: () =>
          setFilters((f) => ({
            ...f,
            status: f.status.filter((x) => x !== s),
          })),
      }),
    );
    filters.jenisPajak.forEach((p) =>
      badges.push({
        label: `Pajak: ${p}`,
        onRemove: () =>
          setFilters((f) => ({
            ...f,
            jenisPajak: f.jenisPajak.filter((x) => x !== p),
          })),
      }),
    );
    filters.jenisSengketa.forEach((s) =>
      badges.push({
        label: `Sengketa: ${s}`,
        onRemove: () =>
          setFilters((f) => ({
            ...f,
            jenisSengketa: f.jenisSengketa.filter((x) => x !== s),
          })),
      }),
    );
    filters.upayaHukum.forEach((u) =>
      badges.push({
        label: `Upaya: ${u}`,
        onRemove: () =>
          setFilters((f) => ({
            ...f,
            upayaHukum: f.upayaHukum.filter((x) => x !== u),
          })),
      }),
    );
    filters.pengadilan.forEach((p) =>
      badges.push({
        label: `Pengadilan: ${p}`,
        onRemove: () =>
          setFilters((f) => ({
            ...f,
            pengadilan: f.pengadilan.filter((x) => x !== p),
          })),
      }),
    );
    if (filters.tahunPutusan[0] !== 2006 || filters.tahunPutusan[1] !== 2024)
      badges.push({
        label: `Thn Putusan: ${filters.tahunPutusan[0]}–${filters.tahunPutusan[1]}`,
        onRemove: () =>
          setFilters((f) => ({ ...f, tahunPutusan: [2006, 2024] })),
      });
    if (filters.tahunPajak[0] !== 2006 || filters.tahunPajak[1] !== 2024)
      badges.push({
        label: `Thn Pajak: ${filters.tahunPajak[0]}–${filters.tahunPajak[1]}`,
        onRemove: () => setFilters((f) => ({ ...f, tahunPajak: [2006, 2024] })),
      });
    return badges;
  }, [filters]);

  const currentData = useMemo(() => {
    const begin = (currentPage - 1) * itemsPerPage;
    return data.slice(begin, begin + itemsPerPage);
  }, [data, currentPage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() !== "") {
      if (!activeKeywords.includes(inputValue.trim())) {
        setActiveKeywords([...activeKeywords, inputValue.trim()]);
      }
      setInputValue("");
    }
  };

  const resetFilters = () => {
    setActiveKeywords([]);
    setFilters(DEFAULT_FILTERS);
    // Also clear localStorage so refresh shows full data
    saveToStorage(LS_FILTERS_KEY, DEFAULT_FILTERS);
    saveToStorage(LS_KEYWORDS_KEY, []);
  };

  const handleUploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadMessage("File harus berupa PDF.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setUploadMessage("Mengupload dan mengekstrak putusan...");

    try {
      const res = await fetch("/api/putusan/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();

      let result: any = {};
      if (contentType.includes("application/json")) {
        result = JSON.parse(raw);
      } else {
        throw new Error(
          `API upload tidak mengembalikan JSON. Status: ${res.status}. Response: ${raw.slice(0, 120)}`,
        );
      }

      if (!res.ok) {
        throw new Error(result.error || result.message || "Upload gagal");
      }

      setUploadMessage("Putusan berhasil ditambahkan.");
      await fetchPutusan();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--pajak-light)] pb-20 font-[family-name:var(--font-montserrat)]">
      <main className="max-w-[1440px] mx-auto p-8">
        <header className="mb-8 flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-[family-name:var(--font-coolvetica)] text-black mb-1">
              Dashboard Analisis Putusan Pajak
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Transfer Pricing · P3B · BUT · PPh Badan · PPh 26
            </p>
          </div>
          {!loading && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-[family-name:var(--font-coolvetica)] text-[var(--pajak-primary)] leading-none">
                {totalItems.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                putusan tersedia
              </p>
            </div>
          )}
        </header>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative flex items-center gap-2 bg-[var(--pajak-primary)] text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 shadow-sm"
          >
            <Filter size={18} />
            <span>Filter</span>
            {activeFilterBadges.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                {activeFilterBadges.length}
              </span>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleUploadFile(file);
              }
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            <span>{uploading ? "Memproses..." : "Upload Putusan"}</span>
          </button>

          <div className="relative flex-1 group min-w-[300px]">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--pajak-primary)] transition-colors"
              size={18}
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Cari Nomor Putusan atau Jenis Pajak (Enter)..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[var(--pajak-border)] rounded-xl focus:ring-2 focus:ring-[var(--pajak-primary)] outline-none text-sm transition-all shadow-sm"
            />
          </div>

          {(activeFilterBadges.length > 0 || activeKeywords.length > 0) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-500 border border-[var(--pajak-border)] hover:border-red-200 bg-white px-3 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <X size={13} />
              Reset
            </button>
          )}
        </div>

        {uploadMessage && (
          <div
            className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm ${
              uploadStatus === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : uploadStatus === "error"
                  ? "border-red-100 bg-red-50 text-red-700"
                  : "border-blue-100 bg-blue-50 text-blue-700"
            }`}
          >
            <span>{uploadMessage}</span>
            <button
              onClick={() => {
                setUploadMessage(null);
                setUploadStatus(null);
              }}
              className="mt-0.5 rounded-md p-0.5 opacity-70 transition hover:bg-white/70 hover:opacity-100"
              aria-label="Tutup notifikasi upload"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8 min-h-[32px]">
          {activeFilterBadges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-1.5 bg-[var(--pajak-primary)]/8 border border-[var(--pajak-primary)]/25 text-[var(--pajak-primary)] px-3 py-1 rounded-lg text-[11px] font-bold shadow-sm"
            >
              <span>{badge.label}</span>
              <button onClick={badge.onRemove}>
                <X size={12} className="hover:text-red-500" />
              </button>
            </div>
          ))}
          {activeKeywords.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1.5 bg-white border border-[var(--pajak-primary)]/30 text-[var(--pajak-primary)] px-3 py-1 rounded-lg text-[11px] font-bold shadow-sm"
            >
              <span>{tag}</span>
              <button
                onClick={() =>
                  setActiveKeywords(activeKeywords.filter((k) => k !== tag))
                }
              >
                <X size={12} className="hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch mb-10">
          <div className="flex-[1.4] flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard
                label="Kabul Seluruh"
                value={stats.mengabulkan_seluruhnya}
                total={totalItems}
                color="#10B981"
              />
              <KPICard
                label="Kabul Sebagian"
                value={stats.mengabulkan_sebagian}
                total={totalItems}
                color="#F59E0B"
              />
              <KPICard
                label="Menolak"
                value={stats.menolak}
                total={totalItems}
                color="#EF4444"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard
                label="Tidak Diterima"
                value={stats.tidak_dapat_diterima}
                total={totalItems}
                color="#6B7280"
              />
              <KPICard
                label="Membatalkan"
                value={stats.membatalkan}
                total={totalItems}
                color="#8B5CF6"
              />
              <KPICard
                label="Lainnya"
                value={stats.lainnya}
                total={totalItems}
                color="#0EA5E9"
              />
            </div>
          </div>

          <div className="flex-1 bg-white p-7 rounded-[32px] border border-[var(--pajak-border)] shadow-sm flex flex-col justify-between h-[224px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">
                  Total Putusan
                </p>
                <p className="text-5xl font-[family-name:var(--font-coolvetica)] text-gray-800 leading-none">
                  {totalItems.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <div className="flex items-end gap-2.5 h-32 justify-center mt-6 px-1">
              <ChartBar
                value={stats.mengabulkan_seluruhnya}
                total={totalItems}
                color="#10B981"
                label="Kabul Seluruh"
                shortLabel="Kabul"
              />
              <ChartBar
                value={stats.mengabulkan_sebagian}
                total={totalItems}
                color="#F59E0B"
                label="Kabul Sebagian"
                shortLabel="Sebagian"
              />
              <ChartBar
                value={stats.menolak}
                total={totalItems}
                color="#EF4444"
                label="Menolak"
                shortLabel="Tolak"
              />
              <ChartBar
                value={stats.tidak_dapat_diterima}
                total={totalItems}
                color="#6B7280"
                label="Tidak Diterima"
                shortLabel="Tdk Diterima"
              />
              <ChartBar
                value={stats.membatalkan}
                total={totalItems}
                color="#8B5CF6"
                label="Membatalkan"
                shortLabel="Batal"
              />
              <ChartBar
                value={stats.lainnya}
                total={totalItems}
                color="#0EA5E9"
                label="Lainnya"
                shortLabel="Lainnya"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <p className="text-sm font-bold text-gray-500">
            {loading ? (
              <Loader className="animate-spin" />
            ) : (
              `${totalItems} Putusan Ditemukan`
            )}
          </p>

          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[165px] bg-gray-200 rounded-2xl"
                ></div>
              ))}
            </div>
          ) : currentData.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {currentData.map((putusan) => (
                <DecisionCard key={putusan.id} data={putusan} />
              ))}
            </div>
          ) : (
            <div className="bg-white p-20 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
              Tidak ada data yang sesuai dengan filter di database.
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex flex-col items-center gap-2 mt-14">
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--pajak-border)] bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Page numbers with ellipsis */}
              {(() => {
                const pages: (number | "ellipsis")[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 4) pages.push("ellipsis");
                  const start = Math.max(2, currentPage - 2);
                  const end = Math.min(totalPages - 1, currentPage + 2);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (currentPage < totalPages - 3) pages.push("ellipsis");
                  pages.push(totalPages);
                }
                return pages.map((p, i) =>
                  p === "ellipsis" ? (
                    <span
                      key={`e${i}`}
                      className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm select-none"
                    >
                      ···
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all"
                      style={
                        currentPage === p
                          ? {
                              background: "var(--pajak-primary)",
                              color: "#fff",
                            }
                          : {
                              background: "#fff",
                              color: "#6B7280",
                              border: "1px solid var(--pajak-border)",
                            }
                      }
                    >
                      {p}
                    </button>
                  ),
                );
              })()}

              {/* Next */}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--pajak-border)] bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, totalItems)} dari{" "}
              {totalItems.toLocaleString("id-ID")} putusan
            </p>
          </div>
        )}

        <FilterModal
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApplyFilter={(newFilters: DashboardFilters) =>
            setFilters(newFilters)
          }
          initialFilters={filters}
        />
      </main>
    </div>
  );
}

const KPICard = ({
  label,
  value = 0,
  total = 0,
  color,
}: {
  label: string;
  value?: number;
  total?: number;
  color: string;
}) => {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : null;
  return (
    <div
      className="bg-white rounded-[24px] border-l-[6px] px-5 py-4 h-[104px] flex flex-col justify-between shadow-sm transition-all hover:shadow-md"
      style={{ borderColor: color }}
    >
      <p className="text-[10px] uppercase font-black text-gray-400 leading-tight tracking-tight">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-[family-name:var(--font-coolvetica)] text-gray-800 leading-none">
          {value.toLocaleString("id-ID")}
        </p>
        {pct && (
          <span
            className="text-[11px] font-bold mb-0.5 tabular-nums"
            style={{ color }}
          >
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
};

const ChartBar = ({
  value,
  total,
  color,
  label,
  shortLabel,
}: {
  value: number;
  total: number;
  color: string;
  label: string;
  shortLabel: string;
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const barHeight = Math.max(percentage, 4);

  return (
    <div className="flex-1 flex flex-col items-center justify-end group relative h-full">
      {/* Tooltip */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 transition-all pointer-events-none shadow-2xl scale-90 group-hover:scale-100">
        <span className="font-bold">{label}:</span>{" "}
        {value.toLocaleString("id-ID")}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
      {/* Bar */}
      <div
        className="w-full flex flex-col justify-end"
        style={{ height: "calc(100% - 20px)" }}
      >
        <div
          className="w-full rounded-t-lg transition-all duration-1000 ease-out hover:brightness-110 cursor-help relative"
          style={{
            height: `${barHeight}%`,
            backgroundColor: color,
            boxShadow: `0 -3px 10px ${color}40`,
          }}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
        </div>
      </div>
      {/* Label below bar */}
      <p className="text-[9px] font-bold text-gray-400 mt-1 truncate w-full text-center leading-tight">
        {shortLabel}
      </p>
    </div>
  );
};
