'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, Check, X } from 'lucide-react';

interface DashboardFilters {
  status: string[];
  jenisPajak: string[];
  jenisSengketa: string[];
  upayaHukum: string[];
  pengadilan: string;
  tahunPutusan: [number, number];
  tahunPajak: [number, number];
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filters: DashboardFilters) => void;
  initialFilters?: DashboardFilters;
}

const JENIS_PAJAK_OPTIONS = [
  'PPh Pasal 21', 'PPh Pasal 22', 'PPh Pasal 23', 'PPh Pasal 26',
  'PPh Pasal 23/26', 'PPh Badan', 'PPh Final Pasal 4(2)', 'PPh Pasal 15',
  'PPh Pasal 25/29', 'PPh Lainnya', 'PPN', 'PPnBM', 'Kepabeanan',
  'PBB & BPHTB', 'Pajak Daerah', 'Sanksi & Administrasi', 'Tidak Teridentifikasi',
];

const JENIS_SENGKETA_OPTIONS = [
  'Transfer Pricing', 'BUT & Tax Treaty', 'Koreksi PPh Badan', 'Koreksi PPN',
  'PPh Pemotongan/Pemungutan', 'Sengketa Kepabeanan', 'Klasifikasi Objek Pajak',
  'Sengketa Dokumen & Faktur', 'Sengketa Prosedur & Formal', 'Sanksi Administrasi',
  'Restitusi & Imbalan Bunga', 'NJOP / PBB', 'Saat Terutang & Pengakuan',
  'Kewenangan Pajak', 'Lainnya',
];

const DEFAULT: DashboardFilters = {
  status: [],
  jenisPajak: [],
  jenisSengketa: [],
  upayaHukum: [],
  pengadilan: 'Semua',
  tahunPutusan: [2006, 2024],
  tahunPajak: [2006, 2024],
};

