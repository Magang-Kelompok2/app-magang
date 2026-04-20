'use client';

import { useState, KeyboardEvent, useMemo, useEffect, useCallback } from 'react';
import { Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";
import FilterModal from "../components/FilterModal";
import DecisionCard from "../components/DecisionCard";

interface PutusanListItem {
  id: number;
  nomor_putusan_pp?: string;
  nomor_putusan_pk?: string;
  pemohon?: string;
  termohon?: string;
  jenis_pajak?: string;
  amar_putusan?: string;
  upaya_hukum?: string;
  tanggal_putusan?: string;
  objek_sengketa?: string;
  preview_sengketa?: string;
}

interface DashboardFilters {
  status: string[];
  jenisPajak: string[];
  upayaHukum: string[];
  pengadilan: string;
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
  upayaHukum: [],
  pengadilan: 'Semua',
  tahunPutusan: [2006, 2024],
  tahunPajak: [2006, 2024],
};

const LS_FILTERS_KEY = 'kapha_dashboard_filters_v1';
const LS_KEYWORDS_KEY = 'kapha_dashboard_keywords_v1';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded or SSR */ }
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
  const itemsPerPage = 8;

  // Hydrate from localStorage on mount
  useEffect(() => {
    const savedFilters = loadFromStorage<DashboardFilters>(LS_FILTERS_KEY, DEFAULT_FILTERS);
    const savedKeywords = loadFromStorage<string[]>(LS_KEYWORDS_KEY, []);
    setFilters(savedFilters);
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
        status: filters.status.join(','),
        jenisPajak: filters.jenisPajak.join(','),
        upayaHukum: filters.upayaHukum.join(','),
        pengadilan: filters.pengadilan,
        tahunPutusan: filters.tahunPutusan.join(','),
        tahunPajak: filters.tahunPajak.join(','),
        search: activeKeywords.join(' ')
      });

      const res = await fetch('/api/putusan?' + params.toString(), {
        cache: 'no-store'
      });
      const result: DashboardResponse = await res.json();
      setData(Array.isArray(result.items) ? result.items : []);
      setTotalItems(typeof result.total === "number" ? result.total : 0);
      setStats({
        menolak: Number(result.stats?.menolak ?? 0),
        mengabulkan_seluruhnya: Number(result.stats?.mengabulkan_seluruhnya ?? 0),
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
      badges.push({ label: `Status: ${s}`, onRemove: () => setFilters((f) => ({ ...f, status: f.status.filter((x) => x !== s) })) })
    );
    filters.jenisPajak.forEach((p) =>
      badges.push({ label: `Pajak: ${p}`, onRemove: () => setFilters((f) => ({ ...f, jenisPajak: f.jenisPajak.filter((x) => x !== p) })) })
    );
    filters.upayaHukum.forEach((u) =>
      badges.push({ label: `Upaya: ${u}`, onRemove: () => setFilters((f) => ({ ...f, upayaHukum: f.upayaHukum.filter((x) => x !== u) })) })
    );
    if (filters.pengadilan !== 'Semua')
      badges.push({ label: `Pengadilan: ${filters.pengadilan}`, onRemove: () => setFilters((f) => ({ ...f, pengadilan: 'Semua' })) });
    if (filters.tahunPutusan[0] !== 2006 || filters.tahunPutusan[1] !== 2024)
      badges.push({ label: `Thn Putusan: ${filters.tahunPutusan[0]}–${filters.tahunPutusan[1]}`, onRemove: () => setFilters((f) => ({ ...f, tahunPutusan: [2006, 2024] })) });
    if (filters.tahunPajak[0] !== 2006 || filters.tahunPajak[1] !== 2024)
      badges.push({ label: `Thn Pajak: ${filters.tahunPajak[0]}–${filters.tahunPajak[1]}`, onRemove: () => setFilters((f) => ({ ...f, tahunPajak: [2006, 2024] })) });
    return badges;
  }, [filters]);

  const currentData = useMemo(() => {
    const begin = (currentPage - 1) * itemsPerPage;
    return data.slice(begin, begin + itemsPerPage);
  }, [data, currentPage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== "") {
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

  return (
    <div className="min-h-screen bg-[var(--pajak-light)] pb-20 font-[family-name:var(--font-montserrat)]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-[family-name:var(--font-coolvetica)] text-black mb-1">
            Dashboard Analisis Putusan Pajak
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            Monitoring Transaksi Lintas Negara &amp; Sengketa Pajak
          </p>
        </header>

        <div className="flex items-center gap-3 mb-4">
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

          <div className="relative flex-1 group">
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

          <button
            onClick={resetFilters}
            className="text-gray-400 text-xs font-bold hover:text-red-500 px-2 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 min-h-[32px]">
          {activeFilterBadges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-1.5 bg-orange-50 border border-orange-300 text-orange-700 px-3 py-1 rounded-lg text-[11px] font-bold shadow-sm"
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
              <button onClick={() => setActiveKeywords(activeKeywords.filter((k) => k !== tag))}>
                <X size={12} className="hover:text-red-500" />
              </button>
            </div>
          ))}
          {activeFilterBadges.length === 0 && activeKeywords.length === 0 && (
            <p className="text-gray-400 text-xs italic mt-2">Belum ada kata kunci yang diterapkan.</p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch mb-10">
          <div className="flex-[1.4] flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard label="Kabul Seluruh" value={stats.mengabulkan_seluruhnya} color="#10B981" />
              <KPICard label="Kabul Sebagian" value={stats.mengabulkan_sebagian} color="#F59E0B" />
              <KPICard label="Menolak" value={stats.menolak} color="#EF4444" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard label="Tidak Diterima" value={stats.tidak_dapat_diterima} color="#6B7280" />
              <KPICard label="Membatalkan" value={stats.membatalkan} color="#8B5CF6" />
              <KPICard label="Lainnya" value={stats.lainnya} color="#0EA5E9" />
            </div>
          </div>

          <div className="flex-1 bg-white p-7 rounded-[32px] border border-[var(--pajak-border)] shadow-sm flex flex-col justify-between h-[224px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">
                  Total Putusan
                </p>
                <p className="text-5xl font-[family-name:var(--font-coolvetica)] text-gray-800 leading-none">
                  {totalItems.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="flex items-end gap-2.5 h-32 justify-center mt-6 px-1">
              <ChartBar value={stats.mengabulkan_seluruhnya} total={totalItems} color="#10B981" label="Kabul Seluruh" />
              <ChartBar value={stats.mengabulkan_sebagian} total={totalItems} color="#F59E0B" label="Kabul Sebagian" />
              <ChartBar value={stats.menolak} total={totalItems} color="#EF4444" label="Menolak" />
              <ChartBar value={stats.tidak_dapat_diterima} total={totalItems} color="#6B7280" label="Tidak Diterima" />
              <ChartBar value={stats.membatalkan} total={totalItems} color="#8B5CF6" label="Membatalkan" />
              <ChartBar value={stats.lainnya} total={totalItems} color="#0EA5E9" label="Lainnya" />
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <p className="text-sm font-bold text-gray-500">
            {loading ? "Memuat data..." : `${totalItems} Putusan Ditemukan`}
          </p>

          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[165px] bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          ) : currentData.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
          <div className="flex justify-center items-center gap-10 mt-14">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 disabled:opacity-20 hover:bg-gray-100 rounded-full transition-all"
            >
              <ChevronLeft />
            </button>
            <span className="text-sm font-bold text-gray-600">
              Halaman <span className="text-[var(--pajak-primary)] text-xl mx-1">{currentPage}</span> dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 disabled:opacity-20 hover:bg-gray-100 rounded-full transition-all"
            >
              <ChevronRight />
            </button>
          </div>
        )}

        <FilterModal
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApplyFilter={(newFilters: DashboardFilters) => setFilters(newFilters)}
          initialFilters={filters}
        />
      </main>
    </div>
  );
}

