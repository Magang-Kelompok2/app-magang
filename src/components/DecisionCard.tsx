import React from 'react';

interface DecisionCardProps {
  data: {
    id: number;
    nomor_putusan_pp: string;
    pemohon: string;
    termohon: string;
    jenis_pajak: string;
    amar_putusan: string;
    upaya_hukum: string;
    tanggal_putusan: string;
    objek_sengketa?: string;
    preview_sengketa?: string;
  };
}

const DecisionCard = ({ data }: DecisionCardProps) => {
  // Logic warna background badge amar putusan sesuai UI
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Kabul': return 'bg-green-100 text-green-600 border-green-200';
      case 'Tolak': return 'bg-red-100 text-red-500 border-red-200';
      case 'Mengabulkan Sebagian':
      case 'Sebagian': return 'bg-orange-100 text-orange-400 border-orange-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-[var(--pajak-border)] rounded-2xl p-5 shadow-sm hover:border-[var(--pajak-primary)] transition-all flex group h-[165px] w-full overflow-hidden">
      {/* Sisi Kiri: Info Utama */}
      <div className="flex-[1.5] pr-4 border-r border-gray-100 flex flex-col justify-between">
        <div>
          <h4 className="text-[var(--pajak-base)] font-bold text-[13px] mb-1 truncate font-[family-name:var(--font-montserrat)] uppercase tracking-tight">
            {data.nomor_putusan_pp}
          </h4>
          <p className="text-[11px] text-gray-700 font-medium line-clamp-2 leading-snug">
            {data.pemohon} <span className="text-gray-300 font-bold mx-0.5">VS</span> {data.termohon}
          </p>
        </div>
        
        {/* Row Badge/Chips */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          <Badge label={data.jenis_pajak} />
          <Badge label={data.amar_putusan} className={getStatusStyle(data.amar_putusan)} />
          <Badge label={data.upaya_hukum} />
          <Badge label={data.tanggal_putusan} />
        </div>
      </div>

      {/* Sisi Kanan: Objek Sengketa (Compact Preview) */}
      <div className="flex-1 pl-4 flex flex-col">
        <h5 className="text-[9px] uppercase font-black text-gray-400 mb-2 tracking-widest leading-none">
          Objek Sengketa
        </h5>
        <p className="text-[10px] text-gray-500 line-clamp-5 leading-relaxed overflow-hidden font-medium">
          {data.preview_sengketa || data.objek_sengketa || "Deskripsi objek sengketa tidak tersedia untuk putusan ini."}
        </p>
      </div>
    </div>
  );
};

// Sub-komponen Badge agar kode tetap bersih
const Badge = ({ label, className = "bg-white border-gray-200 text-gray-600" }: { label: string; className?: string }) => (
  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors whitespace-nowrap ${className}`}>
    {label}
  </span>
);

export default DecisionCard;