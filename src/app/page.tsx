'use client';

import { useState, KeyboardEvent, useMemo } from 'react';
import { Search, Filter, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";
import FilterModal from "../components/FilterModal";
import DecisionCard from "../components/DecisionCard";
import dataPutusan from "../../data/hasil_ringkasan_pajak_saja.json"; 

export default function DashboardPage() {
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 3 baris x 2 kolom

  // State Filter Modal
  const [filters, setFilters] = useState({
    status: [] as string[],
    jenisPajak: [] as string[],
    upayaHukum: [] as string[],
    pengadilan: 'MA',
    tahunPutusan: [2006, 2024],
    tahunPajak: [2006, 2024]
  });

  // --- LOGIC FILTER UTAMA ---
  const filteredData = useMemo(() => {
    return dataPutusan.filter((item: any) => {
      if (filters.status.length > 0 && !filters.status.includes(item.amar_putusan)) return false;
      if (filters.jenisPajak.length > 0 && !filters.jenisPajak.includes(item.jenis_pajak)) return false;
      if (filters.upayaHukum.length > 0 && !filters.upayaHukum.includes(item.upaya_hukum)) return false;

      const targetPengadilan = filters.pengadilan === 'MA' ? 'Mahkamah Agung' : 'Pengadilan Pajak';
      if (item.pengadilan !== targetPengadilan) return false;

      if (item.tahun_putusan < filters.tahunPutusan[0] || item.tahun_putusan > filters.tahunPutusan[1]) return false;

      if (activeKeywords.length > 0) {
        return activeKeywords.every(kw => 
          item.nomor_putusan_pp?.toLowerCase().includes(kw.toLowerCase()) || 
          item.pemohon?.toLowerCase().includes(kw.toLowerCase()) ||
          item.objek_sengketa?.toLowerCase().includes(kw.toLowerCase())
        );
      }
      return true;
    });
  }, [filters, activeKeywords]);

  // --- LOGIC PAGINATION ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  const currentData = useMemo(() => {
    const begin = (currentPage - 1) * itemsPerPage;
    const end = begin + itemsPerPage;
    return filteredData.slice(begin, end);
  }, [filteredData, currentPage]);

  // Reset page ke 1 jika filter berubah
  useMemo(() => {
    setCurrentPage(1);
  }, [filteredData.length]);

  // --- LOGIC STATISTIK ---
  const stats = useMemo(() => ({
    total: filteredData.length,
    kabul: filteredData.filter(d => d.amar_putusan === 'Kabul').length,
    menolak: filteredData.filter(d => d.amar_putusan === 'Tolak').length,
    sebagian: filteredData.filter(d => d.amar_putusan === 'Mengabulkan Sebagian').length,
    gugur: filteredData.filter(d => d.amar_putusan === 'Gugur').length,
  }), [filteredData]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== "") {
      if (!activeKeywords.includes(inputValue.trim())) {
        setActiveKeywords([...activeKeywords, inputValue.trim()]);
      }
      setInputValue("");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--pajak-light)] pb-20">
      <Navbar />

      <main className="max-w-[1440px] mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-[family-name:var(--font-coolvetica)] text-[#000000] mb-2">
            Dashboard Analisis Putusan Pajak
          </h1>
          <h3 className="text-lg font-[family-name:var(--font-montserrat)] text-[#333333]">
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
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-[var(--pajak-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pajak-primary)] text-sm font-[family-name:var(--font-montserrat)] shadow-sm"
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

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8 min-h-[40px]">
          {activeKeywords.length > 0 ? (
            activeKeywords.map((tag) => (
              <div key={tag} className="flex items-center gap-2 bg-[var(--pajak-secondary)] text-[var(--pajak-base)] px-4 py-1.5 rounded-full text-xs font-bold border border-[var(--pajak-secondary)] border-opacity-30">
                <span>{tag}</span>
                <button onClick={() => setActiveKeywords(activeKeywords.filter(k => k !== tag))}><X size={14} strokeWidth={3} /></button>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-xs italic mt-2">Belum ada kata kunci yang diterapkan.</p>
          )}
        </div>

        {/* KPI & Chart */}
        <div className="grid grid-cols-12 gap-6 items-stretch mb-10">
          <div className="col-span-9 grid grid-cols-5 gap-4">
            <KPICard label="Total Putusan" value={stats.total} color="var(--pajak-primary)" />
            <KPICard label="Mengabulkan" value={stats.kabul} color="var(--pajak-base)" />
            <KPICard label="Menolak" value={stats.menolak} color="#EF4444" />
            <KPICard label="Sebagian" value={stats.sebagian} color="var(--pajak-tertiary)" />
            <KPICard label="Gugur" value={stats.gugur} color="#F59E0B" />
          </div>
          <div className="col-span-3 bg-white p-4 rounded-xl border border-[var(--pajak-border)] flex items-end gap-1.5 justify-center shadow-[0px_4px_10px_var(--pajak-shadow)]">
             <div className="w-full bg-[var(--pajak-base)] rounded-t-sm transition-all duration-700" style={{ height: `${(stats.kabul/stats.total)*100 || 10}%` }}></div>
             <div className="w-full bg-[var(--pajak-primary)] rounded-t-sm transition-all duration-700" style={{ height: `${(stats.menolak/stats.total)*100 || 10}%` }}></div>
             <div className="w-full bg-[var(--pajak-secondary)] rounded-t-sm transition-all duration-700" style={{ height: `${(stats.sebagian/stats.total)*100 || 10}%` }}></div>
             <div className="w-full bg-[var(--pajak-tertiary)] rounded-t-sm transition-all duration-700" style={{ height: `${(stats.gugur/stats.total)*100 || 10}%` }}></div>
             <div className="w-full bg-blue-200 rounded-t-sm transition-all duration-700" style={{ height: '15%' }}></div>
          </div>
        </div>

        {/* Data List - Grid 2 Kolom */}
        <div className="space-y-4 mb-10">
           <p className="text-sm font-bold text-gray-500">{filteredData.length} Putusan Ditemukan</p>
           {currentData.length > 0 ? (
             <div className="grid grid-cols-2 gap-6">
               {currentData.map((putusan: any) => (
                 <DecisionCard key={putusan.id} data={putusan} />
               ))}
             </div>
           ) : (
             <div className="bg-white p-20 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                Tidak ada data yang sesuai dengan filter.
             </div>
           )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12 font-[family-name:var(--font-montserrat)] text-sm">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-gray-100 disabled:opacity-30 hover:bg-gray-200 transition-colors"
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
              className="p-2 rounded-lg bg-gray-100 disabled:opacity-30 hover:bg-gray-200 transition-colors"
            >
              <ChevronRight size={20} />
            </button>

            <div className="ml-6 flex items-center gap-3">
              <span className="text-gray-500">Page</span>
              <select 
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1 bg-white outline-none focus:ring-2 focus:ring-[var(--pajak-primary)]"
              >
                {[...Array(totalPages)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
              <span className="text-gray-500">of {totalPages}</span>
            </div>
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

const KPICard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div 
    className="bg-white p-5 rounded-xl border-l-[6px] shadow-[0px_4px_10px_var(--pajak-shadow)] flex flex-col justify-center"
    style={{ borderColor: color }}
  >
    <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1 leading-none">{label}</p>
    <p className="text-4xl font-[family-name:var(--font-coolvetica)] text-gray-800 leading-none">{value}</p>
  </div>
);