const FilterModal = ({ isOpen, onClose, onApplyFilter, initialFilters }: FilterModalProps) => {
  const base = initialFilters ?? DEFAULT;

  const [tahunPutusan, setTahunPutusan] = useState<[number, number]>(base.tahunPutusan);
  const [tahunPajak, setTahunPajak] = useState<[number, number]>(base.tahunPajak);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(base.status);
  const [selectedPajak, setSelectedPajak] = useState<string[]>(base.jenisPajak);
  const [selectedSengketa, setSelectedSengketa] = useState<string[]>(base.jenisSengketa);
  const [selectedUpaya, setSelectedUpaya] = useState<string[]>(base.upayaHukum);
  const [selectedPengadilan, setSelectedPengadilan] = useState<string>(base.pengadilan === 'Semua' ? '' : base.pengadilan);

  // Sync state when initialFilters changes (e.g. reset from parent)
  useEffect(() => {
    if (!isOpen) return;
    const b = initialFilters ?? DEFAULT;
    setTahunPutusan(b.tahunPutusan);
    setTahunPajak(b.tahunPajak);
    setSelectedStatus(b.status);
    setSelectedPajak(b.jenisPajak);
    setSelectedSengketa(b.jenisSengketa);
    setSelectedUpaya(b.upayaHukum);
    setSelectedPengadilan(b.pengadilan === 'Semua' ? '' : b.pengadilan);
  }, [isOpen, initialFilters]);

  const toggleFilter = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setList(list.filter(item => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleApply = () => {
    onApplyFilter({
      status: selectedStatus,
      jenisPajak: selectedPajak,
      jenisSengketa: selectedSengketa,
      upayaHukum: selectedUpaya,
      pengadilan: selectedPengadilan || 'Semua',
      tahunPutusan,
      tahunPajak,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white w-full max-w-[640px] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--pajak-border)] flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={28} className="text-gray-400" />
          </button>
          <h2 className="text-4xl font-[family-name:var(--font-coolvetica)] text-gray-900">Filter</h2>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto font-[family-name:var(--font-montserrat)] custom-scrollbar">

          {/* Status Putusan */}
          <section>
            <h4 className="font-bold text-gray-800 mb-4 text-sm">Status Putusan</h4>
            <div className="flex flex-wrap gap-3">
              {[
                'Mengabulkan Seluruhnya',
                'Mengabulkan Sebagian',
                'Menolak',
                'Tidak Dapat Diterima',
                'Membatalkan',
                'Lain-lain'
              ].map(status => (
                <FilterChip
                  key={status}
                  label={status}
                  active={selectedStatus.includes(status)}
                  onClick={() => toggleFilter(selectedStatus, setSelectedStatus, status)}
                />
              ))}
            </div>
          </section>

          {/* Jenis Pajak */}
          <section>
            <h4 className="font-bold text-gray-800 mb-3 text-sm">Jenis Pajak</h4>
            <MultiSelectDropdown
              placeholder="Pilih jenis pajak..."
              options={JENIS_PAJAK_OPTIONS}
              value={selectedPajak}
              onChange={setSelectedPajak}
            />
          </section>

          {/* Jenis Sengketa */}
          <section>
            <h4 className="font-bold text-gray-800 mb-3 text-sm">Jenis Sengketa</h4>
            <MultiSelectDropdown
              placeholder="Pilih jenis sengketa..."
              options={JENIS_SENGKETA_OPTIONS}
              value={selectedSengketa}
              onChange={setSelectedSengketa}
            />
          </section>

          {/* Upaya Hukum */}
          <section>
            <h4 className="font-bold text-gray-800 mb-4 text-sm">Upaya Hukum</h4>
            <div className="flex flex-wrap gap-3">
              {['Banding', 'Gugatan', 'Peninjauan Kembali'].map(upaya => (
                <FilterChip
                  key={upaya}
                  label={upaya}
                  active={selectedUpaya.includes(upaya)}
                  onClick={() => toggleFilter(selectedUpaya, setSelectedUpaya, upaya)}
                />
              ))}
            </div>
          </section>

          {/* Pengadilan */}
          <section>
            <h4 className="font-bold text-gray-800 mb-4 text-sm">Pengadilan</h4>
            <div className="flex gap-8">
              <PengadilanOption
                label="Mahkamah Agung"
                img="/Mahkamah_Agung.svg"
                active={selectedPengadilan === 'MA'}
                onClick={() => setSelectedPengadilan(selectedPengadilan === 'MA' ? '' : 'MA')}
              />
              <PengadilanOption
                label="Pengadilan Pajak"
                img="/Pengadilan_Pajak.svg"
                active={selectedPengadilan === 'PP'}
                onClick={() => setSelectedPengadilan(selectedPengadilan === 'PP' ? '' : 'PP')}
              />
            </div>
          </section>

          {/* Range Sliders */}
          <div className="grid grid-cols-2 gap-10 pt-4 border-t border-[var(--pajak-border)]">
            <YearSlider label="Tahun Putusan" val={tahunPutusan} setVal={setTahunPutusan} />
            <YearSlider label="Tahun Pajak" val={tahunPajak} setVal={setTahunPajak} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-[var(--pajak-border)]">
          <button
            onClick={handleApply}
            className="w-full bg-[var(--pajak-primary)] text-white py-4 rounded-2xl font-bold hover:brightness-110 transition-all text-xl font-[family-name:var(--font-montserrat)] shadow-lg shadow-blue-100"
          >
            Cari
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Sub-Components --- */

const SingleSelectDropdown = ({
  placeholder, options, value, onChange,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-semibold
          transition-all duration-200 bg-white
          ${open
            ? 'border-[var(--pajak-primary)] ring-4 ring-blue-50'
            : 'border-[var(--pajak-border)] hover:border-gray-300'}
        `}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Inline list */}
      {open && (
        <div className="mt-2 border-2 border-[var(--pajak-border)] rounded-2xl overflow-hidden bg-white shadow-lg">
          <div className="overflow-y-auto max-h-52 custom-scrollbar">
            {options.map((opt) => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(selected ? '' : opt); setOpen(false); }}
                  className={`
                    w-full flex items-center justify-between px-4 py-2.5 text-sm text-left
                    transition-colors duration-150
                    ${selected
                      ? 'bg-blue-50 text-[var(--pajak-primary)] font-bold'
                      : 'text-gray-700 font-medium hover:bg-gray-50'}
                  `}
                >
                  <span>{opt}</span>
                  {selected && <Check size={14} strokeWidth={3} className="text-[var(--pajak-primary)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MultiSelectDropdown = ({
  placeholder, options, value, onChange,
}: {
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((x) => x !== opt) : [...value, opt]);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-semibold
          transition-all duration-200 bg-white
          ${open
            ? 'border-[var(--pajak-primary)] ring-4 ring-blue-50'
            : 'border-[var(--pajak-border)] hover:border-gray-300'}
        `}
      >
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            value.map((v) => (
              <span
                key={v}
                className="flex items-center gap-1 bg-blue-50 text-[var(--pajak-primary)] text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-100"
              >
                {v}
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}
                  className="hover:text-blue-800 transition-colors"
                >
                  <X size={10} />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Inline list */}
      {open && (
        <div className="mt-2 border-2 border-[var(--pajak-border)] rounded-2xl overflow-hidden bg-white shadow-lg">
          <div className="overflow-y-auto max-h-52 custom-scrollbar">
            {options.map((opt) => {
              const selected = value.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                    transition-colors duration-150
                    ${selected
                      ? 'bg-blue-50 text-[var(--pajak-primary)] font-bold'
                      : 'text-gray-700 font-medium hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                    ${selected
                      ? 'bg-[var(--pajak-primary)] border-[var(--pajak-primary)]'
                      : 'border-gray-300 bg-white'}
                  `}>
                    {selected && <Check size={10} strokeWidth={3} className="text-white" />}
                  </div>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`
      px-5 py-2 rounded-full text-[13px] font-bold border-2 transition-all flex items-center gap-3
      ${active
        ? 'bg-blue-50 border-[var(--pajak-primary)] text-[var(--pajak-primary)] shadow-sm'
        : 'bg-white border-[var(--pajak-border)] text-gray-400 hover:border-gray-300'}
    `}
  >
    <div className={`
      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
      ${active ? 'bg-[var(--pajak-primary)] border-[var(--pajak-primary)]' : 'border-gray-300 bg-white'}
    `}>
      <svg
        width="12" height="10" viewBox="0 0 12 10" fill="none"
        className={`transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
      >
        <path d="M2 5L4.5 7.5L10 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <span>{label}</span>
  </button>
);

const PengadilanOption = ({ label, img, active, onClick }: { label: string; img: string; active: boolean; onClick: () => void }) => (
  <div onClick={onClick} className="flex flex-col items-center gap-3 cursor-pointer group relative">
    <div className={`
      w-28 h-28 border-2 rounded-[24px] flex items-center justify-center p-5 transition-all duration-300
      ${active
        ? 'border-[var(--pajak-primary)] bg-blue-50 shadow-md ring-4 ring-blue-50/50'
        : 'border-[var(--pajak-border)] bg-white opacity-40 grayscale hover:opacity-70'}
    `}>
      <img src={img} alt={label} className="object-contain w-full h-full" />
    </div>
    <span className={`text-[11px] font-extrabold text-center transition-colors ${active ? 'text-[var(--pajak-primary)]' : 'text-gray-400'}`}>
      {label}
    </span>
  </div>
);

const YearSlider = ({ label, val, setVal }: { label: string; val: [number, number]; setVal: (v: [number, number]) => void }) => (
  <div className="space-y-6">
    <h4 className="font-bold text-gray-800 text-sm">{label}</h4>
    <div className="relative h-10 px-2">
      <div className="flex justify-between text-[11px] font-black text-gray-300 absolute -top-4 w-full px-1">
        <span>2006</span>
        <span>2024</span>
      </div>
      <div className="absolute top-1/2 left-0 w-full h-[6px] bg-gray-100 rounded-full -translate-y-1/2">
        <div
          className="absolute h-full bg-black rounded-full transition-all duration-150"
          style={{ left: `${((val[0] - 2006) / (2024 - 2006)) * 100}%`, right: `${100 - ((val[1] - 2006) / (2024 - 2006)) * 100}%` }}
        ></div>
      </div>
      <input
        type="range" min="2006" max="2024" value={val[0]}
        onChange={(e) => setVal([Math.min(Number(e.target.value), val[1] - 1), val[1]])}
        className="absolute top-1/2 left-0 w-full -translate-y-1/2 appearance-none bg-transparent pointer-events-none custom-range-thumb"
      />
      <input
        type="range" min="2006" max="2024" value={val[1]}
        onChange={(e) => setVal([val[0], Math.max(Number(e.target.value), val[0] + 1)])}
        className="absolute top-1/2 left-0 w-full -translate-y-1/2 appearance-none bg-transparent pointer-events-none custom-range-thumb"
      />
    </div>
    <div className="flex justify-between font-black text-sm text-gray-800">
      <span className="bg-gray-50 px-3 py-1 rounded-md border border-gray-100 shadow-sm">{val[0]}</span>
      <span className="bg-gray-50 px-3 py-1 rounded-md border border-gray-100 shadow-sm">{val[1]}</span>
    </div>
  </div>
);

export default FilterModal;