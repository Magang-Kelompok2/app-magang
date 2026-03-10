'use client';

import { useState, KeyboardEvent, useMemo, useEffect } from 'react';
import { Search, Filter, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";
import FilterModal from "../components/FilterModal";
import DecisionCard from "../components/DecisionCard";

export default function DashboardPage() {
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State untuk data dari PostgreSQL
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Filter Modal
  const [filters, setFilters] = useState({
    status: [] as string[],
    jenisPajak: [] as string[],
    upayaHukum: [] as string[],
    pengadilan: 'MA',
    tahunPutusan: [2006, 2024],
    tahunPajak: [2006, 2024]
  });

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; 

  // --- LOGIC FETCH DATA DARI POSTGRESQL (VIA API) ---
  const fetchPutusan = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filters.status.join(','),
        jenisPajak: filters.jenisPajak.join(','),
        upayaHukum: filters.upayaHukum.join(','),
        pengadilan: filters.pengadilan,
        tahunPutusan: filters.tahunPutusan.join(','),
        search: activeKeywords.join(' ')
      });

      const res = await fetch('/api/putusan?' + params.toString(), {
        cache: 'no-store'
      });
      const result = await res.json();
      
      if (Array.isArray(result)) {
        setData(result);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error("Gagal load data dari database:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPutusan();
    setCurrentPage(1); 
  }, [filters, activeKeywords]);

  // --- LOGIC PAGINATION ---
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  const currentData = useMemo(() => {
    const begin = (currentPage - 1) * itemsPerPage;
    const end = begin + itemsPerPage;
    return data.slice(begin, end);
  }, [data, currentPage]);

  // --- LOGIC STATISTIK ---
  const stats = useMemo(() => {
    const rawData = Array.isArray(data) ? data : [];
    const count = (val: string) => rawData.filter(item => item.amar_putusan === val).length;

    return {
      total: rawData.length,
      kabulSeluruhnya: count('Mengabulkan Seluruhnya'),
      kabulSebagian: count('Mengabulkan Sebagian'),
      menolak: count('Menolak'),
      tidakDiterima: count('Tidak Dapat Diterima'),
      membatalkan: count('Membatalkan'),
      lainLain: count('Lain-lain'),
    };
  }, [data]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== "") {
      if (!activeKeywords.includes(inputValue.trim())) {
        setActiveKeywords([...activeKeywords, inputValue.trim()]);
      }
      setInputValue("");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--pajak-light)] pb-20 font-[family-name:var(--font-montserrat)]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-[family-name:var(--font-coolvetica)] text-[#000000] mb-2">
            Dashboard Analisis Putusan Pajak
          </h1>
          <h3 className="text-lg text-[#333333]">
            PPh 26, PPh Badan, Transfer Pricing, Tax Treaty (P3B) - Transaksi Lintas Negara
          </h3>
        </header>

        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 bg-[var(--pajak-primary)] text-white px-5 py-2.5 rounded-lg font-[family-name:var(--font-coolvetica)] hover:brightness-110 transition-all shadow-sm"
          >
            <Filter size={18} />
            <span>Filter</span>
          </button>

          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--pajak-primary)]" size={20} />
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Cari Nomor Putusan, Pemohon, atau Objek Sengketa..." 
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-[var(--pajak-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pajak-primary)] text-sm shadow-sm"
            />
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-white border border-[var(--pajak-border)] text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50">
              <Plus size={18} />
              Tambah
            </button>
            <button 
              onClick={() => {
                setActiveKeywords([]);
                setFilters({
                  status: [], jenisPajak: [], upayaHukum: [],
                  pengadilan: 'MA', tahunPutusan: [2006, 2024], tahunPajak: [2006, 2024]
                });
              }}
              className="text-[var(--pajak-primary)] text-sm font-bold px-4 hover:underline"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap gap-2 mb-8 min-h-[40px]">
          {activeKeywords.length > 0 ? (
            activeKeywords.map((tag) => (
              <div key={tag} className="flex items-center gap-2 bg-[#0C81E4]/20 text-[var(--pajak-primary)] px-4 py-1.5 rounded-full text-xs font-bold">
                <span>{tag}</span>
                <button 
                  className="group p-1 rounded-md transition-colors hover:bg-red-50" 
                  onClick={() => setActiveKeywords(activeKeywords.filter(k => k !== tag))}
                >
                  <X 
                    size={14} 
                    strokeWidth={3} 
                    className="text-gray-400 group-hover:text-red-500 transition-colors" 
                  />
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-xs italic mt-2">Belum ada kata kunci yang diterapkan.</p>
          )}
        </div>

        {/* --- KPI & Chart Visualization Section --- */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch mb-10">
          {/* Enhanced KPI Cards Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-[var(--font-Montserrat)]">
            <KPICard label="Total Putusan" value={stats.total} color="var(--pajak-primary)" />
            <KPICard label="Kabul Seluruh" value={stats.kabulSeluruhnya} color="#10B981" />
            <KPICard label="Kabul Sebagian" value={stats.kabulSebagian} color="#F59E0B" />
            <KPICard label="Menolak" value={stats.menolak} color="#EF4444" />
            <KPICard label="Tidak Diterima" value={stats.tidakDiterima} color="#6B7280" />
            <KPICard label="Membatalkan" value={stats.membatalkan} color="#8B5CF6" />
            <KPICard label="Lain-lain" value={stats.lainLain} color="#EC4899" />
          </div>

          {/* Interactive Chart with Hover Details */}
          <div className="w-full lg:w-[320px] bg-white p-6 rounded-2xl border border-[var(--pajak-border)] shadow-[0px_4px_20px_var(--pajak-shadow)] flex items-end gap-2 justify-center relative group/chart">
            <ChartBar value={stats.kabulSeluruhnya} total={stats.total} color="#10B981" label="Kabul Seluruh" />
            <ChartBar value={stats.kabulSebagian} total={stats.total} color="#F59E0B" label="Kabul Sebagian" />
            <ChartBar value={stats.menolak} total={stats.total} color="#EF4444" label="Menolak" />
            <ChartBar value={stats.membatalkan} total={stats.total} color="#8B5CF6" label="Membatalkan" />
            <ChartBar value={stats.lainLain} total={stats.total} color="#EC4899" label="Lain-lain" />
            
            <div className="absolute top-2 right-3 opacity-0 group-hover/chart:opacity-100 transition-opacity">
              <span className="text-[9px] text-gray-400 font-bold uppercase italic">Hover bars for details</span>
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
          <div className="flex justify-center items-center gap-4 mt-12 text-sm">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-gray-100 disabled:opacity-30 hover:bg-gray-200"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="bg-[var(--pajak-shadow)] text-white px-3 py-1 rounded-md font-bold">{currentPage}</span>
              <span className="text-gray-400">of</span>
              <span className="font-bold">{totalPages}</span>
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-gray-100 disabled:opacity-30 hover:bg-gray-200"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <FilterModal 
          isOpen={isFilterOpen} 
          onClose={() => setIsFilterOpen(false)} 
          onApplyFilter={(newFilters: any) => setFilters(newFilters)}
        />
      </main>
    </div>
  );
}

// --- Sub-components with Hover Effects ---

const KPICard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div 
    className="bg-white p-6 rounded-2xl border-l-[8px] shadow-[0px_6px_15px_var(--pajak-shadow)] flex flex-col justify-center transition-transform hover:scale-105 duration-200"
    style={{ borderColor: color }}
  >
    <p className="text-[10px] uppercase tracking-wider font-black text-gray-400 mb-2 leading-tight">
      {label}
    </p>
    <p className="text-3xl font-[family-name:var(--font-coolvetica)] text-gray-800 leading-none">
      {value.toLocaleString('id-ID')}
    </p>
  </div>
);

const ChartBar = ({ value, total, color, label }: { value: number; total: number; color: string; label: string }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const barHeight = Math.max(percentage, 8); // Minimum visibility

  return (
    <div className="relative flex-1 flex flex-col items-center group/bar h-full justify-end">
      {/* Tooltip Content */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
        <div className="font-bold border-b border-gray-700 pb-1 mb-1">{label}</div>
        <div>{value.toLocaleString('id-ID')} <span className="text-gray-400">({percentage.toFixed(1)}%)</span></div>
        {/* Tooltip Arrow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
      
      <div 
        className="w-full rounded-t-md transition-all duration-700 ease-out hover:brightness-125 cursor-help"
        style={{ 
          height: `${barHeight}%`, 
          backgroundColor: color,
          boxShadow: `0 -4px 12px ${color}44` 
        }}
      ></div>
    </div>
  );
};