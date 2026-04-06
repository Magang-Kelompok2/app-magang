'use client';

import { useState, KeyboardEvent, useMemo, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";
import FilterModal from "../components/FilterModal";
import DecisionCard from "../components/DecisionCard";

export default function DashboardPage() {
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State data dari PostgreSQL
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Filter
  const [filters, setFilters] = useState({
    status: [],
    jenisPajak: [], 
    upayaHukum: [],
    pengadilan: 'Semua',
    tahunPutusan: [2006, 2024],
    tahunPajak: [2006, 2024]
  });

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // --- LOGIC FETCH DATA ---
  const fetchPutusan = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filters.status.join(','),
        jenisPajak: filters.jenisPajak?.join(',') || '',
        upayaHukum: filters.upayaHukum.join(','),
        pengadilan: filters.pengadilan,
        tahunPutusan: filters.tahunPutusan.join(','),
        search: activeKeywords.join(' ')
      });

      const response = await fetch(`/api/putusan?${params.toString()}`);
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Fetch error:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, activeKeywords]);

  useEffect(() => {
    fetchPutusan();
    setCurrentPage(1); 
  }, [fetchPutusan]);

  // --- LOGIC STATISTIK ---
  const getStatusCategory = (amar: string) => {
    const lower = amar?.toLowerCase() || '';
    if (lower === 'mengabulkan seluruhnya' || lower.includes('mengabulkan seluruhnya')) return 'Mengabulkan Seluruhnya';
    if (lower === 'mengabulkan sebagian') return 'Mengabulkan Sebagian';
    if (lower === 'menolak') return 'Menolak';
    if (lower === 'tidak dapat diterima') return 'Tidak Dapat Diterima';
    if (lower === 'membatalkan') return 'Membatalkan';
    return 'Lain-lain';
  };

  const stats = useMemo(() => {
    const rawData = data || [];
    const res = { 
      total: rawData.length, 
      kabulSeluruh: 0, 
      kabulSebagian: 0, 
      menolak: 0, 
      tidakDiterima: 0, 
      membatalkan: 0, 
      lainLain: 0 
    };

    rawData.forEach(item => {
      const category = getStatusCategory(item.amar_putusan);
      switch (category) {
        case 'Mengabulkan Seluruhnya': res.kabulSeluruh++; break;
        case 'Mengabulkan Sebagian': res.kabulSebagian++; break;
        case 'Menolak': res.menolak++; break;
        case 'Tidak Dapat Diterima': res.tidakDiterima++; break;
        case 'Membatalkan': res.membatalkan++; break;
        default: res.lainLain++; break;
      }
    });
    return res;
  }, [data]);

  // --- LOGIC PAGINATION ---
  const totalPages = Math.ceil(data.length / itemsPerPage);
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

  const handleApplyFilter = (modalData: any) => {
    setFilters({
        status: modalData.status || [],
        jenisPajak: modalData.jenisPajak || [],   // ← tambah ini
        upayaHukum: modalData.upayaHukum || [],
        pengadilan: modalData.pengadilan || 'Semua',
        tahunPutusan: modalData.tahunPutusan || [2006, 2024],
        tahunPajak: modalData.tahunPajak || [2006, 2024]
      });
      setIsFilterOpen(false);
    };

  return (
    <div className="min-h-screen bg-[var(--pajak-light)] pb-20 font-[family-name:var(--font-montserrat)]">
      <Navbar />
      <main className="max-w-[1440px] mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-[family-name:var(--font-coolvetica)] text-black mb-1">Dashboard Analisis Putusan Pajak</h1>
          <p className="text-gray-500 text-sm font-medium">Monitoring Transaksi Lintas Negara & Sengketa Pajak</p>
        </header>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 bg-[var(--pajak-primary)] text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 shadow-sm">
            <Filter size={18} /><span>Filter</span>
          </button>
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--pajak-primary)] transition-colors" size={18} />
            <input 
              type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Cari Nomor Putusan atau Jenis Pajak (Enter)..." 
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[var(--pajak-border)] rounded-xl focus:ring-2 focus:ring-[var(--pajak-primary)] outline-none text-sm transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => {
              setActiveKeywords([]);
              setFilters({
                status: [],
                jenisPajak: [],     // ← tambah ini
                upayaHukum: [],
                pengadilan: 'Semua',
                tahunPutusan: [2006, 2024],
                tahunPajak: [2006, 2024]
              });
            }} 
            className="text-gray-400 text-xs font-bold hover:text-red-500 px-2 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Keywords Tags */}
        <div className="flex flex-wrap gap-2 mb-8 min-h-[32px]">
          {activeKeywords.map((tag) => (
            <div key={tag} className="flex items-center gap-1.5 bg-white border border-[var(--pajak-primary)]/30 text-[var(--pajak-primary)] px-3 py-1 rounded-lg text-[11px] font-bold shadow-sm">
              <span>{tag}</span>
              <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => setActiveKeywords(activeKeywords.filter(k => k !== tag))} />
            </div>
          ))}
        </div>

        {/* STATS SECTION - PERFECT ALIGNMENT */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch mb-10">
          {/* Left Side: 2 Rows of Cards */}
          <div className="flex-[1.4] flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <KPICard label="Kabul Seluruh" value={stats.kabulSeluruh} color="#10B981" />
              <KPICard label="Kabul Sebagian" value={stats.kabulSebagian} color="#F59E0B" />
              <KPICard label="Menolak" value={stats.menolak} color="#EF4444" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <KPICard label="Tidak Diterima" value={stats.tidakDiterima} color="#6B7280" />
              <KPICard label="Membatalkan" value={stats.membatalkan} color="#8B5CF6" />
              <KPICard label="Lain-lain" value={stats.lainLain} color="#0EA5E9" />
            </div>
          </div>

          {/* Right Side: Total + High Contrast Chart */}
          <div className="flex-1 bg-white p-7 rounded-[32px] border border-[var(--pajak-border)] shadow-sm flex flex-col justify-between min-h-[224px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Total Putusan</p>
                <p className="text-5xl font-[family-name:var(--font-coolvetica)] text-gray-800 leading-none">{(stats.total || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="text-[9px] font-bold text-gray-300 uppercase italic tracking-tighter">Stats Visual</div>
            </div>

            {/* Chart Area - Dipertinggi untuk perbandingan tajam */}
            <div className="flex items-end gap-2.5 h-32 justify-center mt-6 px-1">
              <ChartBar value={stats.kabulSeluruh} total={stats.total} color="#10B981" label="Kabul Seluruh" />
              <ChartBar value={stats.kabulSebagian} total={stats.total} color="#F59E0B" label="Kabul Sebagian" />
              <ChartBar value={stats.menolak} total={stats.total} color="#EF4444" label="Menolak" />
              <ChartBar value={stats.tidakDiterima} total={stats.total} color="#6B7280" label="Tidak Diterima" />
              <ChartBar value={stats.membatalkan} total={stats.total} color="#8B5CF6" label="Membatalkan" />
              <ChartBar value={stats.lainLain} total={stats.total} color="#0EA5E9" label="Lain-lain" />
            </div>
          </div>
        </div>

        {/* Data List */}
        <div className="space-y-4 mb-10">
          <p className="text-sm font-bold text-gray-500">{loading ? "Memuat data..." : `${data.length} Putusan Ditemukan`}</p>
          
          {loading ? (
            <div className="grid grid-cols-2 gap-6 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-[165px] bg-gray-200 rounded-2xl"></div>
                ))}
            </div>
          ) : currentData.length > 0 ? (
            <div className="grid grid-cols-2 gap-6">
              {currentData.map((putusan: any) => (
                <DecisionCard key={putusan.id} data={putusan} />
              ))}
            </div>
          ) : (
            <div className="bg-white p-20 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                Tidak ada data yang sesuai dengan filter di database.
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-10 mt-14">
            <button onClick={() => setCurrentPage(p => Math.max(p-1, 1))} disabled={currentPage===1} className="p-2 disabled:opacity-20 hover:bg-gray-100 rounded-full transition-all"><ChevronLeft/></button>
            <span className="text-sm font-bold text-gray-600">Halaman <span className="text-[var(--pajak-primary)] text-xl mx-1">{currentPage}</span> dari {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p+1, totalPages))} disabled={currentPage===totalPages} className="p-2 disabled:opacity-20 hover:bg-gray-100 rounded-full transition-all"><ChevronRight/></button>
          </div>
        )}

        <FilterModal 
          isOpen={isFilterOpen} 
          onClose={() => setIsFilterOpen(false)} 
          onApplyFilter={handleApplyFilter} 
        />
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

const KPICard = ({ label, value = 0, color }: any) => (
  <div className="bg-white rounded-[24px] border-l-[6px] p-5 h-[104px] flex flex-col justify-center shadow-sm transition-all hover:shadow-md" style={{borderColor: color}}>
    <p className="text-[10px] uppercase font-black text-gray-400 mb-1 leading-tight tracking-tight">{label}</p>
    <p className="text-3xl font-[family-name:var(--font-coolvetica)] text-gray-800 leading-none">{(value || 0).toLocaleString('id-ID')}</p>
  </div>
);

const ChartBar = ({ value, total, color, label }: any) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  // Minimal 4% agar data kecil tetap punya visual
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