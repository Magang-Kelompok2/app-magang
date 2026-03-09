import React from 'react';

interface DecisionCardProps {
  data: {
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
  };
}

const DecisionCard = ({ data }: DecisionCardProps) => {
  // Logic warna background badge amar putusan
  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('mengabulkan') || s.includes('kabul')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (s.includes('menolak') || s.includes('tolak')) {
      return 'bg-red-100 text-red-600 border-red-200';
    }
    if (s.includes('sebagian')) {
      return 'bg-orange-100 text-orange-600 border-orange-200';
    }
    if (s.includes('tidak dapat diterima')) {
      return 'bg-gray-200 text-gray-700 border-gray-300';
    }
    return 'bg-gray-100 text-gray-500 border-gray-200';
  };

  // Format tanggal
  const formattedDate = data.tanggal_putusan 
    ? new Date(data.tanggal_putusan).toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })
    : "-";

  return (
    <div className="bg-white border border-[var(--pajak-border)] rounded-2xl p-6 shadow-sm hover:border-[var(--pajak-primary)] hover:shadow-md transition-all flex group h-[190px] w-full overflow-hidden">
      {/* Sisi Kiri: Info Utama (Diperbesar) */}
      <div className="flex-[1.6] pr-6 border-r border-gray-100 flex flex-col justify-between">
        <div className="space-y-2">
          <h4 className="text-[var(--pajak-base)] font-bold text-[16px] leading-tight truncate font-[family-name:var(--font-montserrat)] uppercase tracking-tight">
            {data.nomor_putusan_pp || data.nomor_putusan_pk || "Nomor Putusan Tidak Tersedia"}
          </h4>
          <p className="text-[13px] text-gray-800 font-semibold line-clamp-2 leading-relaxed">
            {data.pemohon || "Pihak Pemohon"} 
            <span className="text-gray-400 font-black mx-1">VS</span> 
            {data.termohon || "Pihak Termohon"}
          </p>
        </div>
        
        {/* Row Badge/Chips (Diperbesar) */}
        <div className="flex flex-wrap gap-2 mt-auto">
          <Badge label={data.jenis_pajak || "-"} />
          <Badge 
            label={data.amar_putusan || "Lain-lain"} 
            className={getStatusStyle(data.amar_putusan || "")} 
          />
          <Badge label={data.upaya_hukum || "-"} />
          <Badge label={formattedDate} />
        </div>
      </div>

      {/* Sisi Kanan: Objek Sengketa (Diperbesar) */}
      <div className="flex-1 pl-6 flex flex-col">
        <h5 className="text-[11px] uppercase font-black text-gray-400 mb-3 tracking-widest leading-none">
          Objek Sengketa
        </h5>
        <p className="text-[12px] text-gray-600 line-clamp-5 leading-relaxed overflow-hidden font-medium">
          {data.preview_sengketa || data.objek_sengketa || "Deskripsi objek sengketa tidak tersedia untuk putusan ini."}
        </p>
      </div>
    </div>
  );
};

// Sub-komponen Badge dengan font lebih besar
const Badge = ({ label, className = "bg-white border-gray-200 text-gray-700" }: { label: string; className?: string }) => (
  <span className={`px-3 py-1 rounded-md text-[11px] font-bold border transition-colors whitespace-nowrap shadow-sm ${className}`}>
    {label}
  </span>
);

export default DecisionCard;