const KPICard = ({ label, value = 0, color }: { label: string; value?: number; color: string }) => (
  <div
    className="bg-white rounded-[24px] border-l-[6px] p-5 h-[104px] flex flex-col justify-center shadow-sm transition-all hover:shadow-md"
    style={{ borderColor: color }}
  >
    <p className="text-[10px] uppercase font-black text-gray-400 mb-1 leading-tight tracking-tight">{label}</p>
    <p className="text-3xl font-[family-name:var(--font-coolvetica)] text-gray-800 leading-none">
      {value.toLocaleString('id-ID')}
    </p>
  </div>
);

const ChartBar = ({ value, total, color, label }: { value: number; total: number; color: string; label: string }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const barHeight = Math.max(percentage, 4);

  return (
    <div className="flex-1 flex flex-col justify-end group relative h-full">
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 transition-all pointer-events-none shadow-2xl scale-90 group-hover:scale-100">
        <span className="font-bold">{label}:</span> {value.toLocaleString('id-ID')}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
      <div
        className="w-full rounded-t-xl transition-all duration-1000 ease-out hover:brightness-110 cursor-help relative"
        style={{
          height: `${barHeight}%`,
          backgroundColor: color,
          boxShadow: `0 -4px 15px ${color}33`
        }}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"></div>
      </div>
    </div>
  );
};